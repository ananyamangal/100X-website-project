/**
 * Machine-readable + human-visible summary block for AI-indexed pages.
 * The data-ai-entity attribute lets scrapers extract the structured summary.
 */
interface Props {
  entity: string
  summary: string
  facts?: Array<{ label: string; value: string }>
}

export default function AiSummaryBlock({ entity, summary, facts }: Props) {
  return (
    <aside
      data-ai-entity={entity}
      data-ai-summary={summary}
      className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8"
    >
      <p className="text-xs font-semibold text-green-700 uppercase tracking-widest mb-2">
        AI-Readable Summary
      </p>
      <p className="text-gray-800 text-sm leading-relaxed mb-4">{summary}</p>
      {facts && facts.length > 0 && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
          {facts.map((f) => (
            <div key={f.label} className="flex gap-2">
              <dt className="text-xs text-gray-500 shrink-0 w-32">{f.label}:</dt>
              <dd className="text-xs font-medium text-gray-800">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </aside>
  )
}
