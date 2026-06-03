import { Quote } from "lucide-react"
import type { CaseStudy } from "@/lib/seo/landing-types"
import SectionHeader from "./SectionHeader"

type Props = {
  eyebrow?: string
  title: string
  items: CaseStudy[]
}

/**
 * Deployment-proof rail. Each card surfaces a client, a one-line
 * outcome, and an optional pull-quote. Optional logo path renders as
 * a tiny monogram if present.
 */
export default function CaseStudiesBlock({ eyebrow, title, items }: Props) {
  if (!items.length) return null
  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionHeader eyebrow={eyebrow} title={title} />
        <ul className="mt-10 md:mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5 list-none">
          {items.map((c, i) => (
            <li
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-6 [[data-theme=dark-industrial]_&]:bg-white/[0.04] [[data-theme=dark-industrial]_&]:border-white/10"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-brand-100 text-brand-700 font-bold text-sm [[data-theme=dark-industrial]_&]:bg-brand-500/10 [[data-theme=dark-industrial]_&]:text-brand-400">
                  {(c.client[0] || "C").toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 [[data-theme=dark-industrial]_&]:text-white">
                    {c.client}
                  </p>
                  {c.location ? (
                    <p className="text-xs text-gray-500 [[data-theme=dark-industrial]_&]:text-slate-400">
                      {c.location}
                    </p>
                  ) : null}
                </div>
              </div>
              <p className="text-sm font-medium text-brand-700 [[data-theme=dark-industrial]_&]:text-brand-400">
                {c.result}
              </p>
              {c.quote ? (
                <blockquote className="mt-4 flex gap-2 text-sm leading-relaxed text-gray-600 [[data-theme=dark-industrial]_&]:text-slate-300">
                  <Quote
                    size={16}
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-brand-600/70 [[data-theme=dark-industrial]_&]:text-brand-400/70"
                  />
                  <span>{c.quote}</span>
                </blockquote>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
