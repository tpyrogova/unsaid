import { AuthForm, type AuthMode } from '../components/AuthForm'
import { Button } from '../components/Button'
import type { UnlockedSession } from '../lib/auth'

export type { AuthMode }

interface AuthScreenProps {
  initialMode: AuthMode
  onAuthenticated: (session: UnlockedSession) => void
  onTryDemo: () => void
  onBack: () => void
}

export function AuthScreen({ initialMode, onAuthenticated, onTryDemo, onBack }: AuthScreenProps) {
  return (
    <div className="space-y-8">
      <Button variant="ghost" onClick={onBack}>
        ← На главную
      </Button>

      <header className="space-y-3">
        <h1 className="font-serif text-3xl leading-tight sm:text-4xl">
          Ваш дневник
        </h1>
        <p className="leading-relaxed text-ink-soft">
          Записи шифруются прямо в браузере. Сервер хранит только шифротекст и не может их прочитать.
        </p>
      </header>

      <AuthForm initialMode={initialMode} onAuthenticated={onAuthenticated} />

      <div className="border-t border-line pt-6">
        <Button variant="ghost" onClick={onTryDemo}>
          Попробовать без аккаунта →
        </Button>
      </div>
    </div>
  )
}
