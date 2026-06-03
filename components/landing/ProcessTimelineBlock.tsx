import type { ProcessStep } from "@/lib/seo/landing-types"
import SectionHeader from "./SectionHeader"

type Props = {
  eyebrow?: string
  title: string
  steps: ProcessStep[]
}

/**
 * Vertical numbered timeline ("how it works" / "process" rail). A 2px
 * gradient rail connects the numbered nodes for visual continuity.
 */
export default function ProcessTimelineBlock({ eyebrow, title, steps }: Props) {
  if (!steps.length) return null
  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <SectionHeader eyebrow={eyebrow} title={title} />
        <ol className="mt-10 md:mt-12 relative pl-0">
          <span
            aria-hidden="true"
            className="absolute left-[26px] top-2 bottom-2 w-px bg-gradient-to-b from-green-500 via-green-500/60 to-transparent"
          />
          {steps.map((step, i) => (
            <li key={i} className="relative flex gap-5 py-4">
              <span className="relative z-[1] grid place-items-center w-[52px] h-[52px] shrink-0 rounded-full border-2 border-brand-600 bg-white text-brand-700 font-bold text-lg [[data-theme=dark-industrial]_&]:bg-slate-900 [[data-theme=dark-industrial]_&]:text-brand-400 [[data-theme=dark-industrial]_&]:border-green-500">
                {i + 1}
              </span>
              <div className="pt-1">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1 [[data-theme=dark-industrial]_&]:text-white">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600 [[data-theme=dark-industrial]_&]:text-slate-300">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
