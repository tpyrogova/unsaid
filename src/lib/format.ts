const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** "2026-10-24" → "24 октября 2026 г." (parsed as a calendar date, no timezone shift). */
export function formatEntryDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return dateFormatter.format(new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1))
}

export function pluralRu(n: number, forms: [one: string, few: string, many: string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

/** Today's calendar date in the user's timezone, `YYYY-MM-DD`. */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
