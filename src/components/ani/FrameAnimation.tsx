import { useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

export interface FrameAnimationProps {
  frames: string[]
  fps?: number
  className?: string
  alt?: string
  paused?: boolean
  width?: number
  height?: number
}

export function FrameAnimation({
  frames,
  fps = 10,
  className,
  alt = '',
  paused = false,
  width = 20,
  height = 20,
}: FrameAnimationProps) {
  const reducedMotion = useReducedMotion()
  const isPaused = paused || reducedMotion

  const safeFrames = useMemo(() => frames.filter(Boolean), [frames])
  const [frameIdx, setFrameIdx] = useState(0)

  // Reset if the frame list changes.
  useEffect(() => {
    setFrameIdx(0)
  }, [safeFrames.length])

  // Preload frames to avoid flicker.
  useEffect(() => {
    if (typeof window === 'undefined') return
    for (const src of safeFrames) {
      const img = new Image()
      img.src = src
    }
  }, [safeFrames])

  useEffect(() => {
    if (isPaused) return
    if (safeFrames.length <= 1) return

    const msPerFrame = Math.max(1, Math.round(1000 / fps))
    const id = window.setInterval(() => {
      setFrameIdx((prev) => (prev + 1) % safeFrames.length)
    }, msPerFrame)

    return () => window.clearInterval(id)
  }, [fps, isPaused, safeFrames.length])

  const src = safeFrames[frameIdx] ?? safeFrames[0] ?? ''

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      draggable={false}
      decoding="async"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

