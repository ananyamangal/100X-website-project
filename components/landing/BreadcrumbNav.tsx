import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { BreadcrumbItem } from "@/components/seo/BreadcrumbJsonLd"

type Props = {
  items: BreadcrumbItem[]
}

/**
 * Visible breadcrumb rail that mirrors the BreadcrumbList JSON-LD.
 * Rendered just above the hero on non-product landings so users see
 * navigational context (and assistive tech gets a proper `<nav>` +
 * `aria-label="Breadcrumb"`).
 *
 * The current page (last item) renders as plain text — clicking it
 * would be a no-op.
 */
export default function BreadcrumbNav({ items }: Props) {
  if (!items?.length) return null
  return (
    <nav
      aria-label="Breadcrumb"
      className="container mx-auto px-4 pt-6 [[data-theme=dark-industrial]_&]:pt-8"
    >
      <ol className="flex flex-wrap items-center gap-1.5 text-sm list-none">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 ? (
                <ChevronRight
                  size={14}
                  aria-hidden="true"
                  className="text-gray-400 [[data-theme=dark-industrial]_&]:text-slate-500"
                />
              ) : null}
              {isLast ? (
                <span
                  aria-current="page"
                  className="font-medium text-gray-900 line-clamp-1 [[data-theme=dark-industrial]_&]:text-slate-200"
                >
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.url}
                  className="text-gray-600 hover:text-green-700 transition-colors [[data-theme=dark-industrial]_&]:text-slate-400 [[data-theme=dark-industrial]_&]:hover:text-green-400"
                >
                  {item.name}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
