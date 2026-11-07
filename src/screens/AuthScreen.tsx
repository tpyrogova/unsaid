import { AuthForm, type AuthMode } from '../components/AuthForm'
import { Button } from '../components/Button'
import { useI18n } from '../i18n'
import type { UnlockedSession } from '../lib/auth'

export type { AuthMode }

interface AuthScreenProps {
  initialMode: AuthMode
  onAuthenticated: (session: UnlockedSession) => void
  onTryDemo: () => void
  onBack: () => void
}

export function AuthScreen({ initialMode, onAuthenticated, onTryDemo, onBack }: AuthScreenProps) {
  const { t } = useI18n()
  return (
    <div className="space-y-8">
      <Button variant="ghost" onClick={onBack}>
        {t.common.backHome}
      </Button>

      <header className="space-y-3">
        <h1 className="font-serif text-3xl leading-tight sm:text-4xl">
          {t.auth.screenTitle}
        </h1>
        <p className="leading-relaxed text-ink-soft">
          {t.auth.screenLead}
        </p>
      </header>

      <AuthForm initialMode={initialMode} onAuthenticated={onAuthenticated} />

      <div className="border-t border-line pt-6">
        <Button variant="ghost" onClick={onTryDemo}>
          {t.auth.tryDemo}
        </Button>
      </div>
    </div>
  )
}
