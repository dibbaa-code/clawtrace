import { memo } from 'react'
import { motion } from 'framer-motion'

export const PixelWaves = memo(function PixelWaves() {
  return (
    <div
      className="fixed pointer-events-none"
      style={{
        bottom: '50px',
        right: '-100px',
        width: '250px',
        height: '250px',
        transform: 'rotate(-45deg)',
        transformOrigin: 'bottom right',
      }}
    >
      {/* Wave layers */}
      {[0, 1, 2, 3].map((index) => (
        <motion.div
          key={index}
          className="absolute bottom-0 right-0 w-full"
          animate={{
            y: [0, -6 - index * 1.5, 0],
          }}
          transition={{
            duration: 4 + index * 0.6,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.4,
          }}
        >
          <svg
            width="100%"
            height="250"
            viewBox="0 0 250 250"
            preserveAspectRatio="none"
            style={{ imageRendering: 'pixelated' }}
          >
            {/* Wave curve */}
            <path
              d={`
                M 0 ${220 - index * 30}
                Q 25 ${215 - index * 30} 50 ${218 - index * 30}
                Q 75 ${221 - index * 30} 100 ${215 - index * 30}
                Q 125 ${210 - index * 30} 150 ${213 - index * 30}
                Q 175 ${216 - index * 30} 200 ${210 - index * 30}
                Q 225 ${205 - index * 30} 250 ${208 - index * 30}
                L 250 250
                L 0 250
                Z
              `}
              fill={`rgba(100, 149, 237, ${0.15 + index * 0.05})`}
            />

            {/* Wave foam */}
            <path
              d={`
                M 0 ${223 - index * 30}
                Q 20 ${218 - index * 30} 40 ${221 - index * 30}
                Q 65 ${224 - index * 30} 90 ${218 - index * 30}
                Q 115 ${213 - index * 30} 140 ${216 - index * 30}
                Q 165 ${219 - index * 30} 190 ${213 - index * 30}
                Q 215 ${208 - index * 30} 240 ${211 - index * 30}
                L 250 ${210 - index * 30}
                L 250 250
                L 0 250
                Z
              `}
              fill={`rgba(135, 206, 250, ${0.2 + index * 0.06})`}
            />
          </svg>
        </motion.div>
      ))}

      {/* Foam particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute rounded-sm"
          style={{
            backgroundColor: 'rgb(210, 180, 140)',
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
            right: `${30 + i * 25}px`,
            bottom: `${150 + Math.random() * 40}px`,
            opacity: 0.2 + Math.random() * 0.2,
          }}
          animate={{
            y: [-4, -10, -4],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 2.5 + Math.random() * 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  )
})
