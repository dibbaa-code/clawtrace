import type { ThreatInfo } from '~/integrations/openclaw/protocol'

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL
const BASE_URL = process.env.CLAWTRACE_BASE_URL || 'http://localhost:3000'

export interface AlertPayload {
  traceId: string
  threat: ThreatInfo
  summary: string
  eventType: 'action' | 'exec'
}

export async function sendDiscordAlert(payload: AlertPayload): Promise<boolean> {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn('[alert-service] DISCORD_WEBHOOK_URL not set, skipping Discord alert')
    return false
  }

  const link = `${BASE_URL}/monitor?trace=${payload.traceId}`

  const embed = {
    title: '⚠️ Malicious event detected',
    color: 0xff0000,
    fields: [
      { name: 'Severity', value: payload.threat.severity ?? 'unknown', inline: true },
      { name: 'Trace ID', value: `\`${payload.traceId}\``, inline: true },
      { name: 'Reason', value: payload.threat.reason ?? 'No details', inline: false },
      { name: 'Summary', value: payload.summary, inline: false },
      { name: 'View in dashboard', value: `[Open Clawtrace](${link})`, inline: false },
    ],
    timestamp: new Date().toISOString(),
  }

  try {
    const res = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [embed],
      }),
    })

    if (!res.ok) {
      console.error('[alert-service] Discord webhook failed:', res.status, await res.text())
      return false
    }

    console.log('[alert-service] Discord alert sent for trace', payload.traceId)
    return true
  } catch (err) {
    console.error('[alert-service] Discord alert error:', err)
    return false
  }
}
