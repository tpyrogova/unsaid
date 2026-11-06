import { describe, expect, it } from 'vitest'
import { entryReviewSchema, MAX_PERIOD_TOTAL_CHARS } from '../../shared/analysis'
import mockReview from '../mocks/analysis.json'
import { SAMPLE_ENTRY } from '../mocks/sampleEntry'
import type { JournalEntry } from '../types/journal'
import { entriesInPeriod, prepareForPeriod } from './api'

const entry = (date: string, text: string): JournalEntry => ({
  id: `id-${date}-${text.length}`,
  date,
  title: null,
  text,
  source: 'apple-journal',
  mediaCount: 0,
})

describe('demo mock', () => {
  it('matches the review schema and quotes the sample entry verbatim', () => {
    const review = entryReviewSchema.parse(mockReview)
    for (const { quote } of [...review.feelings, ...review.distortions]) expect(SAMPLE_ENTRY).toContain(quote)
  })
})

describe('entriesInPeriod', () => {
  const entries = [entry('2026-11-05', 'a'), entry('2026-10-10', 'b'), entry('2025-01-01', 'c')]
  const today = new Date(2026, 10, 6)

  it('filters by calendar date relative to today', () => {
    expect(entriesInPeriod(entries, 'week', today).map((e) => e.text)).toEqual(['a'])
    expect(entriesInPeriod(entries, 'month', today).map((e) => e.text)).toEqual(['a', 'b'])
    expect(entriesInPeriod(entries, 'all', today)).toHaveLength(3)
  })
})

describe('prepareForPeriod', () => {
  it('keeps everything when it fits', () => {
    expect(prepareForPeriod([entry('2026-01-01', 'короткая')])).toEqual([{ date: '2026-01-01', text: 'короткая' }])
  })

  it('trims only the long entries to a shared cap, so short ones survive intact', () => {
    const short = entry('2026-01-01', 'коротко')
    const long = Array.from({ length: 10 }, (_, i) => entry(`2026-02-0${i}`, 'я'.repeat(30_000)))
    const prepared = prepareForPeriod([short, ...long])
    const total = prepared.reduce((sum, item) => sum + item.text.length, 0)

    expect(total).toBeLessThanOrEqual(MAX_PERIOD_TOTAL_CHARS)
    expect(prepared[0]?.text).toBe('коротко')
    expect(prepared).toHaveLength(11)
  })
})
