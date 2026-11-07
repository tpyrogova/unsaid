import { LANGS, useI18n } from '../i18n'

/** RU / EN segmented switch. */
export function LanguageSwitch() {
  const { lang, setLang, t } = useI18n()
  return (
    <div role="group" aria-label={t.common.language} className="flex rounded-full bg-sand p-0.5 text-xs font-medium">
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
          className={`rounded-full px-2.5 py-1.5 uppercase transition-colors focus-visible:ring-2 focus-visible:ring-clay/30 focus-visible:outline-none ${
            lang === code ? 'bg-card text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  )
}
