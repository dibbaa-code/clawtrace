// Clawdbot Gateway Protocol v3 types

// Frame types
export interface RequestFrame {
  type: 'req'
  id: string
  method: string
  params?: unknown
}

export interface ResponseFrame {
  type: 'res'
  id: string
  ok: boolean
  payload?: unknown
  error?: { code: string; message: string }
}

export interface EventFrame {
  type: 'event'
  event: string
  payload?: unknown
  seq?: number
  stateVersion?: { presence: number; health: number }
}

export type GatewayFrame = RequestFrame | ResponseFrame | EventFrame

// Connection
export interface ClientInfo {
  id: string
  displayName: string
  version: string
  platform: string
  mode: 'ui' | 'cli' | 'bot' | 'operator' | 'node'
}

export interface ConnectParams {
  minProtocol: 3
  maxProtocol: 3
  client: ClientInfo
  auth?: { token?: string }
  device?: ConnectDevice
}

export interface ConnectChallengePayload {
  nonce: string
  ts: number
}

export interface ConnectDevice {
  id: string
  publicKey: string
  signature: string
  signedAt: number
  nonce: string
}

export interface HelloAuth {
  role?: string
  scopes?: string[]
}

export interface HelloOk {
  type: 'hello-ok'
  protocol: number
  snapshot: {
    presence: PresenceEntry[]
    health: unknown
    stateVersion: { presence: number; health: number }
  }
  features: { methods: string[]; events: string[] }
  auth?: HelloAuth
}

export interface PresenceEntry {
  key: string
  client: ClientInfo
  connectedAt: number
}

// Chat events
// Note: gateway sends cumulative message content with each delta, not incremental chars
export interface ChatEvent {
  runId: string
  sessionKey: string
  seq: number
  state: 'delta' | 'final' | 'aborted' | 'error'
  message?: unknown
  errorMessage?: string
  usage?: {
    inputTokens?: number
    outputTokens?: number
  }
  stopReason?: string
}

// Agent events
export interface AgentEvent {
  runId: string
  seq: number
  stream: string
  ts: number
  data: Record<string, unknown>
  sessionKey?: string
}

// Exec events
export interface ExecStartedEvent {
  pid: number
  command: string
  sessionId: string
  runId: string
  startedAt: number
}

export interface ExecOutputEvent {
  pid: number
  runId: string
  sessionId?: string
  stream: 'stdout' | 'stderr' | string
  output: string
}

export interface ExecCompletedEvent {
  pid: number
  runId: string
  sessionId?: string
  exitCode: number
  durationMs: number
  status: string
}

// Sessions
export interface SessionsListParams {
  limit?: number
  activeMinutes?: number
  includeLastMessage?: boolean
  agentId?: string
}

export interface SessionInfo {
  key: string
  agentId: string
  createdAt: number
  lastActivityAt: number
  messageCount: number
  lastMessage?: unknown
  /** Session key of the parent session that spawned this subagent session. */
  spawnedBy?: string
}

// App-level types
export interface MonitorSession {
  key: string
  agentId: string
  platform: string
  recipient: string
  isGroup: boolean
  lastActivityAt: number
  status: 'idle' | 'active' | 'thinking'
  /** Session key of the parent session that spawned this subagent session. */
  spawnedBy?: string
}

export interface MonitorAction {
  id: string
  runId: string
  sessionKey: string
  seq: number
  type: 'start' | 'streaming' | 'complete' | 'aborted' | 'error' | 'tool_call' | 'tool_result'
  eventType: 'chat' | 'agent' | 'system'
  timestamp: number
  content?: string
  toolName?: string
  toolArgs?: unknown
  // Metadata from lifecycle/chat events
  startedAt?: number
  endedAt?: number
  duration?: number
  inputTokens?: number
  outputTokens?: number
  stopReason?: string
}

export type MonitorExecEventType = 'started' | 'output' | 'completed'

export interface MonitorExecEvent {
  id: string
  execId: string
  runId: string
  pid: number
  sessionId?: string
  sessionKey?: string
  eventType: MonitorExecEventType
  command?: string
  stream?: 'stdout' | 'stderr' | string
  output?: string
  startedAt?: number
  durationMs?: number
  exitCode?: number
  status?: string
  timestamp: number
}

export type MonitorExecProcessStatus = 'running' | 'completed' | 'failed'

export interface MonitorExecOutputChunk {
  id: string
  stream: 'stdout' | 'stderr' | string
  text: string
  timestamp: number
}

export interface MonitorExecProcess {
  id: string
  runId: string
  pid: number
  command: string
  sessionId?: string
  sessionKey?: string
  status: MonitorExecProcessStatus
  startedAt: number
  completedAt?: number
  durationMs?: number
  exitCode?: number
  outputs: MonitorExecOutputChunk[]
  outputTruncated?: boolean
  timestamp: number
  lastActivityAt: number
}

// Utility functions
export function parseSessionKey(key: string): {
  agentId: string
  platform: string
  recipient: string
  isGroup: boolean
} {
  // Format: "agent:main:discord:channel:1234567890"
  // Or: "agent:main:telegram:group:12345"
  // Or: "agent:main:whatsapp:+1234567890"
  const parts = key.split(':')
  const agentId = parts[1] || 'unknown'
  const platform = parts[2] || 'unknown'
  // Check if 4th part indicates a type (channel, group, dm, etc)
  const hasType = ['channel', 'group', 'dm', 'thread'].includes(parts[3] || '')
  const isGroup = parts[3] === 'group' || parts[3] === 'channel'
  const recipient = hasType ? parts.slice(3).join(':') : parts.slice(3).join(':')

  return { agentId, platform, recipient, isGroup }
}

export function createConnectParams(
  token?: string,
  device?: ConnectDevice
): ConnectParams & {
  role: string
  scopes: string[]
  caps: unknown[]
  commands: unknown[]
  permissions: Record<string, unknown>
  locale: string
  userAgent: string
} {
  const platformMap: Record<string, string> = {
    win32: 'windows',
    darwin: 'macos',
    linux: 'linux',
  }
  const platform = platformMap[process.platform] ?? process.platform

  return {
    minProtocol: 3,
    maxProtocol: 3,
    client: {
      id: 'cli',
      version: '0.1.0',
      platform,
      mode: 'cli',
    },
    role: 'operator',
    scopes: ['operator.read'],
    caps: [],
    commands: [],
    permissions: {},
    locale: 'en-US',
    userAgent: 'clawtrace-monitor/0.1.0',
    auth: token ? { token } : undefined,
    device,
  }
}
