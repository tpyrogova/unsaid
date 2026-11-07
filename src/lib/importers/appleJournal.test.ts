// @vitest-environment jsdom
import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import {
  NotJournalExportError,
  parseAppleJournalEntry,
  parseHeaderDate,
  readAppleJournalZip,
  type ImportedEntry,
} from './appleJournal'
import FIXTURE from './__fixtures__/apple-journal-entry.html?raw'

// The real export names this file a day *earlier* than its header date.
const FIXTURE_PATH = 'AppleJournalEntries/Entries/2026-08-13_Ранок_у_парку.html'

function parseFixture(path = FIXTURE_PATH, html = FIXTURE): ImportedEntry {
  const result = parseAppleJournalEntry(path, html)
  if ('reason' in result) throw new Error(`unexpected skip: ${result.reason}`)
  return result
}

describe('parseHeaderDate', () => {
  it.each([
    ['пʼятниця, 14 серпня 2026 р.', '2026-08-14'],
    ['четверг, 1 января 2026 г.', '2026-01-01'],
    ['Saturday, October 24, 2026', '2026-10-24'],
  ])('%s → %s', (header, expected) => {
    expect(parseHeaderDate(header)).toBe(expected)
  })

  it('returns null for unrecognized text', () => {
    expect(parseHeaderDate('без даты')).toBeNull()
  })
})

describe('parseAppleJournalEntry', () => {
  it('takes the date from the header, not the file name', () => {
    expect(parseFixture().date).toBe('2026-08-14')
  })

  it('extracts title, media count and a stable source key', () => {
    const entry = parseFixture()
    expect(entry.title).toBe('Ранок у парку')
    expect(entry.mediaCount).toBe(2)
    expect(entry.sourceKey).toBe('apple-journal:2026-08-13_Ранок_у_парку')
  })

  it('turns paragraphs and lists into plain text, collapsing extra blank lines', () => {
    expect(parseFixture().text).toBe(
      [
        'Прокинулась раньше будильника и пошла гулять.',
        'Думала о разговоре с братом.',
        '',
        'Что хочу сказать:',
        '• что скучаю',
        '• что не обижаюсь',
        '',
        'План на выходные:',
        '1. позвонить',
        '2. выспаться',
      ].join('\n'),
    )
  })

  it('normalizes macOS (NFD) file names so ids match across sources', () => {
    const nfd = parseFixture(FIXTURE_PATH.normalize('NFD'))
    expect(nfd.sourceKey).toBe(parseFixture().sourceKey)
  })

  it('falls back to the file-name date when the header is missing', () => {
    const entry = parseFixture(FIXTURE_PATH, FIXTURE.replace('пʼятниця, 14 серпня 2026 р.', ''))
    expect(entry.date).toBe('2026-08-13')
  })

  it('skips media-only entries with a reason instead of throwing', () => {
    const mediaOnly = FIXTURE.replace(/(<div class='bodyText'>)[\s\S]*(<p class="p1"><span class="s1"><\/div>)/, '$1$2')
    expect(parseAppleJournalEntry(FIXTURE_PATH, mediaOnly)).toEqual({
      file: '2026-08-13_Ранок_у_парку',
      reason: 'mediaOnly',
    })
  })
})

describe('readAppleJournalZip', () => {
  it('reads only Entries/*.html, ignoring __MACOSX and Resources', async () => {
    const zip = zipSync({
      'AppleJournalEntries/index.html': strToU8('<html></html>'),
      [FIXTURE_PATH]: strToU8(FIXTURE),
      'AppleJournalEntries/Entries/2026-08-15.html': strToU8(FIXTURE.replace('14 серпня', '15 серпня')),
      '__MACOSX/AppleJournalEntries/Entries/._2026-08-15.html': strToU8('junk'),
      'AppleJournalEntries/Resources/11111111-1111-4111-8111-111111111111.heic': new Uint8Array(1024),
    })

    const result = await readAppleJournalZip(zip)

    expect(result.skipped).toEqual([])
    // Newest first.
    expect(result.entries.map((e) => e.date)).toEqual(['2026-08-15', '2026-08-14'])
  })

  it('explains when the archive is not a Journal export', async () => {
    await expect(readAppleJournalZip(zipSync({ 'notes.txt': strToU8('hi') }))).rejects.toBeInstanceOf(
      NotJournalExportError,
    )
  })
})
