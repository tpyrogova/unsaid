import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { CrisisView } from '../components/CrisisView'
import { LoadingState } from '../components/LoadingState'
import { Notice } from '../components/Notice'
import { ReviewView } from '../components/ReviewView'
import { dict, useI18n } from '../i18n'
import { analyzeEntry } from '../lib/api'
import type { AnalyzeResponse } from '../types/analysis'

type State = { status: 'loading' } | { status: 'ready'; result: AnalyzeResponse } | { status: 'error'; message: string }

interface AnalysisScreenProps {
  text: string
  /** Demo uses the local mock; signed-in users get the real model. */
  demo: boolean
  onBack: () => void
  backLabel: string
}

/** Careful review of a single entry. */
export function AnalysisScreen({ text, demo, onBack, backLabel }: AnalysisScreenProps) {
  const { t } = useI18n()
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    // The parent remounts this screen (via `key`) for a new text.
    const controller = new AbortController()
    analyzeEntry(text, { signal: controller.signal, demo })
      .then((result) => setState({ status: 'ready', result }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({ status: 'error', message: error instanceof Error ? error.message : dict().analysis.error })
      })
    return () => controller.abort()
  }, [text, demo])

  return (
    <div className="space-y-12">
      <Button variant="ghost" onClick={onBack}>
        ← {backLabel}
      </Button>
      <ResultView
        state={state}
        title={t.analysis.entryTitle}
        loadingHint={demo ? undefined : t.analysis.loadingHint}
      />
    </div>
  )
}

export function ResultView({ state, title, loadingHint }: { state: State; title: string; loadingHint?: string }) {
  if (state.status === 'loading') return <LoadingState hint={loadingHint} />
  if (state.status === 'error') return <Notice tone="error">{state.message}</Notice>
  if (state.result.kind === 'crisis') return <CrisisView contacts={state.result.contacts} />
  return <ReviewView review={state.result.review} meta={state.result.meta} title={title} />
}

export type { State as ResultState }
