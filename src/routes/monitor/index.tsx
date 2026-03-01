import { useState, useEffect, useCallback, useMemo } from 'react'
import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useLiveQuery } from '@tanstack/react-db'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react'
import { trpc } from '~/integrations/trpc/client'
import { NavTabs } from '~/components/navigation'
import {
  sessionsCollection,
  actionsCollection,
  execsCollection,
  upsertSession,
  addAction,
  addExecEvent,
  updateSessionStatus,
  clearCollections,
  hydrateFromServer,
  clearCompletedExecs,
} from '~/integrations/openclaw'
import {
  ActionGraph,
  SessionList,
  SettingsPanel,
  StatusIndicator,
  MobileSessionDrawer,
  MobileMonitorToolbar,
} from '~/components/monitor'
import { CrabIdleAnimation } from '~/components/ani'
import { PixelWaves } from '~/components/effects/PixelWaves'
import { useIsMobile } from '~/hooks/useIsMobile'

export const Route = createFileRoute('/monitor/')({
  component: MonitorPageWrapper,
})

// Wrapper to ensure client-only rendering (useLiveQuery needs client)
function MonitorPageWrapper() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-shell-950 text-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="crab-icon-glow">
            <CrabIdleAnimation className="w-16 h-16" />
          </div>
          <div className="flex items-center gap-3">
            <Loader2 size={18} className="animate-spin text-crab-400" />
            <span className="font-display text-sm text-gray-400 tracking-wide uppercase">
              Loading Trace...
            </span>
          </div>
        </motion.div>
      </div>
    )
  }

  return <MonitorPage />
}

const RETRY_DELAY = 3000
const MAX_RETRIES = 10
const DEFAULT_GATEWAY_ENDPOINT = 'ws://127.0.0.1:18789'
type AuthState = 'unknown' | 'authorized' | 'unpaired' | 'unauthorized' | 'degraded'

interface PairingState {
  requestId?: string
  message?: string
}

function MonitorPage() {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [authState, setAuthState] = useState<AuthState>('unknown')
  const [scopes, setScopes] = useState<string[]>([])
  const [pairing, setPairing] = useState<PairingState | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [historicalMode, setHistoricalMode] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const [logCollection, setLogCollection] = useState(false)
  const [logCount, setLogCount] = useState(0)
  const [gatewayEndpoint, setGatewayEndpoint] = useState(DEFAULT_GATEWAY_ENDPOINT)
  const [selectedSession, setSelectedSession] = useState<string | null>(null)

  // Persistence service state
  const [persistenceEnabled, setPersistenceEnabled] = useState(false)
  const [persistenceStartedAt, setPersistenceStartedAt] = useState<number | null>(null)
  const [persistenceSessionCount, setPersistenceSessionCount] = useState(0)
  const [persistenceActionCount, setPersistenceActionCount] = useState(0)

  // Sidebar collapse state - default to collapsed
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  // Settings panel state
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Mobile state
  const isMobile = useIsMobile()
  const [sessionDrawerOpen, setSessionDrawerOpen] = useState(false)

  // Deep link: ?trace=xxx to focus on event
  const search = useSearch({ strict: false }) as { trace?: string }
  const traceId = search?.trace ?? undefined

  // Live queries from TanStack DB collections
  const sessionsQuery = useLiveQuery(sessionsCollection)
  const actionsQuery = useLiveQuery(actionsCollection)
  const execsQuery = useLiveQuery(execsCollection)

  const sessions = sessionsQuery.data ?? []
  const actions = actionsQuery.data ?? []
  const execs = execsQuery.data ?? []

  // Count clearable items (completed/failed execs)
  const completedCount = useMemo(() => {
    return execs.filter(e => e.status === 'completed' || e.status === 'failed').length
  }, [execs])

  // Handler for clearing completed execs
  const handleClearCompleted = useCallback(() => {
    const count = clearCompletedExecs()
    console.log(`[monitor] cleared ${count} completed execs`)
  }, [])


  // Check connection status and persistence on mount
  useEffect(() => {
    checkStatus()
    checkAuthStatus()
    checkPersistenceStatus()
    loadGatewayEndpoint()
  }, [])

  const loadGatewayEndpoint = async () => {
    try {
      const data = await trpc.openclaw.gatewayEndpoint.query()
      setGatewayEndpoint(data.url)
    } catch {
      // keep default
    }
  }

  const checkPersistenceStatus = async () => {
    try {
      const status = await trpc.openclaw.persistenceStatus.query()
      setPersistenceEnabled(status.enabled)
      setPersistenceStartedAt(status.startedAt)
      setPersistenceSessionCount(status.sessionCount)
      setPersistenceActionCount(status.actionCount)
    } catch {
      // ignore
    }
  }

  const checkStatus = async () => {
    try {
      const status = await trpc.openclaw.status.query()
      setConnected(status.connected)
    } catch {
      setConnected(false)
    }
  }

  const checkAuthStatus = useCallback(async () => {
    try {
      const status = await trpc.openclaw.authStatus.query()
      setConnected(status.connected)
      setAuthState(status.authState as AuthState)
      setScopes(status.scopes ?? [])
      setPairing(status.pairing ?? null)
    } catch {
      // ignore
    }
  }, [])

  const canPollSessions = useMemo(() => {
    if (!connected) return false
    if (authState === 'unpaired' || authState === 'unauthorized' || authState === 'degraded') {
      return false
    }
    return true
  }, [connected, authState])

  const handleConnect = async (retry = 0) => {
    setConnecting(true)
    setRetryCount(retry)
    try {
      const result = await trpc.openclaw.connect.mutate()
      setAuthState((result.authState as AuthState) ?? 'unknown')
      setScopes(result.scopes ?? [])
      setPairing(result.pairing ?? null)
      if (result.status === 'connected' || result.status === 'already_connected') {
        setConnected(true)
        setRetryCount(0)
        setConnecting(false)
        if (result.authState === 'authorized' || result.authState === 'unknown') {
          // Hydrate from persistence if enabled
          await hydrateFromPersistence()
          await loadSessions()
        }
        return
      }
    } catch {
      // Will retry below
    }
    // Retry if under max
    if (retry < MAX_RETRIES) {
      setTimeout(() => handleConnect(retry + 1), RETRY_DELAY)
    } else {
      setConnecting(false)
    }
  }

  const hydrateFromPersistence = async () => {
    try {
      const status = await trpc.openclaw.persistenceStatus.query()
      if (status.sessionCount > 0 || status.actionCount > 0 || status.execEventCount > 0) {
        const data = await trpc.openclaw.persistenceHydrate.query()
        hydrateFromServer(data.sessions, data.actions, data.execEvents ?? [])
        console.log(
          `[monitor] hydrated ${data.sessions.length} sessions, ${data.actions.length} actions, ${(data.execEvents ?? []).length} exec events`
        )
      }
      setPersistenceEnabled(status.enabled)
      setPersistenceStartedAt(status.startedAt)
      setPersistenceSessionCount(status.sessionCount)
      setPersistenceActionCount(status.actionCount)
    } catch (e) {
      console.error('Failed to hydrate:', e)
    }
  }

  const handleDisconnect = async () => {
    try {
      await trpc.openclaw.disconnect.mutate()
      setConnected(false)
      setAuthState('unknown')
      setScopes([])
      setPairing(null)
      clearCollections()
    } catch (e) {
      console.error('Disconnect error:', e)
    }
  }

  const loadSessions = useCallback(async () => {
    try {
      const result = await trpc.openclaw.sessions.query(
        historicalMode ? { activeMinutes: 1440 } : { activeMinutes: 60 }
      )
      setAuthState((prev) => (result.authState as AuthState) ?? prev)
      setScopes((prev) => result.scopes ?? prev)
      setPairing((prev) => result.pairing ?? prev)

      if (result.sessions) {
        for (const session of result.sessions) {
          upsertSession(session)
        }
      }
    } catch (e) {
      console.error('Failed to load sessions:', e)
    }
  }, [historicalMode])

  const handleRefresh = useCallback(async () => {
    await checkAuthStatus()
    if (canPollSessions) {
      await loadSessions()
    }
  }, [checkAuthStatus, canPollSessions, loadSessions])

  const handleHistoricalModeChange = (enabled: boolean) => {
    setHistoricalMode(enabled)
    if (canPollSessions) {
      loadSessions()
    }
  }

  const handleDebugModeChange = async (enabled: boolean) => {
    setDebugMode(enabled)
    try {
      await trpc.openclaw.setDebugMode.mutate({ enabled })
    } catch (e) {
      console.error('Failed to set debug mode:', e)
    }
  }

  const handleLogCollectionChange = async (enabled: boolean) => {
    setLogCollection(enabled)
    try {
      const result = await trpc.openclaw.setLogCollection.mutate({ enabled })
      setLogCount(result.eventCount)
    } catch (e) {
      console.error('Failed to set log collection:', e)
    }
  }

  const handleDownloadLogs = async () => {
    try {
      const result = await trpc.openclaw.downloadLogs.query()
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `openclaw-events-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Failed to download logs:', e)
    }
  }

  const handleClearLogs = async () => {
    try {
      await trpc.openclaw.clearLogs.mutate()
      setLogCount(0)
    } catch (e) {
      console.error('Failed to clear logs:', e)
    }
  }

  const handlePersistenceStart = async () => {
    try {
      const result = await trpc.openclaw.persistenceStart.mutate()
      setPersistenceEnabled(result.enabled)
      setPersistenceStartedAt(result.startedAt)
    } catch (e) {
      console.error('Failed to start persistence:', e)
    }
  }

  const handlePersistenceStop = async () => {
    try {
      const result = await trpc.openclaw.persistenceStop.mutate()
      setPersistenceEnabled(result.enabled)
      setPersistenceStartedAt(null)
    } catch (e) {
      console.error('Failed to stop persistence:', e)
    }
  }

  const handlePersistenceClear = async () => {
    try {
      await trpc.openclaw.persistenceClear.mutate()
      setPersistenceSessionCount(0)
      setPersistenceActionCount(0)
      clearCollections()
    } catch (e) {
      console.error('Failed to clear persistence:', e)
    }
  }

  const handleTestDiscordAlert = async (): Promise<boolean> => {
    try {
      const result = await trpc.openclaw.testDiscordAlert.mutate()
      return result.sent
    } catch (e) {
      console.error('Test Discord alert failed:', e)
      return false
    }
  }

  // Poll log count while collecting
  useEffect(() => {
    if (!logCollection) return
    const interval = setInterval(async () => {
      try {
        const result = await trpc.openclaw.getLogCollection.query()
        setLogCount(result.eventCount)
      } catch {
        // ignore
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [logCollection])

  // Poll persistence status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const status = await trpc.openclaw.persistenceStatus.query()
        setPersistenceEnabled(status.enabled)
        setPersistenceStartedAt(status.startedAt)
        setPersistenceSessionCount(status.sessionCount)
        setPersistenceActionCount(status.actionCount)
      } catch {
        // ignore
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Poll lightweight auth status while connected
  useEffect(() => {
    if (!connected) return
    const interval = setInterval(() => {
      checkAuthStatus()
    }, 10000)
    return () => clearInterval(interval)
  }, [connected, checkAuthStatus])

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev)
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    if (!connected && !connecting) {
      handleConnect()
    }
  }, [])

  // Poll for sessions while connected
  useEffect(() => {
    if (!canPollSessions) return
    const interval = setInterval(() => {
      loadSessions()
    }, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [canPollSessions, loadSessions])

  // Subscribe to real-time events
  useEffect(() => {
    if (!canPollSessions) return

    const subscription = trpc.openclaw.events.subscribe(undefined, {
      onData: (data) => {
        if (data.type === 'session' && data.session?.key && data.session.status) {
          updateSessionStatus(data.session.key, data.session.status)
        }
        if (data.type === 'action' && data.action) {
          addAction(data.action)
        }
        if (data.type === 'exec' && data.execEvent) {
          addExecEvent(data.execEvent)
        }
      },
      onError: (err) => {
        console.error('[monitor] subscription error:', err)
      },
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [canPollSessions])

  const pairingHint = pairing?.requestId
    ? `openclaw devices approve ${pairing.requestId}`
    : 'openclaw devices list && openclaw devices approve <requestId>'

  return (
    <div className="h-screen flex flex-col bg-[#1a1510] texture-sand text-white overflow-hidden relative">
      {/* Brown gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: `
            linear-gradient(180deg, transparent 0%, rgba(60, 45, 35, 0.4) 50%, rgba(45, 35, 28, 0.6) 100%),
            radial-gradient(ellipse 80% 50% at 50% 100%, rgba(55, 42, 32, 0.5) 0%, transparent 60%)
          `,
        }}
      />
      {/* Subtle accent gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-crab-950/10 via-transparent to-transparent pointer-events-none z-0" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-crab-600/3 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-neon-coral/3 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none z-0" />
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#1e1a16] relative">

        <div className="relative flex items-center gap-4">
          <Link
            to="/"
            className="p-2 hover:bg-shell-800 rounded-lg transition-all border border-transparent hover:border-shell-600 group"
          >
            <ArrowLeft size={18} className="text-gray-400 group-hover:text-crab-400" />
          </Link>

          {/* Navigation tabs */}
          <NavTabs />

          {/* Status text */}
          <div className="flex items-center gap-3 px-3 py-2 bg-[#252018] rounded-lg">
            <StatusIndicator status={connecting ? 'thinking' : connected ? 'active' : 'idle'} />
            <span className="font-display text-[11px] text-shell-400 uppercase font-semibold">
              Tracing Active
            </span>
          </div>
        </div>

        <div className="relative flex items-center gap-4">
          {connecting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <Loader2 size={14} className="animate-spin text-neon-peach" />
              <span className="font-console text-xs text-shell-400">
                {retryCount > 0 ? `retrying (${retryCount}/${MAX_RETRIES})...` : 'connecting...'}
              </span>
            </motion.div>
          )}

          {/* Clear Completed button */}
          {completedCount > 0 && (
            <button
              onClick={handleClearCompleted}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all bg-[#252018] hover:bg-[#2a221c] group"
              title={`Clear ${completedCount} completed item${completedCount !== 1 ? 's' : ''}`}
            >
              <Trash2
                size={14}
                className="text-shell-400 group-hover:text-crab-400 transition-colors"
              />
              <span className="font-console text-xs text-shell-400 group-hover:text-crab-400 transition-colors">
                {completedCount}
              </span>
            </button>
          )}

          {/* Persistence indicator */}
          {/* Stats display */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-[#252018] rounded-lg">
            <div className="flex items-center gap-2">
              <span className="font-display text-[11px] text-shell-400 uppercase font-semibold">Streams</span>
              <span className="font-display text-sm text-crab-500 font-bold">{sessions.length}</span>
            </div>
            <div className="w-px h-4 bg-[#3d3228]" />
            <div className="flex items-center gap-2">
              <span className="font-display text-[11px] text-shell-400 uppercase font-semibold">Events</span>
              <span className="font-display text-sm text-crab-500 font-bold">{actions.length}</span>
            </div>
          </div>

          <SettingsPanel
            connected={connected}
            historicalMode={historicalMode}
            debugMode={debugMode}
            logCollection={logCollection}
            logCount={logCount}
            persistenceEnabled={persistenceEnabled}
            persistenceStartedAt={persistenceStartedAt}
            persistenceSessionCount={persistenceSessionCount}
            persistenceActionCount={persistenceActionCount}
            gatewayEndpoint={gatewayEndpoint}
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            onHistoricalModeChange={handleHistoricalModeChange}
            onDebugModeChange={handleDebugModeChange}
            onLogCollectionChange={handleLogCollectionChange}
            onDownloadLogs={handleDownloadLogs}
            onClearLogs={handleClearLogs}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onRefresh={handleRefresh}
            onPersistenceStart={handlePersistenceStart}
            onPersistenceStop={handlePersistenceStop}
            onPersistenceClear={handlePersistenceClear}
            onTestDiscordAlert={handleTestDiscordAlert}
          />
        </div>
      </header>

      {connected && !canPollSessions && (
        <div className="px-4 py-2 bg-[#1e1a16]">
          <div className="font-console text-xs text-neon-peach">
            Authentication pending. Session polling is paused to avoid missing-scope errors.
          </div>
          <div className="font-console text-[11px] text-shell-300 mt-1">
            {pairing?.message ?? `Approve this device in OpenClaw: ${pairingHint}`}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - desktop only */}
        {!isMobile && (
          <SessionList
            sessions={sessions}
            selectedKey={selectedSession}
            onSelect={setSelectedSession}
            collapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
          />
        )}

        {/* Graph area */}
        <div className={`flex-1 relative ${isMobile ? 'pb-20' : ''}`}>
          <ActionGraph
            sessions={sessions}
            actions={actions}
            execs={execs}
            selectedSession={selectedSession}
            onSessionSelect={setSelectedSession}
            traceId={traceId}
          />
        </div>
      </div>

      {/* Mobile components */}
      {isMobile && (
        <>
          <MobileMonitorToolbar
            onOpenDrawer={() => setSessionDrawerOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            connected={connected}
            connecting={connecting}
            sessionCount={sessions.length}
            actionCount={actions.length}
            completedCount={completedCount}
            onClearCompleted={handleClearCompleted}
          />
          <MobileSessionDrawer
            open={sessionDrawerOpen}
            onClose={() => setSessionDrawerOpen(false)}
            sessions={sessions}
            selectedKey={selectedSession}
            onSelect={setSelectedSession}
          />
        </>
      )}

      {/* Diagonal pixel wave effect in corner */}
      <PixelWaves />
    </div>
  )
}
