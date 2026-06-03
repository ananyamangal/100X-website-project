type Props = {
  eyebrow?: string
  title: string
  idOverride?: string
}

/**
 * Eyebrow label + heading. Shared by every landing block so spacing,
 * type scale, and the green eyebrow treatment stay consistent.
 */
export default function SectionHeader({ eyebrow, title, idOverride }: Props) {
  return (
    <div className="text-center max-w-3xl mx-auto">
      {eyebrow ? (
        <p className="text-[11px] md:text-xs font-semibold uppercase tracking-[0.15em] text-brand-700 mb-3 [[data-theme=dark-industrial]_&]:text-brand-400">
          {eyebrow}
        </p>
      ) : null}
      <h2
        id={idOverride}
        className="text-2xl md:text-4xl font-bold text-gray-900 leading-tight [[data-theme=dark-industrial]_&]:text-white"
      >
        {title}
      </h2>
    </div>
  )
}
