interface EvidenceQuoteProps {
  text: string
}

/** A verbatim fragment from the entry, the "source" for an observation. */
export function EvidenceQuote({ text }: EvidenceQuoteProps) {
  return (
    <blockquote className="border-l-2 border-line pl-3 font-serif text-[15px] leading-relaxed text-ink-soft italic">
      «{text}»
    </blockquote>
  )
}
