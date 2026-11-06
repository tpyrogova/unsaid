import { useState, type FormEvent } from 'react'
import { logIn, MIN_PASSWORD_LENGTH, signUp, type UnlockedSession } from '../lib/auth'
import { Button } from './Button'
import { Notice } from './Notice'
import { TextField } from './TextField'

export type AuthMode = 'login' | 'signup'

interface AuthFormProps {
  initialMode: AuthMode
  initialEmail?: string
  onAuthenticated: (session: UnlockedSession) => void
  /** Overrides the submit label for sign-up (e.g. "Зашифровать и сохранить"). */
  signupLabel?: string
}

/** Login / sign-up form. Used on its own screen and inline in the import flow. */
export function AuthForm({ initialMode, initialEmail = '', onAuthenticated, signupLabel = 'Создать аккаунт' }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [acceptedNoRecovery, setAcceptedNoRecovery] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSignup = mode === 'signup'

  function validate(): string | null {
    if (!isSignup) return null
    if (password.length < MIN_PASSWORD_LENGTH) return `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов.`
    if (password !== confirm) return 'Пароли не совпадают.'
    if (!acceptedNoRecovery) return 'Подтвердите, что понимаете: пароль нельзя восстановить.'
    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setBusy(true)
    setError(null)
    try {
      const session = isSignup ? await signUp(email, password) : await logIn(email, password)
      onAuthenticated(session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не получилось. Попробуйте ещё раз.')
      setBusy(false)
    }
  }

  function switchMode(next: AuthMode) {
    setMode(next)
    setError(null)
    setConfirm('')
  }

  return (
    <div className="space-y-6">
      <div role="tablist" className="inline-flex rounded-full bg-sand p-1 text-sm">
        {(['login', 'signup'] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            type="button"
            aria-selected={mode === tab}
            onClick={() => switchMode(tab)}
            className={`rounded-full px-5 py-2 transition-colors ${mode === tab ? 'bg-card font-medium shadow-sm' : 'text-ink-soft hover:text-ink'}`}
          >
            {tab === 'login' ? 'Вход' : 'Регистрация'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Пароль"
          type="password"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          required
          minLength={isSignup ? MIN_PASSWORD_LENGTH : undefined}
          hint={isSignup ? `Минимум ${MIN_PASSWORD_LENGTH} символов. Длинная фраза надёжнее сложного слова.` : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {isSignup && (
          <>
            <TextField
              label="Пароль ещё раз"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <label className="flex gap-3 rounded-2xl bg-clay-soft/60 p-4 text-sm leading-relaxed">
              <input
                type="checkbox"
                checked={acceptedNoRecovery}
                onChange={(e) => setAcceptedNoRecovery(e.target.checked)}
                className="mt-1 size-4 shrink-0 accent-clay"
              />
              <span>
                Я понимаю: пароль — единственный ключ к записям. Если я его забуду, восстановить дневник
                не сможет никто, включая разработчиков.
              </span>
            </label>
          </>
        )}

        {error && <Notice tone="error">{error}</Notice>}

        <Button type="submit" disabled={busy} className="w-full sm:w-auto">
          {busy ? 'Готовлю ключи шифрования…' : isSignup ? signupLabel : 'Войти'}
        </Button>
      </form>
    </div>
  )
}
