/**
 * Shape of a journal-entry analysis.
 *
 * Guiding principle: the analysis contains **observations, not diagnoses**.
 * Every item must be anchored to the author's own words via a verbatim quote
 * (`evidence` / `quote`), so the reader can always see where a conclusion
 * came from and disagree with it.
 */

/** An emotion noticed in the entry. */
export interface Emotion {
  /** Human-readable emotion name, e.g. «тревога». */
  name: string
  /** Relative intensity in the range 0–1 (0 = barely present, 1 = dominant). */
  intensity: number
  /** Verbatim quote from the entry that supports this observation. */
  evidence: string
}

/** An unmet need that seems to stand behind the emotions. */
export interface Need {
  /** Name of the need, e.g. «ясность в отношениях». */
  name: string
  /** Verbatim quote from the entry that supports this observation. */
  evidence: string
}

/** A thinking pattern that may be distorting how a situation is perceived. */
export interface CognitiveDistortion {
  /** Distortion type, e.g. «чтение мыслей», «катастрофизация». */
  type: string
  /** Verbatim quote from the entry where the pattern shows up. */
  quote: string
  /** A gentler, more balanced way to look at the same thought. */
  reframe: string
}

/** A recurring behavioural scenario visible in the entry. */
export interface Pattern {
  /** Neutral description of the scenario. */
  description: string
  /** Verbatim quote from the entry that supports this observation. */
  evidence: string
}

/** Full analysis returned for a single journal entry. */
export interface Analysis {
  emotions: Emotion[]
  /** Needs that appear to be unmet. */
  needs: Need[]
  cognitive_distortions: CognitiveDistortion[]
  patterns: Pattern[]
  /** One soft, open question for self-reflection. */
  reflection_question: string
  /** A 2–3 sentence overview of the entry. */
  summary: string
}
