import { useEffect, useState } from 'react'
import type { Account } from '../shared/contract'
import { AccountMenu } from './components/AccountMenu'
import { Logo } from './components/Logo'
import { Notice } from './components/Notice'
import { fetchCurrentAccount, logOut, type UnlockedSession } from './lib/auth'
import { saveManualEntry } from './lib/journal'
import type { VaultKeys } from './lib/crypto'
import { SAMPLE_ENTRY } from './mocks/sampleEntry'
import { AnalysisScreen } from './screens/AnalysisScreen'
import { AnalyzePeriodScreen } from './screens/AnalyzePeriodScreen'
import { AuthScreen, type AuthMode } from './screens/AuthScreen'
import { CategorizeScreen } from './screens/CategorizeScreen'
import { EntryDetailScreen } from './screens/EntryDetailScreen'
import { ImportScreen } from './screens/ImportScreen'
import { JournalScreen } from './screens/JournalScreen'
import { LandingPage } from './screens/LandingPage'
import { SettingsScreen } from './screens/SettingsScreen'
import { UnlockScreen } from './screens/UnlockScreen'
import { WriteScreen } from './screens/WriteScreen'
import type { JournalEntry } from './types/journal'

/**
 * Encryption keys exist only in this state (memory). A reload drops them,
 * which is why a valid session without keys is "locked", not "unlocked".
 */
type Session =
  | { status: 'checking' }
  | { status: 'anonymous' }
  | { status: 'locked'; account: Account }
  | { status: 'unlocked'; account: Account; vault: VaultKeys }

type View =
  | { name: 'home' }
  /** The landing page, reachable from the logo by everyone. */
  | { name: 'landing' }
  | { name: 'settings' }
  | { name: 'auth'; mode: AuthMode }
  | { name: 'import' }
  | { name: 'entry'; entry: JournalEntry }
  /** `demo`: the sample entry analysed with the mock, even when signed in. */
  | { name: 'write'; demo: boolean }
  | { name: 'categorize'; entries: JournalEntry[] }
  | { name: 'analyze-period'; entries: JournalEntry[] }
  | { name: 'analysis'; text: string; demo: boolean; back: View; backLabel: string }

const HOME: View = { name: 'home' }

export default function App() {
  const [session, setSession] = useState<Session>({ status: 'checking' })
  const [view, setView] = useState<View>(HOME)
  const [draft, setDraft] = useState('')
  const [bootError, setBootError] = useState<string | null>(null)
  /** One-off confirmation shown on the landing page (e.g. after account deletion). */
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    fetchCurrentAccount()
      .then((account) => setSession(account ? { status: 'locked', account } : { status: 'anonymous' }))
      .catch((error: unknown) => {
        setBootError(error instanceof Error ? error.message : 'Сервер недоступен')
        setSession({ status: 'anonymous' })
      })
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [view])

  function handleAuthenticated({ account, vault }: UnlockedSession) {
    setBootError(null)
    setFlash(null)
    setSession({ status: 'unlocked', account, vault })
    setView(HOME)
  }

  async function handleLogOut() {
    setSession({ status: 'anonymous' })
    setView(HOME)
    // Even if the request fails, local keys are already gone.
    await logOut().catch(() => undefined)
  }

  function startWriting(text: string, demo: boolean) {
    setDraft(text)
    setView({ name: 'write', demo })
  }

  const goToLanding = () => setView({ name: 'landing' })
  const account = session.status === 'unlocked' || session.status === 'locked' ? session.account : null
  const accountMenu = account && (
    <AccountMenu
      email={account.email}
      onOpenJournal={() => setView(HOME)}
      onOpenSettings={() => setView({ name: 'settings' })}
      onLogOut={handleLogOut}
    />
  )

  // The landing page has its own full-width layout.
  if (view.name === 'landing' || (session.status === 'anonymous' && view.name === 'home')) {
    return (
      <>
        {bootError && (
          <div className="mx-auto max-w-6xl px-5 pt-4 sm:px-8">
            <Notice tone="error">Не удалось связаться с сервером: {bootError}. Демо-режим работает и без него.</Notice>
          </div>
        )}
        {flash && (
          <div className="mx-auto max-w-6xl px-5 pt-4 sm:px-8">
            <Notice>{flash}</Notice>
          </div>
        )}
        <LandingPage
          onSignUp={() => setView({ name: 'auth', mode: 'signup' })}
          onLogIn={() => setView({ name: 'auth', mode: 'login' })}
          onImport={() => setView({ name: 'import' })}
          onTryDemo={() => startWriting(SAMPLE_ENTRY, true)}
          onHome={goToLanding}
          accountMenu={accountMenu}
        />
      </>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 py-10 sm:px-8 sm:py-16">
      <header className="mb-12 flex items-center justify-between gap-4">
        <Logo onClick={goToLanding} />
        {accountMenu}
      </header>

      <main className="flex-1 space-y-6">
        {renderScreen()}
      </main>

      <footer className="mt-16 border-t border-line pt-6 text-xs leading-relaxed text-ink-soft">
        Unsaid не заменяет психолога. Если вам тяжело, пожалуйста, обратитесь к специалисту или
        к близкому человеку.
      </footer>
    </div>
  )

  function renderScreen() {
    // Screens available regardless of the session.
    if (view.name === 'write') {
      return (
        <WriteScreen
          text={draft}
          onTextChange={setDraft}
          onBack={() => setView(view.demo ? { name: 'landing' } : HOME)}
          backLabel={view.demo ? 'На главную' : 'К дневнику'}
          onAnalyzeOnly={() =>
            setView({ name: 'analysis', text: draft, demo: view.demo, back: view, backLabel: 'Вернуться к записи' })
          }
          onSave={
            !view.demo && session.status === 'unlocked'
              ? async (entry, then) => {
                  const saved = await saveManualEntry(session.vault, entry)
                  setDraft('')
                  setView(
                    then === 'analyze'
                      ? { name: 'analysis', text: saved.text, demo: false, back: { name: 'entry', entry: saved }, backLabel: 'К записи' }
                      : { name: 'entry', entry: saved },
                  )
                }
              : undefined
          }
        />
      )
    }
    if (view.name === 'import') {
      // Rendered outside the session switch: a guest signs up mid-flow and the
      // parsed archive must survive that state change (same element position).
      return (
        <ImportScreen
          vault={session.status === 'unlocked' ? session.vault : null}
          lockedEmail={session.status === 'locked' ? session.account.email : undefined}
          onAuthenticated={({ account, vault }) => setSession({ status: 'unlocked', account, vault })}
          onBack={() => setView(HOME)}
          backLabel={session.status === 'unlocked' ? 'К дневнику' : 'На главную'}
          onImported={() => setView(HOME)}
        />
      )
    }
    if (view.name === 'analysis') {
      return (
        <AnalysisScreen
          key={view.text}
          text={view.text}
          // A signed-in user analysing their own text gets the model; the sample stays a mock.
          demo={view.demo || session.status !== 'unlocked'}
          backLabel={view.backLabel}
          onBack={() => setView(view.back)}
        />
      )
    }

    // Settings need the password anyway, so they also work while locked.
    if (view.name === 'settings' && account) {
      return (
        <SettingsScreen
          account={account}
          onBack={() => setView(HOME)}
          onLogOut={handleLogOut}
          onJournalCleared={() => undefined}
          onAccountDeleted={() => {
            setSession({ status: 'anonymous' })
            setFlash('Аккаунт и все данные удалены.')
            setView(HOME)
          }}
        />
      )
    }

    switch (session.status) {
      case 'checking':
        return null
      case 'anonymous':
        return (
          <AuthScreen
            // Remount when switching between "Войти" and "Начать" on the landing page.
            key={view.name === 'auth' ? view.mode : 'login'}
            initialMode={view.name === 'auth' ? view.mode : 'login'}
            onAuthenticated={handleAuthenticated}
            onTryDemo={() => startWriting(SAMPLE_ENTRY, true)}
            onBack={() => setView(HOME)}
          />
        )
      case 'locked':
        return (
          <UnlockScreen
            account={session.account}
            onUnlocked={(vault) => setSession({ status: 'unlocked', account: session.account, vault })}
            onLogOut={handleLogOut}
          />
        )
      case 'unlocked':
        return renderUnlocked(session)
    }
  }

  function renderUnlocked({ vault }: Extract<Session, { status: 'unlocked' }>) {
    switch (view.name) {
      case 'analyze-period':
        return <AnalyzePeriodScreen entries={view.entries} onBack={() => setView(HOME)} />
      case 'categorize':
        return (
          <CategorizeScreen
            vault={vault}
            entries={view.entries}
            onBack={() => setView(HOME)}
            onDone={() => setView(HOME)}
          />
        )
      case 'entry':
        return (
          <EntryDetailScreen
            entry={view.entry}
            onBack={() => setView(HOME)}
            onAnalyze={(text) => setView({ name: 'analysis', text, demo: false, back: view, backLabel: 'К записи' })}
          />
        )
      default:
        return (
          <JournalScreen
            vault={vault}
            onOpenEntry={(entry) => setView({ name: 'entry', entry })}
            onImport={() => setView({ name: 'import' })}
            onWrite={() => startWriting('', false)}
            onCategorize={(entries) => setView({ name: 'categorize', entries })}
            onAnalyze={(entries) => setView({ name: 'analyze-period', entries })}
          />
        )
    }
  }
}
