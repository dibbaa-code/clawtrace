import { memo, useCallback, useMemo, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Copy, Check, Loader2, Terminal, XCircle } from 'lucide-react'
import type { MonitorExecProcess, MonitorExecOutputChunk } from '~/integrations/openclaw'

interface ExecNodeProps {
  data: MonitorExecProcess
  selected?: boolean
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const secs = ms / 1000
  if (secs < 60) return `${secs.toFixed(1)}s`
  const mins = Math.floor(secs / 60)
  const remainSecs = Math.floor(secs % 60)
  return `${mins}m ${remainSecs}s`
}

function tailLinesFromChunks(chunks: MonitorExecOutputChunk[], maxLines: number): string {
  if (chunks.length === 0) return ''
  const merged = chunks.map((c) => c.text).join('')
  const lines = merged.split(/\r?\n/)
  return lines.slice(-maxLines).join('\n').trim()
}

const statusConfig: Record<
  MonitorExecProcess['status'],
  {
    icon: typeof Loader2
    borderColor: string
    badgeColor: string
    iconColor: string
    animate: boolean
    label: string
  }
> = {
  running: {
    icon: Loader2,
    borderColor: 'border-neon-cyan',
    badgeColor: 'bg-neon-cyan/15 text-neon-cyan',
    iconColor: 'text-neon-cyan',
    animate: true,
    label: 'Running',
  },
  completed: {
    icon: CheckCircle,
    borderColor: 'border-neon-mint',
    badgeColor: 'bg-neon-mint/15 text-neon-mint',
    iconColor: 'text-neon-mint',
    animate: false,
    label: 'Completed',
  },
  failed: {
    icon: XCircle,
    borderColor: 'border-crab-500',
    badgeColor: 'bg-crab-500/15 text-crab-300',
    iconColor: 'text-crab-400',
    animate: false,
    label: 'Failed',
  },
}

function streamStyle(stream: MonitorExecOutputChunk['stream']): string {
  if (stream === 'stderr') {
    return 'text-red-200/90 bg-red-950/20 border-red-900/40'
  }
  return 'text-neon-cyan/90 bg-shell-950/50 border-shell-800/60'
}

export const ExecNode = memo(function ExecNode({ data, selected }: ExecNodeProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const status = statusConfig[data.status]
  const StatusIcon = status.icon

  const preview = useMemo(() => tailLinesFromChunks(data.outputs, 3), [data.outputs])
  const hasOutput = data.outputs.length > 0
  const isMalicious = data.threat?.malicious

  const handleCopyPid = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(String(data.pid)).catch(() => { })
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [data.pid])

  const displayDuration =
    data.durationMs != null
      ? formatDuration(data.durationMs)
      : data.completedAt != null
        ? formatDuration(Math.max(0, data.completedAt - data.startedAt))
        : null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => setExpanded((prev) => !prev)}
      className={`
        px-3.5 py-2.5 rounded-xl border min-w-[220px] cursor-pointer
        ${isMalicious
          ? 'bg-red-950/60 border-red-800/80'
          : 'bg-shell-900/95 border-shell-700/60 backdrop-blur-sm'
        }
        ${selected ? 'ring-2 ring-white/20' : ''}
        ${expanded ? 'max-w-[680px]' : 'max-w-[360px]'}
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
      <Handle
        type="target"
        position={Position.Top}
        className="bg-shell-600! w-2! h-2! border-shell-800!"
      />

      {/* Header: compact */}
      <div className="flex items-center gap-2 mb-2">
        <Terminal size={11} className={isMalicious ? 'text-red-400/80' : 'text-shell-400'} />
        <span className={`font-display text-[11px] font-medium uppercase tracking-wider ${isMalicious ? 'text-red-200/90' : 'text-gray-400'}`}>
          Exec
        </span>
        <span
          className={`
            ml-1 px-2 py-0.5 rounded-md text-[11px] font-console truncate max-w-[220px]
            ${isMalicious ? 'bg-red-900/40 text-red-200/90 border border-red-800/80' : `border border-shell-700/60 ${status.badgeColor}`}
          `}
          title={data.command}
        >
          {data.command}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={handleCopyPid}
            className="p-1 rounded hover:bg-shell-700 transition-colors"
            title={`Copy PID: ${data.pid}`}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Check size={12} className="text-neon-mint" />
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Copy size={12} className="text-shell-400 hover:text-shell-200" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
          <StatusIcon
            size={12}
            className={`${isMalicious ? 'text-red-400' : status.iconColor} ${status.animate ? 'animate-spin' : ''}`}
          />
        </div>
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

      {/* Meta: single line */}
      <div className="font-console text-[10px] text-shell-500 mb-2 flex items-center gap-2 flex-wrap">
        <span>{formatTime(data.lastActivityAt)}</span>
        {data.traceId && (
          <span className="text-shell-600" title={`Trace: ${data.traceId}`}>#{data.traceId}</span>
        )}
        <span className="text-shell-600">pid:{data.pid}</span>
        {data.exitCode != null && (
          <span className={data.exitCode === 0 ? 'text-neon-mint/80' : 'text-red-400/80'}>
            exit:{data.exitCode}
          </span>
        )}
        {displayDuration && <span className="text-neon-cyan/80">{displayDuration}</span>}
        {data.status === 'running' && <span className="text-neon-peach/80">live</span>}
      </div>

      {data.outputTruncated && (
        <div className="mb-2 text-[10px] font-console text-neon-peach/80">
          truncated
        </div>
      )}

      {hasOutput && !expanded && (
        <pre className="font-console text-[11px] text-shell-300/90 bg-shell-950/50 border border-shell-800/50 rounded-lg p-2 overflow-hidden line-clamp-4 whitespace-pre-wrap">
          {preview || '(no output)'}
        </pre>
      )}

      {hasOutput && expanded && (
        <div className="mt-1.5 border border-shell-800/50 rounded-lg bg-shell-950/40 max-h-[320px] overflow-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between px-2 py-1 text-[10px] font-console text-shell-500 bg-shell-950/90 border-b border-shell-800/50">
            <span>{status.label}</span>
            <span>{data.outputs.length} chunks</span>
          </div>
          <div className="p-2 flex flex-col gap-1.5">
            {data.outputs.map((chunk) => (
              <div
                key={chunk.id}
                className={`border rounded-lg px-2 py-1 ${streamStyle(chunk.stream)}`}
              >
                <div className="flex items-center gap-2 mb-0.5 text-[10px] font-console text-shell-500">
                  <span className={chunk.stream === 'stderr' ? 'text-red-400/80' : 'text-neon-cyan/80'}>
                    {chunk.stream}
                  </span>
                  <span>{formatTime(chunk.timestamp)}</span>
                </div>
                <pre className="font-console text-[11px] whitespace-pre-wrap">
                  {chunk.text}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="bg-shell-600! w-2! h-2! border-shell-800!"
      />
    </motion.div>
  )
})

