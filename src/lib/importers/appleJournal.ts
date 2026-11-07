/**
 * Parser for Apple Journal's "Export" (a zip with `Entries/*.html`).
 *
 * Format notes (observed on a real iOS export, Cocoa HTML Writer):
 * - one HTML file per entry: `Entries/2026-10-24.html`, `…_(1).html` for
 *   several entries per day, `…_<Title>.html` when the entry has a title;
 * - `.pageHeader` holds the localized date ("субота, 24 жовтня 2026 р.").
 *   It is the source of truth: the file-name date can be a day earlier;
 * - `.title` is the optional title, `.bodyText` holds `<p>`, `<ul>`, `<ol>`;
 *   empty `<p>` elements are blank lines;
 * - media live in `.assetGrid .gridItem` and in `Resources/` (skipped for now).
 *
 * Everything runs in the browser; the export is never uploaded unencrypted.
 */
import { unzip, type UnzipFileInfo } from 'fflate'

export interface ImportedEntry {
  /** Stable key of the source file, used to derive a dedup id. */
  sourceKey: string
  date: string
  title: string | null
  text: string
  mediaCount: number
}

/** Why a file was skipped; the UI turns the code into text. */
export type SkipReason = 'noBody' | 'noDate' | 'mediaOnly' | 'empty'

export interface ImportSkip {
  file: string
  reason: SkipReason
}

/** The archive is not an iPhone Journal export. */
export class NotJournalExportError extends Error {
  constructor() {
    super('No Entries/*.html files in the archive')
    this.name = 'NotJournalExportError'
  }
}

export interface ImportResult {
  entries: ImportedEntry[]
  skipped: ImportSkip[]
}

const MONTHS: Record<string, number> = {
  // Ukrainian (genitive)
  січня: 1, лютого: 2, березня: 3, квітня: 4, травня: 5, червня: 6,
  липня: 7, серпня: 8, вересня: 9, жовтня: 10, листопада: 11, грудня: 12,
  // Russian (genitive)
  января: 1, февраля: 2, марта: 3, апреля: 4, мая: 5, июня: 6,
  июля: 7, августа: 8, сентября: 9, октября: 10, ноября: 11, декабря: 12,
  // English
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}

const ENTRY_PATH = /(^|\/)Entries\/[^/]+\.html$/

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** "субота, 24 жовтня 2026 р." / "Saturday, October 24, 2026" → "2026-10-24". */
export function parseHeaderDate(header: string): string | null {
  const words = header.toLowerCase().match(/[\p{L}ʼ']+|\d+/gu) ?? []
  const year = words.find((w) => /^\d{4}$/.test(w))
  const day = words.find((w) => /^\d{1,2}$/.test(w))
  const month = words.map((w) => MONTHS[w]).find((m) => m !== undefined)
  if (!year || !day || !month) return null
  return `${year}-${pad(month)}-${pad(Number(day))}`
}

function dateFromFileName(fileName: string): string | null {
  return fileName.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null
}

function cleanLine(text: string | null): string {
  return (text ?? '').replace(/ /g, ' ').replace(/[ \t]+$/g, '').trim()
}

function blockToLines(block: Element): string[] {
  if (block.tagName === 'UL' || block.tagName === 'OL') {
    const ordered = block.tagName === 'OL'
    return Array.from(block.querySelectorAll(':scope > li'), (li, i) =>
      `${ordered ? `${i + 1}.` : '•'} ${cleanLine(li.textContent)}`,
    )
  }
  return [cleanLine(block.textContent)]
}

function extractBody(bodyText: Element): string {
  return Array.from(bodyText.children)
    .flatMap(blockToLines)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function baseName(path: string): string {
  return (path.split('/').pop() ?? path).replace(/\.html$/, '')
}

/**
 * Parses one entry file. Returns a skip reason instead of throwing, so one
 * broken file does not abort the whole import.
 */
export function parseAppleJournalEntry(
  path: string,
  html: string,
  parser: DOMParser = new DOMParser(),
): ImportedEntry | ImportSkip {
  // macOS stores file names in NFD; normalize so ids are stable across sources.
  const fileName = baseName(path).normalize('NFC')
  const doc = parser.parseFromString(html, 'text/html')

  const bodyText = doc.querySelector('.bodyText')
  if (!bodyText) return { file: fileName, reason: 'noBody' }

  const header = cleanLine(doc.querySelector('.pageHeader')?.textContent ?? '')
  const date = parseHeaderDate(header) ?? dateFromFileName(fileName)
  if (!date) return { file: fileName, reason: 'noDate' }

  const text = extractBody(bodyText)
  const mediaCount = doc.querySelectorAll('.assetGrid .gridItem').length
  if (!text) return { file: fileName, reason: mediaCount > 0 ? 'mediaOnly' : 'empty' }

  return {
    sourceKey: `apple-journal:${fileName}`,
    date,
    title: cleanLine(doc.querySelector('.title')?.textContent ?? '') || null,
    text,
    mediaCount,
  }
}

function isSkip(value: ImportedEntry | ImportSkip): value is ImportSkip {
  return 'reason' in value
}

/** Parses already-extracted entry files (path → HTML). */
export function parseAppleJournalFiles(files: Iterable<[path: string, html: string]>): ImportResult {
  const parser = new DOMParser()
  const result: ImportResult = { entries: [], skipped: [] }
  for (const [path, html] of files) {
    const parsed = parseAppleJournalEntry(path, html, parser)
    if (isSkip(parsed)) result.skipped.push(parsed)
    else result.entries.push(parsed)
  }
  result.entries.sort((a, b) => b.date.localeCompare(a.date) || a.sourceKey.localeCompare(b.sourceKey))
  return result
}

/**
 * Reads the export zip. Only `Entries/*.html` are decompressed; photos and
 * videos (most of the archive's size) are skipped without being inflated.
 */
export async function readAppleJournalZip(data: Uint8Array): Promise<ImportResult> {
  const isEntryFile = (file: UnzipFileInfo) =>
    ENTRY_PATH.test(file.name) && !file.name.startsWith('__MACOSX/')

  const files = await new Promise<Record<string, Uint8Array>>((resolve, reject) =>
    unzip(data, { filter: isEntryFile }, (error, unzipped) =>
      error ? reject(error) : resolve(unzipped),
    ),
  )

  const paths = Object.keys(files)
  if (paths.length === 0) {
    throw new NotJournalExportError()
  }

  const decoder = new TextDecoder()
  return parseAppleJournalFiles(
    paths.map((path): [string, string] => [path, decoder.decode(files[path])]),
  )
}
