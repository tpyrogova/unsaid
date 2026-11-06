import type { CognitiveDistortion } from '../types/analysis'

interface DistortionCardProps {
  distortion: CognitiveDistortion
}

/** Shows a thought as written and a gentler way to look at it. */
export function DistortionCard({ distortion }: DistortionCardProps) {
  return (
    <li className="overflow-hidden rounded-2xl border border-line bg-card">
      <div className="space-y-2 p-5">
        <span className="inline-block rounded-full bg-clay-soft px-3 py-1 text-xs font-medium tracking-wide text-clay-deep">
          {distortion.type}
        </span>
        <p className="font-serif text-lg leading-relaxed">«{distortion.quote}»</p>
      </div>
      <div className="flex gap-3 border-t border-line bg-sage-soft/60 p-5">
        <span aria-hidden="true" className="pt-0.5 text-sage">
          →
        </span>
        <p className="leading-relaxed">
          <span className="sr-only">Другой взгляд: </span>
          {distortion.reframe}
        </p>
      </div>
    </li>
  )
}
