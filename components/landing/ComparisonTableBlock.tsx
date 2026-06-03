import type { ComparisonRow } from "@/lib/seo/landing-types"
import SectionHeader from "./SectionHeader"

type Props = {
  eyebrow?: string
  title: string
  columns: string[]
  rows: ComparisonRow[]
  note?: string
}

/**
 * Side-by-side spec comparison. First column is the row label; the
 * rest map 1:1 to `columns`. `row.highlight` lets a landing bias
 * toward a recommended option (highlighted column gets bolder text).
 */
export default function ComparisonTableBlock({
  eyebrow,
  title,
  columns,
  rows,
  note,
}: Props) {
  if (!columns.length || !rows.length) return null
  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4 max-w-5xl">
        <SectionHeader eyebrow={eyebrow} title={title} />
        <div className="mt-10 overflow-x-auto rounded-2xl border border-gray-200 [[data-theme=dark-industrial]_&]:border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="bg-gray-50 [[data-theme=dark-industrial]_&]:bg-white/[0.03]">
                <th className="px-5 py-4 font-semibold text-gray-700 [[data-theme=dark-industrial]_&]:text-slate-300 w-[28%]">
                  &nbsp;
                </th>
                {columns.map((c, i) => (
                  <th
                    key={i}
                    className="px-5 py-4 font-bold text-gray-900 [[data-theme=dark-industrial]_&]:text-white"
                    scope="col"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-t border-gray-200 [[data-theme=dark-industrial]_&]:border-white/10"
                >
                  <th
                    scope="row"
                    className="px-5 py-4 font-semibold text-gray-700 align-top [[data-theme=dark-industrial]_&]:text-slate-300"
                  >
                    {row.label}
                  </th>
                  {row.cells.map((cell, ci) => {
                    const highlighted = row.highlight === ci
                    return (
                      <td
                        key={ci}
                        className={
                          highlighted
                            ? "px-5 py-4 align-top font-semibold text-brand-700 [[data-theme=dark-industrial]_&]:text-brand-400"
                            : "px-5 py-4 align-top text-gray-700 [[data-theme=dark-industrial]_&]:text-slate-200"
                        }
                      >
                        {cell}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {note ? (
          <p className="mt-4 text-xs text-gray-500 [[data-theme=dark-industrial]_&]:text-slate-400">
            {note}
          </p>
        ) : null}
      </div>
    </section>
  )
}
