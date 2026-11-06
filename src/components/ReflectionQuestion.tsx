interface ReflectionQuestionProps {
  question: string
}

export function ReflectionQuestion({ question }: ReflectionQuestionProps) {
  return (
    <aside className="rounded-3xl bg-clay-soft px-6 py-8 text-center sm:px-10">
      <p className="text-xs font-medium tracking-[0.2em] text-clay-deep uppercase">
        Вопрос для себя
      </p>
      <p className="mt-4 font-serif text-xl leading-relaxed sm:text-2xl">{question}</p>
      <p className="mt-4 text-sm text-ink-soft">
        Отвечать не обязательно. Можно просто побыть с этим вопросом.
      </p>
    </aside>
  )
}
