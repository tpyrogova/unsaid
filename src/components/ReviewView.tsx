import type { AnalyzeResponse } from '../../shared/analysis'
import { useI18n } from '../i18n'
import type { Review } from '../types/analysis'
import { Section } from './Section'

type ReviewMeta = Extract<AnalyzeResponse, { kind: 'review' }>['meta']

interface ReviewViewProps {
  review: Review
  meta: ReviewMeta
  /** Heading context, e.g. «Разбор записи» or «Последние 30 дней». */
  title: string
}

/** The fixed blocks from prompts/careful-review.md, in order. */
export function ReviewView({ review, meta, title }: ReviewViewProps) {
  const { t } = useI18n()
  const r = t.review
  return (
    <article className="space-y-14">
      <header className="space-y-4">
        <p className="text-xs font-medium tracking-[0.2em] text-clay-deep uppercase">{title}</p>
        <h1 className="font-serif text-3xl leading-tight sm:text-4xl">{r.heard}</h1>
        <p className="font-serif text-xl leading-relaxed">{review.heard}</p>
        {meta.safetyLevel === 1 && (
          <p className="rounded-2xl bg-sage-soft px-5 py-4 text-sm leading-relaxed">
            {r.caution}
          </p>
        )}
      </header>

      <Section title={r.feelings} hint={r.feelingsHint}>
        <ul className="space-y-4">
          {review.feelings.map((item) => (
            <li key={item.quote} className="space-y-3 rounded-2xl border border-line bg-card p-5">
              <p className="font-serif text-lg leading-relaxed italic">{t.common.quote(item.quote)}</p>
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-clay-soft px-3 py-1 text-clay-deep">{item.feeling}</span>
                <span aria-hidden="true" className="text-ink-soft">→</span>
                <span className="rounded-full bg-sage-soft px-3 py-1">{item.need}</span>
              </p>
            </li>
          ))}
        </ul>
      </Section>

      {review.distortions.length > 0 && (
        <Section title={r.traps} hint={r.trapsHint}>
          <ul className="space-y-4">
            {review.distortions.map((item) => (
              <li key={item.quote} className="overflow-hidden rounded-2xl border border-line bg-card">
                <div className="space-y-2 p-5">
                  <span className="inline-block rounded-full bg-clay-soft px-3 py-1 text-xs font-medium text-clay-deep">
                    {item.type}
                  </span>
                  <p className="font-serif text-lg leading-relaxed italic">{t.common.quote(item.quote)}</p>
                </div>
                <div className="flex gap-3 border-t border-line bg-sage-soft/60 p-5">
                  <span aria-hidden="true" className="pt-0.5 text-sage">
                    →
                  </span>
                  <p className="leading-relaxed">
                    <span className="sr-only">{r.otherView}</span>
                    {item.reframe}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={r.pattern} hint={r.patternHint}>
        <div className="space-y-3 rounded-2xl bg-card p-6">
          <p className="text-xs tracking-wide text-ink-soft uppercase">{r.framework(t.labels.frameworks[review.pattern.framework])}</p>
          <p className="font-serif text-lg leading-relaxed">{review.pattern.hypothesis}</p>
          <p className="text-sm text-ink-soft">{r.whyFramework(review.pattern.rationale)}</p>
        </div>
      </Section>

      {review.changes && (
        <Section title={r.changes} hint={r.changesHint}>
          <p className="font-serif text-lg leading-relaxed">{review.changes}</p>
        </Section>
      )}

      <aside className="space-y-4 rounded-3xl bg-clay-soft px-6 py-8 text-center sm:px-10">
        <p className="text-xs font-medium tracking-[0.2em] text-clay-deep uppercase">{r.question}</p>
        <p className="font-serif text-xl leading-relaxed sm:text-2xl">{review.question}</p>
        <p className="text-sm text-ink-soft">{r.questionHint}</p>
      </aside>

      <Section title={r.steps} hint={r.stepsHint}>
        <ul className="space-y-3">
          {review.steps.map((step) => (
            <li key={step} className="flex gap-3 leading-relaxed">
              <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-sage" />
              {step}
            </li>
          ))}
        </ul>
      </Section>

      <p className="text-xs leading-relaxed text-ink-soft">
        {meta.entriesUsed > 1 && r.metaEntries(meta.entriesUsed)}
        {r.metaModel(meta.model)}
        {meta.ungroundedDropped > 0 && r.metaDropped(meta.ungroundedDropped)} {r.metaPrivacy}
      </p>
    </article>
  )
}
