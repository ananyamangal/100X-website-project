import type { BenefitItem } from "@/lib/seo/landing-types"
import SectionHeader from "./SectionHeader"

type Props = {
  eyebrow?: string
  title: string
  items: BenefitItem[]
}

/**
 * Icon-led benefit cards. Three or six items render cleanly across
 * breakpoints. Emoji or any single character works for `icon`.
 */
export default function BenefitsGridBlock({ eyebrow, title, items }: Props) {
  if (!items.length) return null
  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionHeader eyebrow={eyebrow} title={title} />
        <ul className="mt-10 md:mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 list-none">
          {items.map((item, i) => (
            <li
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md [[data-theme=dark-industrial]_&]:bg-white/[0.04] [[data-theme=dark-industrial]_&]:border-white/10 [[data-theme=dark-industrial]_&]:hover:border-green-500/40 [[data-theme=dark-industrial]_&]:hover:bg-white/[0.06]"
            >
              <div
                aria-hidden="true"
                className="text-3xl mb-3"
              >
                {item.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 [[data-theme=dark-industrial]_&]:text-white">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-600 [[data-theme=dark-industrial]_&]:text-slate-300">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
