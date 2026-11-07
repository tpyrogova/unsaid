import type { AnalyzeResponse } from '../../shared/analysis'
import { useI18n } from '../i18n'

type Contacts = Extract<AnalyzeResponse, { kind: 'crisis' }>['contacts']

/**
 * Safety protocol, level 2: no review. The wording is fixed (not generated)
 * and contacts come from config/crisis-contacts.ts.
 */
export function CrisisView({ contacts }: { contacts: Contacts }) {
  const { t, lang } = useI18n()
  return (
    <article className="space-y-8">
      <header className="space-y-4">
        <h1 className="font-serif text-3xl leading-tight sm:text-4xl">{t.crisis.title}</h1>
        <p className="font-serif text-xl leading-relaxed">{t.crisis.lead}</p>
        <p className="leading-relaxed text-ink-soft">{t.crisis.body}</p>
      </header>

      {contacts.map(({ country, contacts: list }) => (
        <section key={country.en} className="space-y-3">
          <h2 className="font-serif text-xl">{country[lang]}</h2>
          <ul className="space-y-3">
            {list.map((contact) => (
              <li key={contact.name.en} className="space-y-1 rounded-2xl border border-line bg-card p-5">
                <p className="font-medium">{contact.name[lang]}</p>
                {contact.phone && contact.tel && (
                  <a href={`tel:${contact.tel}`} className="block font-serif text-2xl text-clay-deep underline-offset-4 hover:underline">
                    {contact.phone}
                  </a>
                )}
                {contact.url && (
                  <a href={contact.url} target="_blank" rel="noreferrer" className="block text-sm text-clay-deep underline">
                    {contact.phone ? t.crisis.chatAndMail : t.crisis.openChat}
                  </a>
                )}
                <p className="text-sm text-ink-soft">{contact.note[lang]}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="text-sm leading-relaxed text-ink-soft">{t.crisis.closing}</p>
    </article>
  )
}
