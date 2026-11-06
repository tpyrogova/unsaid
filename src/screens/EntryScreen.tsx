import type { FormEvent } from 'react'

interface EntryScreenProps {
  text: string
  onTextChange: (text: string) => void
  onSubmit: () => void
}

export function EntryScreen({ text, onTextChange, onSubmit }: EntryScreenProps) {
  const isEmpty = text.trim().length === 0

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isEmpty) onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <header className="space-y-3">
        <h1 className="font-serif text-3xl leading-tight sm:text-4xl">Что сегодня на душе?</h1>
        <p className="leading-relaxed text-ink-soft">
          Напишите как есть, без редактуры. Разбор покажет эмоции, потребности и привычные
          способы думать, каждый раз со ссылкой на ваши собственные слова.
        </p>
      </header>

      <label className="block">
        <span className="sr-only">Запись в дневнике</span>
        <textarea
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          rows={12}
          placeholder="Сегодня я…"
          className="block min-h-[50dvh] w-full resize-y rounded-2xl border border-line bg-card p-5 font-serif text-lg leading-relaxed shadow-[0_1px_0_rgba(59,47,42,0.04)] placeholder:text-ink-soft/60 focus:border-clay focus:ring-4 focus:ring-clay/15 focus:outline-none"
        />
      </label>

      <div className="flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-soft">Текст остаётся только в этой вкладке.</p>
        <button
          type="submit"
          disabled={isEmpty}
          className="rounded-full bg-clay px-8 py-3.5 font-medium text-card transition-colors hover:bg-clay-deep focus-visible:ring-4 focus-visible:ring-clay/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          Разобрать
        </button>
      </div>
    </form>
  )
}
