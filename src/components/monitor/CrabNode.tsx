import { Handle, Position } from '@xyflow/react'
import { motion } from 'framer-motion'

interface CrabNodeProps {
  data: { active: boolean }
}

export function CrabNode({ data }: CrabNodeProps) {
  return (
    <motion.div
      className="relative flex items-center justify-center"
      animate={data.active ? { scale: [1, 1.08, 1] } : {}}
      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
    >
      {/* Glow effect behind crab */}
      <motion.div
        className="absolute w-24 h-24 rounded-full bg-crab-500/30 blur-xl"
        animate={data.active ? { scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] } : {}}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      />

      {/* Outer ring */}
      <div
        className={`absolute w-24 h-24 rounded-full border ${data.active ? 'border-crab-500/30' : 'border-shell-700/50'
          }`}
        style={{
          boxShadow: data.active ? '0 0 15px rgba(230, 57, 70, 0.2)' : 'none',
        }}
      />

      {/* Cute crab mascot */}
      <div className="relative z-10">
        <img
          src="/crab-mascot.png"
          alt="Clawtrace origin"
          className="w-24 h-24 hover:scale-105 transition-transform duration-300"
          style={{ imageRendering: 'pixelated' }}
          draggable={false}
        />
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="bg-crab-500! w-4! h-4! border-2! border-shell-900! z-10"
        style={{
          boxShadow: '0 0 10px rgba(230, 57, 70, 0.5)',
        }}
      />
    </motion.div>
  )
}
