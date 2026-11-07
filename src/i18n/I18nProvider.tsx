import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { I18nContext } from './context'
import { DICTIONARIES, getLang, persistLang, type Lang } from './lang'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getLang)

  const setLang = useCallback((next: Lang) => {
    persistLang(next)
    setLangState(next)
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = DICTIONARIES[lang].meta.title
  }, [lang])

  const value = useMemo(() => ({ lang, t: DICTIONARIES[lang], setLang }), [lang, setLang])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
