import { FrameAnimation } from './FrameAnimation'

const crabAttackFrames = Array.from(
  { length: 4 },
  (_, i) => `/ani/crab-attack/Crab_Attack${i + 1}.png`,
)

const crabIdleFrames = Array.from(
  { length: 5 },
  (_, i) => `/ani/crab-idle/Crab${i + 1}.png`,
)

const crabJumpFrames = Array.from(
  { length: 4 },
  (_, i) => `/ani/crab-jump/CrabMoving${i + 1}.png`,
)

type CrabAnimProps = {
  fps?: number
  className?: string
  alt?: string
  paused?: boolean
  width?: number
  height?: number
}

export function CrabAttackAnimation(props: CrabAnimProps) {
  return (
    <FrameAnimation
      frames={crabAttackFrames}
      fps={10}
      alt="Crab attack animation"
      {...props}
    />
  )
}

export function CrabIdleAnimation(props: CrabAnimProps) {
  return (
    <FrameAnimation
      frames={crabIdleFrames}
      fps={10}
      alt="Crab idle animation"
      {...props}
    />
  )
}

export function CrabJumpAnimation(props: CrabAnimProps) {
  return (
    <FrameAnimation
      frames={crabJumpFrames}
      fps={10}
      alt="Crab jump animation"
      {...props}
    />
  )
}

