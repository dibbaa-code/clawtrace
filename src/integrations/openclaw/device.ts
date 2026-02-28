import fs from 'fs'
import path from 'path'
import {
  createHash,
  createPrivateKey,
  generateKeyPairSync,
  sign,
} from 'crypto'
import type { ConnectChallengePayload, ConnectDevice } from './protocol'

const DATA_DIR = path.join(process.cwd(), 'data')
const DEVICE_IDENTITY_FILE = path.join(DATA_DIR, 'device-identity.json')

interface StoredDeviceIdentity {
  id: string
  publicKey: string
  privateKeyPem: string
  createdAt: number
  lastUsedAt: number
}

function base64UrlToBuffer(value: string): Buffer {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=')
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(base64, 'base64')
}

function base64UrlEncode(value: Buffer): string {
  return value.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '')
}

function decodePublicKey(value: string): Buffer {
  try {
    const raw = base64UrlToBuffer(value)
    if (raw.length > 0) return raw
  } catch {
    // fallback below
  }
  return Buffer.from(value, 'base64')
}

function fingerprintFromPublicKey(publicKey: string): string {
  const rawPublicKey = decodePublicKey(publicKey)
  return createHash('sha256').update(rawPublicKey).digest('hex')
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function loadStoredIdentity(): StoredDeviceIdentity | null {
  try {
    if (!fs.existsSync(DEVICE_IDENTITY_FILE)) {
      return null
    }
    const data = JSON.parse(fs.readFileSync(DEVICE_IDENTITY_FILE, 'utf-8')) as StoredDeviceIdentity
    if (!data.publicKey || !data.privateKeyPem) {
      return null
    }
    const canonicalId = fingerprintFromPublicKey(data.publicKey)
    const normalized: StoredDeviceIdentity = {
      ...data,
      id: canonicalId,
    }
    // Auto-migrate legacy id formats to canonical fingerprint.
    if (data.id !== canonicalId) {
      saveStoredIdentity(normalized)
    }
    return normalized
  } catch {
    return null
  }
}

function saveStoredIdentity(identity: StoredDeviceIdentity) {
  ensureDataDir()
  fs.writeFileSync(DEVICE_IDENTITY_FILE, JSON.stringify(identity, null, 2))
}

function generateStoredIdentity(): StoredDeviceIdentity {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const publicJwk = publicKey.export({ format: 'jwk' })
  if (!publicJwk.x) {
    throw new Error('Failed to export Ed25519 public key')
  }

  const rawPublicKey = base64UrlToBuffer(publicJwk.x)
  const fingerprint = createHash('sha256').update(rawPublicKey).digest('hex')
  const now = Date.now()

  return {
    id: fingerprint,
    publicKey: base64UrlEncode(rawPublicKey),
    privateKeyPem: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    createdAt: now,
    lastUsedAt: now,
  }
}

interface BuildSignedDeviceParams {
  challenge: ConnectChallengePayload
  token: string | null
  role: string
  scopes: string[]
  clientId: string
  clientMode: string
}

function buildDeviceAuthPayload(params: {
  deviceId: string
  clientId: string
  clientMode: string
  role: string
  scopes: string[]
  signedAtMs: number
  token: string | null
  nonce?: string
  version?: 'v1' | 'v2'
}): string {
  const version = params.version ?? (params.nonce ? 'v2' : 'v1')
  const scopes = params.scopes.join(',')
  const token = params.token ?? ''
  const parts = [
    version,
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    scopes,
    String(params.signedAtMs),
    token,
  ]
  if (version === 'v2') {
    parts.push(params.nonce ?? '')
  }
  return parts.join('|')
}

export function getOrCreateIdentity(): StoredDeviceIdentity {
  const existing = loadStoredIdentity()
  if (existing) {
    return existing
  }
  const generated = generateStoredIdentity()
  saveStoredIdentity(generated)
  return generated
}

export function buildSignedDevice(params: BuildSignedDeviceParams): ConnectDevice {
  const identity = getOrCreateIdentity()
  const privateKey = createPrivateKey(identity.privateKeyPem)
  const signedAt = Date.now()
  const payload = buildDeviceAuthPayload({
    deviceId: identity.id,
    clientId: params.clientId,
    clientMode: params.clientMode,
    role: params.role,
    scopes: params.scopes,
    signedAtMs: signedAt,
    token: params.token,
    nonce: params.challenge.nonce || undefined,
  })
  const signature = base64UrlEncode(sign(null, Buffer.from(payload, 'utf8'), privateKey))

  identity.lastUsedAt = signedAt
  saveStoredIdentity(identity)

  return {
    id: identity.id,
    publicKey: identity.publicKey,
    signature,
    signedAt,
    nonce: params.challenge.nonce,
  }
}
