import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Github, Activity, Terminal, FolderOpen } from 'lucide-react'
import { PixelWaves } from '~/components/effects/PixelWaves'
import { CrabIdleAnimation } from '~/components/ani'
import { version } from '../../package.json'

function XIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z" />
    </svg>
  )
}

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="min-h-screen bg-shell-950 texture-dots relative overflow-hidden">
      {/* Subtle background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-crab-950/10 via-transparent to-shell-950" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-crab-600/3 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-neon-coral/3 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

      {/* Main content */}
      <div className="relative flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-3xl">
          {/* Floating crab mascot */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 18 }}
            className="mb-10"
          >
            <div className="relative inline-block animate-float">
              <div className="crab-icon-glow">
                <CrabIdleAnimation className="w-32 h-32" />
              </div>
              <motion.div
                className="absolute inset-0 flex items-center justify-center -z-10"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="w-20 h-20 rounded-full bg-crab-500/20 blur-2xl" />
                <div className="w-24 h-24 rounded-full bg-neon-cyan/10 blur-3xl absolute" />
              </motion.div>
            </div>
          </motion.div>

          {/* Modern headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
            className="font-arcade text-3xl md:text-4xl text-crab-400 mb-4 leading-tight"
            style={{ textShadow: '0 0 20px rgba(59, 130, 246, 0.4), 0 0 40px rgba(0, 217, 255, 0.2)' }}
          >
            clawtrace
          </motion.h1>

          {/* Clean subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.15 }}
            className="font-display text-base text-shell-400 mb-12 tracking-wide"
          >
            Open-Source OpenClaw Companion
          </motion.p>

          {/* Feature cards */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10 max-w-2xl mx-auto"
          >
            {[
              { icon: Activity, label: 'Live Activity Feed', color: 'text-neon-mint' },
              { icon: Terminal, label: 'Session & Action Graph', color: 'text-neon-peach' },
              { icon: FolderOpen, label: 'Workspace Browser', color: 'text-neon-coral' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.25 + i * 0.05 }}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-shell-900/60 border border-shell-800/50 hover:bg-shell-900/80 hover:border-shell-700/50 transition-all"
              >
                <item.icon size={22} className={item.color} />
                <span className="font-display text-xs text-shell-300">{item.label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link
              to="/monitor"
              className="px-8 py-3 rounded-full bg-crab-500 hover:bg-crab-600 text-white font-display font-semibold text-sm tracking-wide transition-all hover:shadow-lg hover:shadow-crab-500/40 hover:-translate-y-0.5"
            >
              Launch Monitor
            </Link>
            <Link
              to="/workspace"
              className="px-8 py-3 rounded-full bg-transparent text-shell-300 border border-shell-600 hover:border-shell-500 hover:text-white font-display font-semibold text-sm tracking-wide transition-all inline-flex items-center gap-2"
            >
              <FolderOpen size={18} />
              Explore Workspace
            </Link>
          </motion.div>

          {/* Minimal status indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-shell-900/50 rounded-full border border-shell-800/30"
          >
            <span className="w-2 h-2 rounded-full bg-neon-mint animate-pulse" />
            <span className="font-display text-xs text-shell-500">
              v{version} • system online
            </span>
          </motion.div>

          {/* Social links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-8 flex items-center justify-center gap-6 font-display text-sm"
          >
            <a
              href="https://github.com/dibbaa-code/clawtrace"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-shell-500 hover:text-crab-400 transition-colors"
            >
              <Github size={16} />
              <span>Contribute on Github</span>
            </a>
            <a
              href="https://x.com/dibbaa-code"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-shell-500 hover:text-crab-400 transition-colors"
            >
              <XIcon size={16} />
              <span>@dibbaa-code</span>
            </a>
          </motion.div>
        </div>
      </div>

      {/* Diagonal pixel wave effect in corner */}
      <PixelWaves />
    </div>
  )
}
