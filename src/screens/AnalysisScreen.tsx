import { DistortionCard } from '../components/DistortionCard'
import { EmotionBar } from '../components/EmotionBar'
import { LoadingState } from '../components/LoadingState'
import { ObservationList } from '../components/ObservationList'
import { ReflectionQuestion } from '../components/ReflectionQuestion'
import { Section } from '../components/Section'
import type { Analysis } from '../types/analysis'

export type AnalysisState =
  | { status: 'loading' }
  | { status: 'ready'; analysis: Analysis }
  | { status: 'error'; message: string }

interface AnalysisScreenProps {
  state: AnalysisState
  onBack: () => void
}

export function AnalysisScreen({ state, onBack }: AnalysisScreenProps) {
  return (
    <div className="space-y-12">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 rounded-full px-2 py-1 text-sm text-ink-soft transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-clay/30 focus-visible:outline-none"
      >
        ← Вернуться к записи
      </button>

      {state.status === 'loading' && <LoadingState />}
      {state.status === 'error' && (
        <p role="alert" className="rounded-2xl bg-clay-soft p-5">
          {state.message}
        </p>
      )}
      {state.status === 'ready' && <AnalysisReport analysis={state.analysis} />}
    </div>
  )
}

function AnalysisReport({ analysis }: { analysis: Analysis }) {
  const emotions = [...analysis.emotions].sort((a, b) => b.intensity - a.intensity)

  return (
    <article className="space-y-14">
      <header className="space-y-4">
        <h1 className="font-serif text-3xl leading-tight sm:text-4xl">Разбор записи</h1>
        <p className="font-serif text-lg leading-relaxed">{analysis.summary}</p>
        <p className="text-sm text-ink-soft">
          Это наблюдения, а не диагноз. Если что-то не откликается, это нормально: вам виднее.
        </p>
      </header>

      <Section title="Эмоции" hint="Насколько ярко каждая звучит в тексте">
        <ul className="space-y-7">
          {emotions.map((emotion) => (
            <EmotionBar key={emotion.name} emotion={emotion} />
          ))}
        </ul>
      </Section>

      <Section title="Потребности" hint="Что, возможно, сейчас не получает достаточно места">
        <ObservationList
          items={analysis.needs.map((need) => ({ title: need.name, evidence: need.evidence }))}
        />
      </Section>

      <Section title="Ловушки мышления" hint="Мысль, как она прозвучала, и другой взгляд на неё">
        <ul className="space-y-5">
          {analysis.cognitive_distortions.map((distortion) => (
            <DistortionCard key={distortion.quote} distortion={distortion} />
          ))}
        </ul>
      </Section>

      <Section title="Повторяющиеся сценарии">
        <ObservationList
          items={analysis.patterns.map((pattern) => ({
            title: pattern.description,
            evidence: pattern.evidence,
          }))}
        />
      </Section>

      <ReflectionQuestion question={analysis.reflection_question} />
    </article>
  )
}
