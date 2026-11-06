import type { Emotion } from '../types/analysis'
import { EvidenceQuote } from './EvidenceQuote'

interface EmotionBarProps {
  emotion: Emotion
}

export function EmotionBar({ emotion }: EmotionBarProps) {
  const percent = Math.round(clamp(emotion.intensity, 0, 1) * 100)

  return (
    <li className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-medium">{emotion.name}</span>
        <span className="text-sm text-ink-soft tabular-nums">{percent}%</span>
      </div>
      <div
        role="meter"
        aria-label={`Интенсивность: ${emotion.name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 overflow-hidden rounded-full bg-sand"
      >
        <div
          className="h-full rounded-full bg-clay transition-[width] duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <EvidenceQuote text={emotion.evidence} />
    </li>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
