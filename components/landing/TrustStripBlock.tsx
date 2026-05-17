import type { TrustMetric } from "@/lib/seo/landing-types"

type Props = {
  metrics: TrustMetric[]
}

/**
 * Horizontal row of headline stats (value + label) — used right under
 * the hero to anchor authority signals ("10,000+ customers", "GeM Q2
 * OEM Certified", "Pan India Supply").
 */
export default function TrustStripBlock({ metrics }: Props) {
  if (!metrics.length) return null
  return (
    <section
      aria-label="Trust signals"
      className="border-y border-gray-200 bg-gray-50/70 [[data-theme=dark-industrial]_&]:border-white/10 [[data-theme=dark-industrial]_&]:bg-white/[0.02]"
    >
      <div className="container mx-auto px-4 py-6 md:py-8">
        <ul className="flex flex-wrap justify-center gap-x-10 gap-y-6 list-none">
          {metrics.map((m, i) => (
            <li key={i} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-green-700 tracking-tight [[data-theme=dark-industrial]_&]:text-green-400">
                {m.value}
              </div>
              <div className="mt-1 text-[11px] md:text-xs font-semibold uppercase tracking-wider text-gray-500 [[data-theme=dark-industrial]_&]:text-slate-400">
                {m.label}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
