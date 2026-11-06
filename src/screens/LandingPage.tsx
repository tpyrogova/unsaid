import type { ReactNode } from 'react'
import { Button } from '../components/Button'
import { Logo } from '../components/Logo'

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
  return (
    // overflow-x-clip: the tilted card backdrop must not cause sideways scroll on phones.
    <div className="min-h-dvh overflow-x-clip">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Logo onClick={onHome} />
        <nav className="flex items-center gap-2 sm:gap-3">
          {!accountMenu && (
            <button
              type="button"
              onClick={onLogIn}
              className="rounded-full px-4 py-2 text-sm text-ink-soft transition-colors hover:text-ink focus-visible:ring-4 focus-visible:ring-clay/25 focus-visible:outline-none"
            >
              Войти
            </button>
          )}
          <Button onClick={onImport} className="px-5 py-2.5 text-sm">
            Загрузить<span className="hidden sm:inline"> дневник</span>
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
        Unsaid — инструмент для саморефлексии. Он не ставит диагнозов и не заменяет психолога. Если вам
        тяжело, пожалуйста, обратитесь к специалисту или к близкому человеку.
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
  return (
    <Container className="grid items-center gap-14 pt-10 pb-24 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:pb-32">
      <div className="space-y-8">
        <p className="text-xs font-medium tracking-[0.2em] text-clay-deep uppercase">
          Для тех, кто ведёт «Дневник» на iPhone
        </p>
        <h1 className="font-serif text-4xl leading-[1.1] sm:text-6xl">Как изменились ваши мысли за&nbsp;год?</h1>
        <div className="max-w-xl space-y-4 text-lg leading-relaxed text-ink-soft">
          <p>
            Вы ведёте личный дневник. А вы задумывались, как менялись ваши мысли за год, за два или даже
            за последние несколько дней? Вы растёте или раз за разом прокручиваете одно и то же?
          </p>
          <p>
            Ответы уже есть в ваших записях. <span className="text-ink">Просто загрузите ваш дневник с
            iPhone. Переписывать ничего не нужно.</span> Современные ИИ-модели
            бережно разберут записи, покажут ваш личностный рост и подсветят то, чего вы не замечали.
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 whitespace-nowrap sm:flex-row sm:items-center">
            <Button onClick={onImport}>Загрузить дневник с iPhone</Button>
            <Button variant="secondary" onClick={onTryDemo}>
              Посмотреть пример разбора
            </Button>
          </div>
          <p className="text-sm text-ink-soft">
            Конфиденциально: файл читается в браузере, записи шифруются на вашем устройстве.
          </p>
        </div>
      </div>

      <ThemeTimeline />
    </Container>
  )
}

const TIMELINE = [
  { when: 'Март', quote: 'Если скажу, что мне обидно, он просто уйдёт.' },
  { when: 'Сентябрь', quote: 'Сказала, что мне обидно. Было страшно, но он остался.' },
  { when: 'Февраль', quote: 'Теперь проще говорить, когда что-то задевает.' },
]

/** Illustrative card: how one recurring theme evolves across entries. */
function ThemeTimeline() {
  return (
    <figure className="relative">
      <div aria-hidden="true" className="absolute -inset-4 -z-10 rotate-2 rounded-[2.5rem] bg-sand sm:-inset-6" />
      <div className="space-y-6 rounded-[2rem] border border-line bg-card p-6 shadow-[0_20px_50px_-30px_rgba(59,47,42,0.35)] sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs tracking-wide text-ink-soft uppercase">Тема за 12 месяцев</p>
          <span className="rounded-full bg-sand px-3 py-1 text-[11px] text-ink-soft">пример</span>
        </div>
        <p className="font-serif text-2xl leading-snug">«Страх, что меня оставят»</p>

        <ol className="relative space-y-6 border-l border-line pl-6">
          {TIMELINE.map((point, i) => (
            <li key={point.when} className="relative">
              <span
                aria-hidden="true"
                className={`absolute top-1.5 -left-[29px] size-2.5 rounded-full ring-4 ring-card ${i === TIMELINE.length - 1 ? 'bg-sage' : 'bg-clay'}`}
              />
              <p className="text-xs font-medium text-ink-soft">{point.when}</p>
              <p className="mt-1 font-serif text-lg leading-relaxed italic">«{point.quote}»</p>
            </li>
          ))}
        </ol>

        <figcaption className="rounded-2xl bg-sage-soft px-4 py-3 text-sm leading-relaxed">
          Тема звучит всё реже, а тон стал спокойнее. Похоже, вы научились говорить о своих чувствах.
        </figcaption>
      </div>
    </figure>
  )
}

/* ---------- Questions ---------- */

const QUESTIONS = [
  {
    title: 'Вы растёте или ходите по кругу?',
    text: 'Руминация — это когда мысль возвращается снова и снова, но не приводит к решению. Изнутри её легко принять за размышление.',
  },
  {
    title: 'Что повторяется из записи в запись?',
    text: 'Одни и те же страхи, сценарии в отношениях, способы себя ругать. По отдельности они незаметны, а вместе складываются в узор.',
  },
  {
    title: 'Что изменилось, а вы не заметили?',
    text: 'Рост редко ощущается в моменте. Но его видно, если сравнить, как вы писали о том же самом полгода назад.',
  },
]

function Questions() {
  return (
    <section className="bg-card py-24">
      <Container className="space-y-12">
        <SectionHeading eyebrow="Зачем" title="Дневник хранит ответы. Их просто трудно увидеть изнутри" />
        <div className="grid gap-6 md:grid-cols-3">
          {QUESTIONS.map((q) => (
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

const INSIGHTS: { title: string; text: string; soon?: boolean }[] = [
  { title: 'Чувства и потребности', text: 'Каждое — с опорой на ваши слова.' },
  { title: 'Ловушки мышления', text: 'Мысль, как она прозвучала, и более бережный взгляд на неё.' },
  { title: 'Повторяющиеся сценарии', text: 'Как вы привычно поступаете в похожих ситуациях.' },
  { title: 'Вопрос для себя', text: 'Один мягкий вопрос, с которым можно побыть после чтения.' },
  { title: 'Динамика во времени', text: 'Как меняются темы, тон и сценарии за месяцы и годы.' },
]

function WhatYouSee() {
  return (
    <section className="py-24">
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <SectionHeading
          eyebrow="Разбор"
          title="Наблюдения, а не диагнозы"
          lead="Каждое наблюдение о чувствах опирается на ваши слова, и мы проверяем, что цитата действительно есть в тексте."
        />
        <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {INSIGHTS.map((item) => (
            <li key={item.title} className="space-y-2 border-t border-line pt-5">
              <h3 className="flex items-center gap-3 font-medium">
                {item.title}
                {item.soon && (
                  <span className="rounded-full bg-clay-soft px-2.5 py-0.5 text-[11px] font-normal text-clay-deep">
                    скоро
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

const NEW_FEATURES = [
  {
    title: 'Анализ за период',
    text: 'Неделя, месяц, 3 месяца, полгода, год или всё время. Отдельный блок «Что меняется» показывает, есть ли рост или мысли ходят по кругу.',
  },
  {
    title: 'Наш метод или своя рамка',
    text: 'Модель сама выбирает подходящую рамку (КПТ, схема-терапия или привязанность) и объясняет выбор. Можно задать рамку самому и подсказать, на что обратить внимание.',
  },
  {
    title: 'Разбор по шагам',
    text: 'Услышано, чувства и потребности, ловушки мышления, замеченный паттерн, вопрос себе и маленькие шаги на выбор.',
  },
  {
    title: 'Темы дневника',
    text: 'Одной кнопкой записи раскладываются по темам: отношения, семья, работа, здоровье и другие. Каждая запись обрабатывается один раз.',
  },
  {
    title: 'Уборка мусора',
    text: 'Модель подскажет тестовые и случайные записи, списки покупок. Удаляется только то, что вы сами отметили.',
  },
  {
    title: 'Бережность прежде всего',
    text: 'Перед каждым разбором — отдельная проверка. Если в недавних записях есть признаки кризиса, вместо разбора появятся контакты помощи.',
  },
  {
    title: 'Свои записи и обновление',
    text: 'Пишите прямо здесь с любой датой. Повторная загрузка экспорта добавит только новые записи, а уже сохранённые не изменятся.',
  },
  {
    title: 'Данные под вашим контролем',
    text: 'В настройках можно очистить дневник или удалить аккаунт со всеми данными, подтвердив паролем.',
  },
]

function WhatsNew() {
  return (
    <section className="bg-card py-24">
      <Container className="space-y-12">
        <SectionHeading eyebrow="Уже работает" title="Что появилось в Unsaid" />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {NEW_FEATURES.map((feature) => (
            <li key={feature.title} className="space-y-3 rounded-3xl bg-paper p-7">
              <h3 className="flex items-center gap-3 font-serif text-xl">
                {feature.title}
                <span className="rounded-full bg-sage-soft px-2.5 py-0.5 font-sans text-[11px] text-ink">новое</span>
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

const IMPORT_STEPS = [
  {
    title: 'Выгрузите дневник на iPhone',
    text: '«Настройки» → «Приложения» → «Дневник» → «Экспорт». Файл AppleJournalEntries.zip появится в приложении «Файлы».',
  },
  {
    title: 'Загрузите файл сюда',
    text: 'Архив читается прямо в браузере. Вы сразу увидите, сколько записей нашлось и за какой период.',
  },
  {
    title: 'Придумайте пароль',
    text: 'Осталось придумать пароль: из него на вашем устройстве создаётся ключ.',
  },
]

function ImportSteps({ onImport }: { onImport: () => void }) {
  return (
    <section className="bg-sand/60 py-24">
      <Container className="space-y-12">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading
            eyebrow="Перенос за пару минут"
            title="Весь дневник уже готов. Осталось его загрузить"
            lead="Никаких анкет и тестов: разбор строится на том, что вы уже написали, за месяцы или годы."
          />
          <Button onClick={onImport} className="self-start whitespace-nowrap lg:self-auto">
            Загрузить дневник
          </Button>
        </div>
        <ol className="grid gap-6 md:grid-cols-3">
          {IMPORT_STEPS.map((step, i) => (
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
          Фото и видео не загружаются. Ведёте дневник в другом месте? Можно{' '}
          <span className="text-ink">писать прямо здесь</span>, импорт из других приложений появится позже.
        </p>
      </Container>
    </section>
  )
}

/* ---------- Privacy ---------- */

const PRIVACY_POINTS = [
  {
    title: 'Шифрование на устройстве',
    text: 'Сервер хранит только зашифрованный текст. Ключа у него нет, и прочитать дневник он не может.',
  },
  {
    title: 'Анализ без хранения',
    text: 'Для разбора выбранные записи передаются ИИ-модели и не сохраняются ни у нас, ни у провайдера модели.',
  },
  {
    title: 'Удаление по первому желанию',
    text: 'Очистить дневник или удалить аккаунт со всеми данными можно в настройках. Нужно только подтвердить паролем.',
  },
  {
    title: 'Пароль — единственный ключ',
    text: 'Мы не сможем его восстановить. Это цена настоящей приватности, и мы честно о ней предупреждаем.',
  },
]

function Privacy() {
  return (
    <section className="bg-ink py-24 text-paper">
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <div className="max-w-xl space-y-4">
          <p className="text-xs font-medium tracking-[0.2em] text-clay-soft uppercase">Приватность</p>
          <h2 className="font-serif text-3xl leading-tight sm:text-4xl">Ваш дневник — только ваш</h2>
          <p className="text-lg leading-relaxed text-paper/70">
            Мы строили Unsaid так, чтобы вам не приходилось нам доверять: у нас просто нет технической
            возможности читать ваши записи.
          </p>
        </div>
        <ul className="space-y-8">
          {PRIVACY_POINTS.map((point) => (
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
  return (
    <section className="py-24">
      <Container className="space-y-8 text-center">
        <h2 className="mx-auto max-w-2xl font-serif text-3xl leading-tight sm:text-5xl">
          Посмотрите на свой год со стороны
        </h2>
        <p className="mx-auto max-w-xl text-lg leading-relaxed text-ink-soft">
          Загрузите ваш дневник с iPhone. Переписывать ничего не нужно: все записи уже там.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={onImport}>Загрузить дневник с iPhone</Button>
          <Button variant="secondary" onClick={onSignUp}>
            Начать с чистого листа
          </Button>
        </div>
      </Container>
    </section>
  )
}
