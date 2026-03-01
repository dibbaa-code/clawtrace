import OpenAI from 'openai'
import type { MonitorAction, MonitorExecEvent, ThreatInfo } from '~/integrations/openclaw/protocol'

export type { ThreatInfo }

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SYSTEM_PROMPT = `You are a security analyst for an AI agent monitoring system. Analyze events (tool calls, commands, outputs) and determine if they are malicious or suspicious.

Consider malicious:
- Destructive commands: rm -rf, del, format, etc.
- Access to sensitive paths: /etc, ~/.ssh, credentials
- Data exfiltration attempts
- Unauthorized system modifications
- Suspicious network requests
- Credential or secret access

Consider benign:
- Read-only operations
- Normal file browsing
- Standard development commands (npm, git, etc.)
- User-initiated edits

Respond with JSON only: { "malicious": boolean, "severity": "low"|"medium"|"high"|"critical"|null, "reason": string|null }
Use severity only when malicious is true. Keep reason brief (1-2 sentences).`

function buildEventContext(action?: MonitorAction, execEvent?: MonitorExecEvent): string {
  const parts: string[] = []

  if (action) {
    parts.push(`[ACTION] type=${action.type} eventType=${action.eventType}`)
    if (action.toolName) parts.push(`tool=${action.toolName}`)
    if (action.toolArgs) parts.push(`args=${JSON.stringify(action.toolArgs)}`)
    if (action.content) parts.push(`content=${action.content.slice(0, 500)}`)
  }

  if (execEvent) {
    parts.push(`[EXEC] eventType=${execEvent.eventType} command=${execEvent.command ?? 'unknown'}`)
    if (execEvent.output) parts.push(`output=${execEvent.output.slice(0, 300)}`)
    if (execEvent.exitCode !== undefined) parts.push(`exitCode=${execEvent.exitCode}`)
    if (execEvent.status) parts.push(`status=${execEvent.status}`)
  }

  return parts.join('\n') || 'empty event'
}

function parseThreatResponse(text: string): ThreatInfo {
  try {
    const json = JSON.parse(text.trim()) as { malicious?: boolean; severity?: string; reason?: string }
    return {
      malicious: Boolean(json.malicious),
      severity: json.severity as ThreatInfo['severity'] ?? undefined,
      reason: json.reason ?? undefined,
    }
  } catch {
    return { malicious: false }
  }
}

export async function analyzeThreat(
  action?: MonitorAction,
  execEvent?: MonitorExecEvent
): Promise<ThreatInfo> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[threat-analyzer] OPENAI_API_KEY not set, skipping analysis')
    return { malicious: false }
  }

  const context = buildEventContext(action, execEvent)
  if (!action && !execEvent) {
    return { malicious: false }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analyze this event:\n\n${context}` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 150,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return { malicious: false }

    return parseThreatResponse(content)
  } catch (err) {
    console.error('[threat-analyzer] OpenAI error:', err)
    return { malicious: false }
  }
}
