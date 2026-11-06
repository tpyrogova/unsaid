import { useEffect, useRef, useState } from 'react'
import { analyzeEntry } from './lib/api'
import { SAMPLE_ENTRY } from './mocks/sampleEntry'
import { AnalysisScreen, type AnalysisState } from './screens/AnalysisScreen'
import { EntryScreen } from './screens/EntryScreen'

/**
 * Two-screen flow: write → analysis.
 * The entry text lives only in React state (memory): no localStorage, no network.
 */
export default function App() {
  const [text, setText] = useState(SAMPLE_ENTRY)
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null)
  const pendingRequest = useRef<AbortController | null>(null)

  // Cancel any in-flight analysis when the app unmounts.
  useEffect(() => () => pendingRequest.current?.abort(), [])

  const screen = analysis === null ? 'entry' : 'analysis'

  // Each screen change starts at the top of the page.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [screen])

  async function handleAnalyze() {
    pendingRequest.current?.abort()
    const controller = new AbortController()
    pendingRequest.current = controller

    setAnalysis({ status: 'loading' })
    try {
      const result = await analyzeEntry(text, { signal: controller.signal })
      setAnalysis({ status: 'ready', analysis: result })
    } catch (error) {
      if (controller.signal.aborted) return
      const message = error instanceof Error ? error.message : 'Не получилось сделать разбор.'
      setAnalysis({ status: 'error', message })
    }
  }

  function handleBack() {
    pendingRequest.current?.abort()
    pendingRequest.current = null
    setAnalysis(null)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 py-10 sm:px-8 sm:py-16">
      <p className="mb-10 font-serif text-lg tracking-wide text-clay-deep">Unsaid</p>

      <main className="flex-1">
        {analysis === null ? (
          <EntryScreen text={text} onTextChange={setText} onSubmit={handleAnalyze} />
        ) : (
          <AnalysisScreen state={analysis} onBack={handleBack} />
        )}
      </main>

      <footer className="mt-16 border-t border-line pt-6 text-xs leading-relaxed text-ink-soft">
        Unsaid не заменяет психолога. Если вам тяжело, пожалуйста, обратитесь к специалисту или
        к близкому человеку.
      </footer>
    </div>
  )
}
