import { memo, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { motion } from 'framer-motion'
import Markdown from 'react-markdown'
import {
  Loader2,
  CheckCircle,
  XCircle,
  Wrench,
  MessageSquare,
  MessageCircle,
  Bot,
} from 'lucide-react'
import type { MonitorAction } from '~/integrations/openclaw'

interface ActionNodeProps {
  data: MonitorAction
  selected?: boolean
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const stateConfig: Record<
  MonitorAction['type'],
  {
    icon: typeof Loader2
    borderColor: string
    bgColor: string
    iconColor: string
    animate: boolean
    label?: string
  }
> = {
  start: {
    icon: Loader2,
    borderColor: 'border-neon-cyan',
    bgColor: 'bg-neon-cyan/10',
    iconColor: 'text-neon-cyan',
    animate: true,
  },
  streaming: {
    icon: Loader2,
    borderColor: 'border-neon-cyan',
    bgColor: 'bg-neon-cyan/10',
    iconColor: 'text-neon-cyan',
    animate: true,
  },
  complete: {
    icon: CheckCircle,
    borderColor: 'border-neon-mint',
    bgColor: 'bg-neon-mint/10',
    iconColor: 'text-neon-mint',
    animate: false,
  },
  aborted: {
    icon: XCircle,
    borderColor: 'border-neon-peach',
    bgColor: 'bg-neon-peach/10',
    iconColor: 'text-neon-peach',
    animate: false,
    label: 'Aborted',
  },
  error: {
    icon: XCircle,
    borderColor: 'border-crab-500',
    bgColor: 'bg-crab-500/10',
    iconColor: 'text-crab-400',
    animate: false,
  },
  tool_call: {
    icon: Wrench,
    borderColor: 'border-neon-lavender',
    bgColor: 'bg-neon-lavender/10',
    iconColor: 'text-neon-lavender',
    animate: false,
  },
  tool_result: {
    icon: MessageSquare,
    borderColor: 'border-pastel-sky',
    bgColor: 'bg-pastel-sky/10',
    iconColor: 'text-pastel-sky',
    animate: false,
  },
}

const eventTypeLabels: Record<MonitorAction['eventType'], { label: string; icon: typeof MessageCircle }> = {
  chat: { label: 'Chat', icon: MessageCircle },
  agent: { label: 'Agent', icon: Bot },
  system: { label: 'System', icon: MessageSquare },
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const secs = ms / 1000
  if (secs < 60) return `${secs.toFixed(1)}s`
  const mins = Math.floor(secs / 60)
  const remainSecs = Math.floor(secs % 60)
  return `${mins}m ${remainSecs}s`
}

export const ActionNode = memo(function ActionNode({
  data,
  selected,
}: ActionNodeProps) {
  const [expanded, setExpanded] = useState(false)
  const state = stateConfig[data.type]
  const eventInfo = eventTypeLabels[data.eventType || 'chat']
  const StateIcon = state.icon
  const EventIcon = eventInfo.icon

  // Safely get content as string
  const contentStr = typeof data.content === 'string'
    ? data.content
    : data.content != null
      ? JSON.stringify(data.content)
      : null

  // Use state label for start/aborted, otherwise content
  const displayContent = state.label || contentStr

  const truncatedContent = displayContent
    ? displayContent.length > 100
      ? displayContent.slice(0, 100) + '...'
      : displayContent
    : null

  const fullContent = displayContent

  // Metadata for complete nodes
  const hasMetadata = data.type === 'complete' && (data.duration || data.inputTokens || data.outputTokens)

  const isMalicious = data.threat?.malicious

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => setExpanded(!expanded)}
      className={`
        px-3.5 py-2.5 rounded-xl border min-w-[180px] cursor-pointer
        ${isMalicious
          ? 'bg-red-950/60 border-red-800/80'
          : 'bg-shell-900/95 border-shell-700/60 backdrop-blur-sm'
        }
        ${selected ? 'ring-2 ring-white/20' : ''}
        ${expanded ? 'max-w-[600px]' : 'max-w-[300px]'}
        transition-all duration-150 hover:bg-shell-800/95
      `}
      style={{
        boxShadow: isMalicious
          ? '0 2px 16px rgba(185, 28, 28, 0.25), 0 0 0 1px rgba(220, 38, 38, 0.15)'
          : selected
            ? '0 0 0 1px rgba(255,255,255,0.1)'
            : '0 2px 8px rgba(0, 0, 0, 0.2)',
      }}
    >
      <Handle type="target" position={Position.Top} className="bg-shell-600! w-2! h-2! border-shell-800!" />

      {/* Header: compact single line */}
      <div className="flex items-center gap-2 mb-2">
        <EventIcon size={11} className={isMalicious ? 'text-red-400/80' : 'text-shell-500'} />
        <span className={`font-display text-[11px] font-medium uppercase tracking-wider ${isMalicious ? 'text-red-200/90' : 'text-gray-400'}`}>
          {eventInfo.label}
        </span>
        <StateIcon
          size={11}
          className={`${isMalicious ? 'text-red-400' : state.iconColor} ${state.animate ? 'animate-spin' : ''} ml-auto`}
        />
      </div>

      {/* Threat: minimal pill */}
      {isMalicious && (
        <div className="mb-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          <span className="font-console text-[11px] text-red-200/90">
            {data.threat?.severity ?? 'alert'}
          </span>
          {data.threat?.reason && (
            <span className="font-console text-[10px] text-red-300/60 truncate max-w-[200px]" title={data.threat.reason}>
              · {data.threat.reason}
            </span>
          )}
        </div>
      )}

      {/* Meta: timestamp + trace + stats in one subtle line */}
      <div className="font-console text-[10px] text-shell-500 mb-2 flex items-center gap-2 flex-wrap">
        <span>{formatTime(data.timestamp)}</span>
        {data.traceId && (
          <span className="text-shell-600" title={`Trace: ${data.traceId}`}>#{data.traceId}</span>
        )}
        {hasMetadata && (
          <>
            {data.duration && <span className="text-neon-cyan/80">{formatDuration(data.duration)}</span>}
            {data.inputTokens != null && <span className="text-shell-600">in:{data.inputTokens}</span>}
            {data.outputTokens != null && <span className="text-shell-600">out:{data.outputTokens}</span>}
            {data.stopReason && <span className="text-neon-peach/80">{data.stopReason}</span>}
          </>
        )}
      </div>

      {data.toolName && (
        <div className="font-console text-[10px] text-neon-lavender/90 mb-2">
          {data.toolName}
        </div>
      )}

      {/* Content */}
      {(expanded ? fullContent : truncatedContent) && (
        <div className={`
          prose prose-invert prose-xs max-w-none text-gray-300/95 text-[12px] leading-relaxed
          prose-headings:text-gray-200 prose-headings:font-display prose-headings:text-xs prose-headings:my-0.5
          prose-p:text-[12px] prose-p:leading-relaxed prose-p:my-0.5
          prose-code:text-neon-cyan/90 prose-code:bg-shell-950/80 prose-code:px-1 prose-code:rounded prose-code:text-[11px]
          prose-pre:bg-shell-950/80 prose-pre:border prose-pre:border-shell-800/60 prose-pre:text-[11px] prose-pre:my-1
          prose-a:text-neon-lavender prose-a:no-underline hover:prose-a:underline
          prose-li:text-[12px] prose-li:my-0
          prose-strong:text-gray-200
          ${expanded ? 'overflow-auto max-h-[400px]' : 'line-clamp-3'}
        `}>
          <Markdown>{expanded ? fullContent! : truncatedContent!}</Markdown>
        </div>
      )}

      {expanded && data.toolArgs != null && (
        <pre className="mt-2 font-console text-[10px] text-shell-500 bg-shell-950/50 p-2 rounded-lg border border-shell-800/50 overflow-auto max-h-32">
          {JSON.stringify(data.toolArgs, null, 2) as string}
        </pre>
      )}

      <Handle type="source" position={Position.Bottom} className="bg-shell-600! w-2! h-2! border-shell-800!" />
    </motion.div>
  )
})
