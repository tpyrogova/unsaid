import { useState, type FormEvent, type ReactNode } from 'react'
import type { Account } from '../../shared/contract'
import { Button } from '../components/Button'
import { Notice } from '../components/Notice'
import { TextField } from '../components/TextField'
import { clearJournal, deleteAccount } from '../lib/auth'
import { pluralRu } from '../lib/format'

interface SettingsScreenProps {
  account: Account
  onBack: () => void
  onLogOut: () => void
  onJournalCleared: () => void
  onAccountDeleted: () => void
}

export function SettingsScreen({ account, onBack, onLogOut, onJournalCleared, onAccountDeleted }: SettingsScreenProps) {
  const [notice, setNotice] = useState<string | null>(null)

  return (
    <div className="space-y-10">
      <Button variant="ghost" onClick={onBack}>
        ← К дневнику
      </Button>

      <header className="space-y-2">
        <h1 className="font-serif text-3xl leading-tight sm:text-4xl">Настройки аккаунта</h1>
      </header>

      {notice && <Notice>{notice}</Notice>}

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-card p-6">
        <div>
          <p className="text-xs text-ink-soft">Email</p>
          <p className="mt-1 font-medium">{account.email}</p>
        </div>
        <Button variant="secondary" onClick={onLogOut}>
          Выйти
        </Button>
      </section>

      <section className="space-y-2 rounded-3xl bg-sage-soft/60 p-6 text-sm leading-relaxed">
        <p className="font-medium">Что хранится на сервере</p>
        <p className="text-ink-soft">
          Email, зашифрованные записи (прочитать их сервер не может), зашифрованный ключ, активные сессии и служебные
          счётчики без текста: лимиты запросов и отметки срабатываний протокола безопасности.
        </p>
      </section>

      <DangerAction
        title="Очистить дневник"
        description="Удалит все записи вместе с темами. Аккаунт и пароль останутся: можно заново загрузить дневник с iPhone. Записи, которые вы раньше удаляли как мусор, при новом импорте тоже вернутся."
        confirmLabel="Очистить дневник навсегда"
        onConfirm={async (password) => {
          const deleted = await clearJournal(account, password)
          setNotice(`Дневник очищен: удалено ${deleted} ${pluralRu(deleted, ['запись', 'записи', 'записей'])}.`)
          onJournalCleared()
        }}
      />

      <DangerAction
        title="Удалить аккаунт и все данные"
        description="Удалит email, все записи, ключи шифрования, сессии и служебные счётчики. Восстановить ничего не получится. Тексты, которые отправлялись модели на разбор, не хранились и раньше. Технические журналы запросов (например, IP-адреса) Cloudflare хранит по своей политике."
        confirmLabel="Удалить аккаунт навсегда"
        onConfirm={async (password) => {
          await deleteAccount(account, password)
          onAccountDeleted()
        }}
      >
        <p className="text-sm text-ink-soft">
          Перед удалением можно сохранить записи: они остаются в «Дневнике» на iPhone.
        </p>
      </DangerAction>
    </div>
  )
}

interface DangerActionProps {
  title: string
  description: string
  confirmLabel: string
  onConfirm: (password: string) => Promise<void>
  children?: ReactNode
}

/**
 * Two steps for anything irreversible: open the section, then confirm with the
 * password (checked by the server via the re-derived authKey).
 */
function DangerAction({ title, description, confirmLabel, onConfirm, children }: DangerActionProps) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function close() {
    setOpen(false)
    setPassword('')
    setError(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onConfirm(password)
      close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не получилось. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4 rounded-3xl border border-clay/30 p-6">
      <div className="space-y-2">
        <h2 className="font-serif text-xl">{title}</h2>
        <p className="text-sm leading-relaxed text-ink-soft">{description}</p>
        {children}
      </div>

      {open ? (
        <form onSubmit={submit} className="space-y-4">
          <TextField
            label="Пароль для подтверждения"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error && <Notice tone="error">{error}</Notice>}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy || password.length === 0}
              className="rounded-full bg-clay-deep px-6 py-3 font-medium text-card transition-colors hover:bg-ink focus-visible:ring-4 focus-visible:ring-clay/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Проверяю пароль…' : confirmLabel}
            </button>
            <Button variant="ghost" onClick={close} disabled={busy}>
              Отмена
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          {title}
        </Button>
      )}
    </section>
  )
}
