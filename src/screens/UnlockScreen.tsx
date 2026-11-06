import { useState, type FormEvent } from 'react'
import type { Account } from '../../shared/contract'
import { Button } from '../components/Button'
import { Notice } from '../components/Notice'
import { TextField } from '../components/TextField'
import { unlockWithPassword, type VaultKeys } from '../lib/crypto'

interface UnlockScreenProps {
  account: Account
  onUnlocked: (vault: VaultKeys) => void
  onLogOut: () => void
}

/**
 * Shown after a page reload: the session is still valid, but encryption keys
 * live only in memory, so the password is needed again. Unlocking happens
 * entirely in the browser.
 */
export function UnlockScreen({ account, onUnlocked, onLogOut }: UnlockScreenProps) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onUnlocked(await unlockWithPassword(password, account.keys))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не получилось открыть дневник.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <header className="space-y-3">
        <h1 className="font-serif text-3xl leading-tight sm:text-4xl">Дневник закрыт</h1>
        <p className="leading-relaxed text-ink-soft">
          Ключ шифрования не сохраняется между перезагрузками. Введите пароль для{' '}
          <span className="text-ink">{account.email}</span>, чтобы открыть записи.
        </p>
      </header>

      <TextField
        label="Пароль"
        type="password"
        autoComplete="current-password"
        autoFocus
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <Notice tone="error">{error}</Notice>}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={busy || password.length === 0}>
          {busy ? 'Открываю…' : 'Открыть дневник'}
        </Button>
        <Button variant="ghost" onClick={onLogOut}>
          Выйти из аккаунта
        </Button>
      </div>
    </form>
  )
}
