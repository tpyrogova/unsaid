import { useState, type ChangeEvent } from 'react'
import { AuthForm } from '../components/AuthForm'
import { Button } from '../components/Button'
import { Notice } from '../components/Notice'
import type { UnlockedSession } from '../lib/auth'
import type { VaultKeys } from '../lib/crypto'
import { formatEntryDate, pluralRu } from '../lib/format'
import { readAppleJournalZip, type ImportResult } from '../lib/importers/appleJournal'
import { saveImportedEntries, type UploadProgress } from '../lib/journal'

type ImportState =
  | { step: 'pick' }
  | { step: 'reading' }
  | { step: 'preview'; result: ImportResult }
  | { step: 'saving'; result: ImportResult; progress: UploadProgress }
  | { step: 'done'; inserted: number; total: number }

interface ImportScreenProps {
  /** `null` for guests: the file is parsed first, the account is created at the end. */
  vault: VaultKeys | null
  /** Known email when the session exists but is locked (after a reload). */
  lockedEmail?: string
  onAuthenticated: (session: UnlockedSession) => void
  onBack: () => void
  backLabel: string
  onImported: () => void
}

const entriesWord = (n: number) => pluralRu(n, ['запись', 'записи', 'записей'])

export function ImportScreen({ vault, lockedEmail, onAuthenticated, onBack, backLabel, onImported }: ImportScreenProps) {
  const [state, setState] = useState<ImportState>({ step: 'pick' })
  const [error, setError] = useState<string | null>(null)

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError(null)
    setState({ step: 'reading' })
    try {
      const result = await readAppleJournalZip(new Uint8Array(await file.arrayBuffer()))
      setState({ step: 'preview', result })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось прочитать архив.')
      setState({ step: 'pick' })
    }
  }

  async function save(keys: VaultKeys, result: ImportResult) {
    setError(null)
    const total = result.entries.length
    setState({ step: 'saving', result, progress: { done: 0, total } })
    try {
      const { inserted } = await saveImportedEntries(keys, result.entries, (progress) =>
        setState({ step: 'saving', result, progress }),
      )
      setState({ step: 'done', inserted, total })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить записи.')
      setState({ step: 'preview', result })
    }
  }

  /** Guest flow: account is created right after the preview, then saving starts. */
  function handleAuthenticated(session: UnlockedSession, result: ImportResult) {
    onAuthenticated(session)
    void save(session.vault, result)
  }

  return (
    <div className="space-y-8">
      <Button variant="ghost" onClick={onBack} disabled={state.step === 'saving'}>
        ← {backLabel}
      </Button>

      <header className="space-y-3">
        <h1 className="font-serif text-3xl leading-tight sm:text-4xl">Загрузите ваш дневник с iPhone</h1>
        <p className="leading-relaxed text-ink-soft">
          Переписывать ничего не нужно: выберите файл, который «Дневник» сохраняет при экспорте, и все
          записи окажутся здесь. Файл читается прямо в браузере, фото и видео не загружаются.
        </p>
        <p className="leading-relaxed text-ink-soft">
          Уже загружали раньше? Загрузите свежий экспорт: добавятся только новые записи, а уже сохранённые
          (с темами и вашими записями, сделанными здесь) не изменятся.
        </p>
      </header>

      {error && <Notice tone="error">{error}</Notice>}

      {(state.step === 'pick' || state.step === 'reading') && (
        <>
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-clay/40 bg-card px-6 py-14 text-center transition-colors hover:border-clay has-focus-visible:border-clay">
            <span className="font-serif text-xl">
              {state.step === 'reading' ? 'Читаю архив…' : 'Выбрать файл дневника'}
            </span>
            <span className="text-sm text-ink-soft">AppleJournalEntries.zip</span>
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={handleFile}
              disabled={state.step === 'reading'}
              className="sr-only"
            />
          </label>
          <ExportHowTo />
        </>
      )}

      {state.step === 'preview' && (
        <>
          <ImportSummary result={state.result} />
          {vault ? (
            <div className="flex flex-wrap items-center gap-4">
              <Button onClick={() => save(vault, state.result)} disabled={state.result.entries.length === 0}>
                Зашифровать и сохранить
              </Button>
              <Button variant="ghost" onClick={() => setState({ step: 'pick' })}>
                Выбрать другой файл
              </Button>
            </div>
          ) : (
            <section className="space-y-5 rounded-3xl border border-line bg-card p-6 sm:p-8">
              <div className="space-y-2">
                <h2 className="font-serif text-2xl">Последний шаг: придумайте пароль</h2>
                <p className="leading-relaxed text-ink-soft">
                  Из пароля прямо на вашем устройстве создаётся ключ шифрования. Без него сохранить
                  записи так, чтобы их не мог прочитать никто, кроме вас, не получится.
                </p>
              </div>
              <AuthForm
                initialMode={lockedEmail ? 'login' : 'signup'}
                initialEmail={lockedEmail}
                signupLabel="Зашифровать и сохранить"
                onAuthenticated={(session) => handleAuthenticated(session, state.result)}
              />
            </section>
          )}
        </>
      )}

      {state.step === 'saving' && (
        <>
          <ImportSummary result={state.result} />
          <div className="space-y-2" role="status">
            <div className="h-2 overflow-hidden rounded-full bg-sand">
              <div
                className="h-full rounded-full bg-sage transition-[width]"
                style={{ width: `${Math.round((state.progress.done / Math.max(state.progress.total, 1)) * 100)}%` }}
              />
            </div>
            <p className="text-sm text-ink-soft">
              Шифрую и сохраняю: {state.progress.done} из {state.progress.total}
            </p>
          </div>
        </>
      )}

      {state.step === 'done' && (
        <div className="space-y-6">
          <Notice>
            Готово. Добавлено {state.inserted} {entriesWord(state.inserted)}
            {state.inserted < state.total && `, ещё ${state.total - state.inserted} уже были в дневнике`}.
          </Notice>
          <Button onClick={onImported}>Открыть дневник</Button>
        </div>
      )}
    </div>
  )
}

/** Official path: Settings → Apps → Journal → Export (support.apple.com/121822). */
function ExportHowTo() {
  const steps = ['Откройте «Настройки» на iPhone', '«Приложения» → «Дневник»', 'Нажмите «Экспорт» и дождитесь окончания']
  return (
    <div className="space-y-3 rounded-3xl bg-sand/60 p-6">
      <p className="font-medium">Где взять файл</p>
      <ol className="space-y-2 text-ink-soft">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3">
            <span className="font-serif text-clay-deep">{i + 1}.</span>
            {step}
          </li>
        ))}
      </ol>
      <p className="text-sm text-ink-soft">
        Файл AppleJournalEntries.zip появится в приложении «Файлы». Если пункта «Экспорт» нет, обновите iOS.
      </p>
    </div>
  )
}

function ImportSummary({ result }: { result: ImportResult }) {
  const { entries, skipped } = result
  const newest = entries[0]
  const oldest = entries.at(-1)
  const withMedia = entries.filter((entry) => entry.mediaCount > 0).length

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-4 rounded-3xl bg-card p-6 sm:grid-cols-3">
        <Stat label="Найдено" value={`${entries.length} ${entriesWord(entries.length)}`} />
        {oldest && newest && (
          <Stat label="Период" value={`${formatEntryDate(oldest.date)} — ${formatEntryDate(newest.date)}`} wide />
        )}
        {withMedia > 0 && <Stat label="С медиа (не импортируются)" value={String(withMedia)} />}
        {skipped.length > 0 && <Stat label="Пропущено" value={String(skipped.length)} />}
      </dl>
      {skipped.length > 0 && (
        <details className="text-sm text-ink-soft">
          <summary className="cursor-pointer">Почему пропущены некоторые файлы</summary>
          <ul className="mt-2 space-y-1">
            {skipped.map((skip) => (
              <li key={skip.file}>
                {skip.file}: {skip.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function Stat({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="mt-1 font-serif text-lg">{value}</dd>
    </div>
  )
}
