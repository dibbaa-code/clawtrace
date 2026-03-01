import { memo } from 'react'

/** Small crab footprint SVG - 3 dots (claw pattern) */
function Footprint({ x, y, size = 4, opacity = 0.25, rotation = 0 }: { x: number; y: number; size?: number; opacity?: number; rotation?: number }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${rotation})`} opacity={opacity}>
      <circle cx={0} cy={0} r={size * 0.4} fill="rgb(180, 150, 110)" />
      <circle cx={-size * 0.6} cy={-size * 0.3} r={size * 0.25} fill="rgb(180, 150, 110)" />
      <circle cx={size * 0.6} cy={-size * 0.3} r={size * 0.25} fill="rgb(180, 150, 110)" />
    </g>
  )
}

/** Scattered crab footprints across the graph background */
export const CrabTrails = memo(function CrabTrails() {
  const footprints = [
    { x: 80, y: 120, size: 5, opacity: 0.2, rotation: 15 },
    { x: 240, y: 200, size: 4, opacity: 0.18, rotation: -20 },
    { x: 420, y: 80, size: 6, opacity: 0.22, rotation: 5 },
    { x: 600, y: 280, size: 4, opacity: 0.15, rotation: -35 },
    { x: 150, y: 350, size: 5, opacity: 0.2, rotation: 25 },
    { x: 380, y: 420, size: 4, opacity: 0.16, rotation: -10 },
    { x: 720, y: 150, size: 5, opacity: 0.18, rotation: 40 },
    { x: 900, y: 320, size: 4, opacity: 0.14, rotation: -15 },
    { x: 1100, y: 180, size: 5, opacity: 0.2, rotation: 8 },
    { x: 300, y: 500, size: 4, opacity: 0.12, rotation: -25 },
    { x: 550, y: 50, size: 5, opacity: 0.18, rotation: 30 },
    { x: 850, y: 450, size: 4, opacity: 0.15, rotation: -5 },
  ]

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible w-full h-full"
      viewBox="0 0 1400 800"
      preserveAspectRatio="none"
      style={{ zIndex: 0 }}
    >
      {footprints.map((fp, i) => (
        <Footprint key={i} {...fp} />
      ))}
    </svg>
  )
})
