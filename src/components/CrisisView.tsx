import type { AnalyzeResponse } from '../../shared/analysis'

type Contacts = Extract<AnalyzeResponse, { kind: 'crisis' }>['contacts']

/**
 * Safety protocol, level 2: no review. The wording is fixed (not generated)
 * and contacts come from config/crisis-contacts.ts.
 */
export function CrisisView({ contacts }: { contacts: Contacts }) {
  return (
    <article className="space-y-8">
      <header className="space-y-4">
        <h1 className="font-serif text-3xl leading-tight sm:text-4xl">Давай сейчас без разбора</h1>
        <p className="font-serif text-xl leading-relaxed">
          В записях есть слова, из-за которых за тебя тревожно. Сейчас важнее не анализ, а то, как ты себя
          чувствуешь и в безопасности ли ты прямо сейчас.
        </p>
        <p className="leading-relaxed text-ink-soft">
          Если есть хоть небольшая вероятность, что ты можешь причинить себе вред, пожалуйста, свяжись с людьми,
          которые умеют помочь в такие моменты. Это бесплатно и анонимно. Можно позвонить и просто сказать, что тебе
          очень тяжело.
        </p>
      </header>

      {contacts.map(({ country, contacts: list }) => (
        <section key={country} className="space-y-3">
          <h2 className="font-serif text-xl">{country}</h2>
          <ul className="space-y-3">
            {list.map((contact) => (
              <li key={contact.name} className="space-y-1 rounded-2xl border border-line bg-card p-5">
                <p className="font-medium">{contact.name}</p>
                {contact.phone && contact.tel && (
                  <a href={`tel:${contact.tel}`} className="block font-serif text-2xl text-clay-deep underline-offset-4 hover:underline">
                    {contact.phone}
                  </a>
                )}
                {contact.url && (
                  <a href={contact.url} target="_blank" rel="noreferrer" className="block text-sm text-clay-deep underline">
                    {contact.phone ? 'Чат и почта' : 'Открыть чат'}
                  </a>
                )}
                <p className="text-sm text-ink-soft">{contact.note}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="text-sm leading-relaxed text-ink-soft">
        Если рядом есть человек, которому ты доверяешь, можно написать ему прямо сейчас. Не нужно справляться с этим
        в одиночку.
      </p>
    </article>
  )
}
