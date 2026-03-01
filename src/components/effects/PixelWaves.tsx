import { memo } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'

const WAVE_SIZE = 500

export const PixelWaves = memo(function PixelWaves() {
  const content = (
    <div
      className="fixed pointer-events-none z-0"
      style={{
        bottom: '20vh',
        right: '-20vw',
        width: `${WAVE_SIZE}px`,
        height: `${WAVE_SIZE}px`,
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
            height={WAVE_SIZE}
            viewBox="0 0 250 250"
            preserveAspectRatio="none"
            style={{ imageRendering: 'pixelated' }}
          >
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

      {/* Foam particles along wave crest */}
      {[
        { right: 40, bottom: 85 },
        { right: 120, bottom: 78 },
        { right: 200, bottom: 82 },
        { right: 280, bottom: 76 },
        { right: 360, bottom: 80 },
        { right: 80, bottom: 72 },
        { right: 240, bottom: 74 },
        { right: 320, bottom: 70 },
      ].map((pos, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute rounded-sm z-10"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            width: '3px',
            height: '3px',
            right: `${pos.right}px`,
            bottom: `${pos.bottom}px`,
            opacity: 0.35,
          }}
          animate={{
            y: [-3, -8, -3],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 2.5 + i * 0.2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(content, document.body)
})
