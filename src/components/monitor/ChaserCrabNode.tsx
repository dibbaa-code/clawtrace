import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { CrabIdleAnimation, CrabJumpAnimation, CrabAttackAnimation } from '~/components/ani'

export type ChaserCrabState = 'idle' | 'wandering' | 'chasing' | 'attacking' | 'jumping'

interface ChaserCrabData {
  state: ChaserCrabState
  facingLeft: boolean
  onClick?: () => void
}

function ChaserCrabNodeComponent({ data }: NodeProps) {
  const { state, facingLeft, onClick } = data as unknown as ChaserCrabData

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.()
  }

  // Use jump animation for both chasing and wandering (moving states)
  const isMoving = state === 'chasing' || state === 'wandering' || state === 'jumping'

  return (
    <div
      className="w-5 h-5 cursor-pointer transition-transform duration-75"
      style={{
        transform: `scaleX(${facingLeft ? -1 : 1})`,
      }}
      onClick={handleClick}
    >
      {state === 'idle' && <CrabIdleAnimation className="w-full h-full" />}
      {isMoving && <CrabJumpAnimation className="w-full h-full" />}
      {state === 'attacking' && <CrabAttackAnimation className="w-full h-full" />}
    </div>
  )
}

export const ChaserCrabNode = memo(ChaserCrabNodeComponent)
