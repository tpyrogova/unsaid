import { getLang } from '../i18n'

const formatters = {
  ru: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
  en: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
}

/**
 * "2026-10-24" → "24 октября 2026 г." / "24 October 2026", in the UI language.
 * Parsed as a calendar date, so there is no timezone shift.
 */
export function formatEntryDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return formatters[getLang()].format(new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1))
}

/** Today's calendar date in the user's timezone, `YYYY-MM-DD`. */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
