import { EvidenceQuote } from './EvidenceQuote'

interface Observation {
  title: string
  evidence: string
}

interface ObservationListProps {
  items: Observation[]
}

/** Generic "observation + supporting quote" list, used for needs and patterns. */
export function ObservationList({ items }: ObservationListProps) {
  return (
    <ul className="space-y-6">
      {items.map((item) => (
        <li key={item.title} className="space-y-2">
          <p className="leading-relaxed">{item.title}</p>
          <EvidenceQuote text={item.evidence} />
        </li>
      ))}
    </ul>
  )
}
