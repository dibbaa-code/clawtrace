import WebSocket from 'ws'
import {
  type GatewayFrame,
  type RequestFrame,
  type ResponseFrame,
  type EventFrame,
  type HelloOk,
  type ChatEvent,
  type AgentEvent,
  type SessionInfo,
  type SessionsListParams,
  type ConnectChallengePayload,
  createConnectParams,
} from './protocol'
import { buildSignedDevice } from './device'

const DEFAULT_GATEWAY_URL = process.env.CLAWDBOT_URL || 'ws://127.0.0.1:18789'

type EventCallback = (event: EventFrame) => void
export type GatewayAuthState =
  | 'unknown'
  | 'authorized'
  | 'unpaired'
  | 'unauthorized'
  | 'degraded'

interface PairingInfo {
  requestId?: string
  message?: string
}

export class ClawdbotClient {
  private ws: WebSocket | null = null
  private requestId = 0
  private pendingRequests = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >()
  private eventListeners: EventCallback[] = []
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private _connected = false
  private _connecting = false
  private _authState: GatewayAuthState = 'unknown'
  private _scopes: string[] = []
  private _pairingInfo: PairingInfo | null = null
  private _connectPromiseSettled = false
  private readonly debugEnabled = process.env.CLAWTRACE_DEBUG_OPENCLAW === '1'

  constructor(
    private url: string = DEFAULT_GATEWAY_URL,
    private token?: string
  ) {}

  get connected() {
    return this._connected
  }

  get authState() {
    return this._authState
  }

  get scopes() {
    return [...this._scopes]
  }

  get pairingInfo() {
    return this._pairingInfo
  }

  async connect(): Promise<HelloOk> {
    if (this._connecting || this._connected) {
      return { type: 'hello-ok', protocol: 3 } as HelloOk
    }
    this._connecting = true
    this._connectPromiseSettled = false
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this._connecting = false
        this.ws?.close()
        if (!this._connectPromiseSettled) {
          this._connectPromiseSettled = true
          reject(new Error('Connection timeout - is openclaw gateway running?'))
        }
      }, 10000)

      try {
        this.ws = new WebSocket(this.url)
      } catch (e) {
        clearTimeout(timeout)
        reject(new Error(`Failed to create WebSocket: ${e}`))
        return
      }

      this.ws.once('open', () => {
        this.debugLog('socket open, waiting for connect.challenge')
      })

      this.ws.on('message', (data) => {
        try {
          const raw = data.toString()
          const msg = JSON.parse(raw)

          // Handle challenge-response auth
          if (msg.type === 'event' && msg.event === 'connect.challenge') {
            this.handleChallenge(msg.payload as ConnectChallengePayload)
            return
          }

          this.handleMessage(msg, resolve, reject, timeout)
        } catch (e) {
          console.error('[openclaw] Failed to parse message:', e)
        }
      })

      this.ws.on('error', (err) => {
        clearTimeout(timeout)
        this._connecting = false
        this.debugLog('socket error before connect', err)
        if (!this._connectPromiseSettled) {
          this._connectPromiseSettled = true
          reject(err)
        }
      })

      this.ws.on('close', (code, reason) => {
        clearTimeout(timeout)
        const wasConnected = this._connected
        const wasConnecting = this._connecting
        this.debugLog('socket close', {
          code,
          reason: reason?.toString?.() ?? '',
          wasConnected,
          wasConnecting,
        })
        this._connected = false
        this._connecting = false
        if (!wasConnected && wasConnecting && !this._connectPromiseSettled) {
          this._connectPromiseSettled = true
          reject(
            new Error(
              `Gateway closed before connect (code ${code}${reason ? `, reason: ${reason.toString()}` : ''})`
            )
          )
        }
        // Only reconnect if we were previously connected and it wasn't a clean close
        if (wasConnected && code !== 1000) {
          this.scheduleReconnect()
        }
      })
    })
  }

  private handleChallenge(challenge: ConnectChallengePayload) {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      return
    }

    let params = createConnectParams(this.token)
    try {
      const device = buildSignedDevice({
        challenge,
        token: this.token ?? null,
        role: params.role,
        scopes: params.scopes,
        clientId: params.client.id,
        clientMode: params.client.mode,
      })
      params = createConnectParams(this.token, device)
    } catch (error) {
      console.error('[openclaw] Failed to create signed device identity:', error)
    }

    this.debugLog('sending connect', {
      hasToken: Boolean(params.auth?.token),
      hasDevice: Boolean(params.device),
      deviceId: params.device?.id,
      clientMode: params.client.mode,
      clientPlatform: params.client.platform,
      scopes: params.scopes,
    })

    const response: RequestFrame = {
      type: 'req',
      id: `connect-${Date.now()}`,
      method: 'connect',
      params,
    }

    this.ws.send(JSON.stringify(response))
  }

  private handleMessage(
    msg: GatewayFrame | HelloOk,
    connectResolve?: (v: HelloOk) => void,
    _connectReject?: (e: Error) => void,
    connectTimeout?: ReturnType<typeof setTimeout>
  ) {
    if ('type' in msg) {
      switch (msg.type) {
        case 'hello-ok':
          if (connectTimeout) clearTimeout(connectTimeout)
          this.updateAuthStateFromHello(msg)
          this._connected = true
          this._connecting = false
          this._connectPromiseSettled = true
          connectResolve?.(msg)
          break

        case 'res':
          // Check if this is the hello-ok response to our connect request
          if (msg.ok && (msg.payload as HelloOk)?.type === 'hello-ok') {
            if (connectTimeout) clearTimeout(connectTimeout)
            this.updateAuthStateFromHello(msg.payload as HelloOk)
            this._connected = true
            this._connecting = false
            this._connectPromiseSettled = true
            connectResolve?.(msg.payload as HelloOk)
          } else {
            this.handleResponse(msg)
          }
          break

        case 'event':
          this.handleEvent(msg)
          break

        case 'req':
          // Server shouldn't send requests to us
          break
      }
    }
  }

  private handleResponse(res: ResponseFrame) {
    const pending = this.pendingRequests.get(res.id)
    if (pending) {
      this.pendingRequests.delete(res.id)
      if (res.ok) {
        pending.resolve(res.payload)
      } else {
        const message = res.error?.message || 'Request failed'
        this.updateAuthStateFromError(message)
        pending.reject(new Error(message))
      }
    }
  }

  private handleEvent(event: EventFrame) {
    if (event.event.includes('pair') || event.event.includes('device')) {
      const payload = event.payload as { requestId?: string; message?: string } | undefined
      if (payload?.requestId || payload?.message) {
        this._authState = 'unpaired'
        this._pairingInfo = {
          requestId: payload.requestId,
          message: payload.message,
        }
      }
    }

    for (const listener of this.eventListeners) {
      try {
        listener(event)
      } catch (e) {
        console.error('Event listener error:', e)
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect().catch(console.error)
    }, 5000)
  }

  async request<T>(method: string, params?: unknown): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected')
    }

    const id = `req-${++this.requestId}`
    const req: RequestFrame = { type: 'req', id, method, params }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      })
      this.ws!.send(JSON.stringify(req))

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error('Request timeout'))
        }
      }, 30000)
    })
  }

  onEvent(callback: EventCallback): () => void {
    this.eventListeners.push(callback)
    return () => {
      const idx = this.eventListeners.indexOf(callback)
      if (idx >= 0) this.eventListeners.splice(idx, 1)
    }
  }

  async listSessions(params?: SessionsListParams): Promise<SessionInfo[]> {
    const result = await this.request<{ sessions: SessionInfo[] }>(
      'sessions.list',
      params
    )
    return result.sessions ?? []
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this._connected = false
    this._authState = 'unknown'
    this._scopes = []
    this._pairingInfo = null
  }

  private updateAuthStateFromHello(hello: HelloOk) {
    const scopes = hello.auth?.scopes
    this._scopes = scopes ? [...scopes] : []

    if (!scopes) {
      this._authState = 'authorized'
      return
    }

    if (scopes.includes('operator.read')) {
      this._authState = 'authorized'
      this._pairingInfo = null
      this.debugLog('authorized scopes', scopes)
      return
    }

    this._authState = scopes.length === 0 ? 'unpaired' : 'degraded'
    this.debugLog('non-authorized scopes', scopes)
  }

  private updateAuthStateFromError(message: string) {
    const lowered = message.toLowerCase()
    if (lowered.includes('missing scope') || lowered.includes('operator.read')) {
      this._authState = 'unpaired'
      const requestId = this.extractRequestId(message)
      this._pairingInfo = {
        requestId: requestId ?? this._pairingInfo?.requestId,
        message,
      }
      return
    }

    if (lowered.includes('unauthorized') || lowered.includes('forbidden')) {
      this._authState = 'unauthorized'
      this._pairingInfo = { message }
    }
  }

  private debugLog(message: string, payload?: unknown) {
    if (!this.debugEnabled) return
    if (payload !== undefined) {
      console.log(`[openclaw][debug] ${message}`, payload)
      return
    }
    console.log(`[openclaw][debug] ${message}`)
  }

  private extractRequestId(message: string): string | undefined {
    const explicitMatch = message.match(/request(?:\s+id)?[:=\s]+([a-zA-Z0-9_-]+)/i)
    if (explicitMatch?.[1]) {
      return explicitMatch[1]
    }

    const uuidMatch = message.match(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i
    )
    return uuidMatch?.[0]
  }
}

// Singleton instance for server use
let clientInstance: ClawdbotClient | null = null

export function getClawdbotEndpoint(): string {
  return DEFAULT_GATEWAY_URL
}

export function getClawdbotClient(): ClawdbotClient {
  if (!clientInstance) {
    const token = process.env.CLAWDBOT_API_TOKEN
    clientInstance = new ClawdbotClient(DEFAULT_GATEWAY_URL, token)
  }
  return clientInstance
}

// Parsed event helpers
export function isChatEvent(
  event: EventFrame
): event is EventFrame & { payload: ChatEvent } {
  return event.event === 'chat' && event.payload != null
}

export function isAgentEvent(
  event: EventFrame
): event is EventFrame & { payload: AgentEvent } {
  return event.event === 'agent' && event.payload != null
}
