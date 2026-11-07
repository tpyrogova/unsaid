import type { ReactNode } from 'react'
import { Button } from '../components/Button'
import { LanguageSwitch } from '../components/LanguageSwitch'
import { Logo } from '../components/Logo'
import { useI18n } from '../i18n'

interface LandingPageProps {
  /** Main path: straight to the iPhone Journal file upload, no sign-up first. */
  onImport: () => void
  onSignUp: () => void
  onLogIn: () => void
  onTryDemo: () => void
  onHome: () => void
  /** Signed-in users see their account menu instead of «Войти». */
  accountMenu?: ReactNode
}

export function LandingPage({ onImport, onSignUp, onLogIn, onTryDemo, onHome, accountMenu }: LandingPageProps) {
  const { t } = useI18n()
  return (
    // overflow-x-clip: the tilted card backdrop must not cause sideways scroll on phones.
    <div className="min-h-dvh overflow-x-clip">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <Logo onClick={onHome} />
        <nav className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitch />
          {!accountMenu && (
            <button
              type="button"
              onClick={onLogIn}
              className="rounded-full px-3 py-2 text-sm whitespace-nowrap text-ink-soft transition-colors sm:px-4 hover:text-ink focus-visible:ring-4 focus-visible:ring-clay/25 focus-visible:outline-none"
            >
              {t.landing.login}
            </button>
          )}
          <Button onClick={onImport} className="px-5 py-2.5 text-sm">
            {t.landing.uploadShort}
            <span className="hidden sm:inline">{t.landing.uploadRest}</span>
          </Button>
          {accountMenu}
        </nav>
      </header>

      <main>
        <Hero onImport={onImport} onTryDemo={onTryDemo} />
        <ImportSteps onImport={onImport} />
        <Questions />
        <WhatYouSee />
        <WhatsNew />
        <Privacy />
        <FinalCta onImport={onImport} onSignUp={onSignUp} />
      </main>

      <footer className="mx-auto max-w-6xl border-t border-line px-5 py-8 text-xs leading-relaxed text-ink-soft sm:px-8">
        {t.landing.footer}
      </footer>
    </div>
  )
}

function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>
}

function SectionHeading({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-xs font-medium tracking-[0.2em] text-clay-deep uppercase">{eyebrow}</p>
      <h2 className="font-serif text-3xl leading-tight sm:text-4xl">{title}</h2>
      {lead && <p className="text-lg leading-relaxed text-ink-soft">{lead}</p>}
    </div>
  )
}

/* ---------- Hero ---------- */

function Hero({ onImport, onTryDemo }: { onImport: () => void; onTryDemo: () => void }) {
  const { hero } = useI18n().t.landing
  return (
    <Container className="grid items-center gap-14 pt-10 pb-24 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:pb-32">
      <div className="space-y-8">
        <p className="text-xs font-medium tracking-[0.2em] text-clay-deep uppercase">
          {hero.eyebrow}
        </p>
        <h1 className="font-serif text-4xl leading-[1.1] sm:text-6xl">{hero.title}</h1>
        <div className="max-w-xl space-y-4 text-lg leading-relaxed text-ink-soft">
          <p>{hero.p1}</p>
          <p>
            {hero.p2before}
            <span className="text-ink">{hero.p2strong}</span>
            {hero.p2after}
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 whitespace-nowrap sm:flex-row sm:items-center">
            <Button onClick={onImport}>{hero.ctaImport}</Button>
            <Button variant="secondary" onClick={onTryDemo}>
              {hero.ctaDemo}
            </Button>
          </div>
          <p className="text-sm text-ink-soft">{hero.note}</p>
        </div>
      </div>

      <ThemeTimeline />
    </Container>
  )
}

/** Illustrative card: how one recurring theme evolves across entries. */
function ThemeTimeline() {
  const { t } = useI18n()
  const timeline = t.landing.timeline
  return (
    <figure className="relative">
      <div aria-hidden="true" className="absolute -inset-4 -z-10 rotate-2 rounded-[2.5rem] bg-sand sm:-inset-6" />
      <div className="space-y-6 rounded-[2rem] border border-line bg-card p-6 shadow-[0_20px_50px_-30px_rgba(59,47,42,0.35)] sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs tracking-wide text-ink-soft uppercase">{timeline.label}</p>
          <span className="rounded-full bg-sand px-3 py-1 text-[11px] text-ink-soft">{timeline.badge}</span>
        </div>
        <p className="font-serif text-2xl leading-snug">{timeline.theme}</p>

        <ol className="relative space-y-6 border-l border-line pl-6">
          {timeline.points.map((point, i) => (
            <li key={point.when} className="relative">
              <span
                aria-hidden="true"
                className={`absolute top-1.5 -left-[29px] size-2.5 rounded-full ring-4 ring-card ${i === timeline.points.length - 1 ? 'bg-sage' : 'bg-clay'}`}
              />
              <p className="text-xs font-medium text-ink-soft">{point.when}</p>
              <p className="mt-1 font-serif text-lg leading-relaxed italic">{t.common.quote(point.quote)}</p>
            </li>
          ))}
        </ol>

        <figcaption className="rounded-2xl bg-sage-soft px-4 py-3 text-sm leading-relaxed">
          {timeline.caption}
        </figcaption>
      </div>
    </figure>
  )
}

/* ---------- Questions ---------- */

function Questions() {
  const { questions } = useI18n().t.landing
  return (
    <section className="bg-card py-24">
      <Container className="space-y-12">
        <SectionHeading eyebrow={questions.eyebrow} title={questions.title} />
        <div className="grid gap-6 md:grid-cols-3">
          {questions.items.map((q) => (
            <article key={q.title} className="space-y-3 rounded-3xl bg-paper p-7">
              <h3 className="font-serif text-xl leading-snug">{q.title}</h3>
              <p className="leading-relaxed text-ink-soft">{q.text}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}

/* ---------- What you see ---------- */

function WhatYouSee() {
  const { insights } = useI18n().t.landing
  return (
    <section className="py-24">
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <SectionHeading
          eyebrow={insights.eyebrow}
          title={insights.title}
          lead={insights.lead}
        />
        <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {insights.items.map((item) => (
            <li key={item.title} className="space-y-2 border-t border-line pt-5">
              <h3 className="flex items-center gap-3 font-medium">
                {item.title}
                {item.soon && (
                  <span className="rounded-full bg-clay-soft px-2.5 py-0.5 text-[11px] font-normal text-clay-deep">
                    {insights.soon}
                  </span>
                )}
              </h3>
              <p className="leading-relaxed text-ink-soft">{item.text}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

/* ---------- What's new ---------- */

function WhatsNew() {
  const { whatsNew } = useI18n().t.landing
  return (
    <section className="bg-card py-24">
      <Container className="space-y-12">
        <SectionHeading eyebrow={whatsNew.eyebrow} title={whatsNew.title} />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {whatsNew.items.map((feature) => (
            <li key={feature.title} className="space-y-3 rounded-3xl bg-paper p-7">
              <h3 className="flex items-center gap-3 font-serif text-xl">
                {feature.title}
                <span className="rounded-full bg-sage-soft px-2.5 py-0.5 font-sans text-[11px] text-ink">{whatsNew.badge}</span>
              </h3>
              <p className="leading-relaxed text-ink-soft">{feature.text}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

/* ---------- Import steps ---------- */

function ImportSteps({ onImport }: { onImport: () => void }) {
  const { importSteps } = useI18n().t.landing
  return (
    <section className="bg-sand/60 py-24">
      <Container className="space-y-12">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading
            eyebrow={importSteps.eyebrow}
            title={importSteps.title}
            lead={importSteps.lead}
          />
          <Button onClick={onImport} className="self-start whitespace-nowrap lg:self-auto">
            {importSteps.button}
          </Button>
        </div>
        <ol className="grid gap-6 md:grid-cols-3">
          {importSteps.steps.map((step, i) => (
            <li key={step.title} className="space-y-4 rounded-3xl bg-card p-7">
              <span className="flex size-10 items-center justify-center rounded-full bg-clay-soft font-serif text-lg text-clay-deep">
                {i + 1}
              </span>
              <h3 className="font-serif text-xl">{step.title}</h3>
              <p className="leading-relaxed text-ink-soft">{step.text}</p>
            </li>
          ))}
        </ol>
        <p className="text-sm text-ink-soft">
          {importSteps.noteBefore}
          <span className="text-ink">{importSteps.noteStrong}</span>
          {importSteps.noteAfter}
        </p>
      </Container>
    </section>
  )
}

/* ---------- Privacy ---------- */

function Privacy() {
  const { privacy } = useI18n().t.landing
  return (
    <section className="bg-ink py-24 text-paper">
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <div className="max-w-xl space-y-4">
          <p className="text-xs font-medium tracking-[0.2em] text-clay-soft uppercase">{privacy.eyebrow}</p>
          <h2 className="font-serif text-3xl leading-tight sm:text-4xl">{privacy.title}</h2>
          <p className="text-lg leading-relaxed text-paper/70">{privacy.lead}</p>
        </div>
        <ul className="space-y-8">
          {privacy.points.map((point) => (
            <li key={point.title} className="space-y-2 border-t border-paper/15 pt-5">
              <h3 className="font-medium">{point.title}</h3>
              <p className="leading-relaxed text-paper/70">{point.text}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

/* ---------- Final CTA ---------- */

function FinalCta({ onImport, onSignUp }: { onImport: () => void; onSignUp: () => void }) {
  const { final } = useI18n().t.landing
  return (
    <section className="py-24">
      <Container className="space-y-8 text-center">
        <h2 className="mx-auto max-w-2xl font-serif text-3xl leading-tight sm:text-5xl">
          {final.title}
        </h2>
        <p className="mx-auto max-w-xl text-lg leading-relaxed text-ink-soft">{final.lead}</p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={onImport}>{final.ctaImport}</Button>
          <Button variant="secondary" onClick={onSignUp}>
            {final.ctaBlank}
          </Button>
        </div>
      </Container>
    </section>
  )
}
