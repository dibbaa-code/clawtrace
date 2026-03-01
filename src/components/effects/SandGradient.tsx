import { memo } from 'react'

/** Warm brown gradient overlay for beach theme */
export const SandGradient = memo(function SandGradient() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        zIndex: 0,
        background: `
          linear-gradient(180deg, transparent 0%, rgba(60, 45, 35, 0.5) 40%, rgba(45, 35, 28, 0.7) 100%),
          radial-gradient(ellipse 80% 60% at 50% 100%, rgba(55, 42, 32, 0.6) 0%, transparent 55%),
          radial-gradient(ellipse 50% 40% at 20% 85%, rgba(50, 38, 30, 0.35) 0%, transparent 50%),
          radial-gradient(ellipse 50% 35% at 80% 90%, rgba(48, 36, 28, 0.4) 0%, transparent 45%)
        `,
      }}
    />
  )
})
