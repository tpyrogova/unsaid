/**
 * Minimal, typed i18n: `en` must have exactly the shape of `ru`, so a missing
 * or misspelled string is a compile error. Components read texts as plain
 * properties (`t.landing.hero.title`); non-React code uses `dict()`.
 *
 * The choice is stored in localStorage: a UI preference, never journal data.
 */
import { en } from './en'
import { ru, type Dictionary } from './ru'

export type Lang = 'ru' | 'en'
export const LANGS: Lang[] = ['ru', 'en']
export const DICTIONARIES: Record<Lang, Dictionary> = { ru, en }
const STORAGE_KEY = 'unsaid.lang'

function detectLang(): Lang {
  if (typeof window === 'undefined') return 'ru'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'ru' || saved === 'en') return saved
  // Russian UI for ru/uk/be browsers, English for everyone else.
  return /^(ru|uk|be)\b/i.test(window.navigator.language) ? 'ru' : 'en'
}

let currentLang: Lang = detectLang()

/** Current language for non-React code (API headers, error messages). */
export function getLang(): Lang {
  return currentLang
}

/** Current dictionary for non-React code. */
export function dict(): Dictionary {
  return DICTIONARIES[currentLang]
}

export function persistLang(lang: Lang): void {
  currentLang = lang
  window.localStorage.setItem(STORAGE_KEY, lang)
}
