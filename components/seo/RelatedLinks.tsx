import Link from "next/link"
import {
  caseStudyKind,
  caseStudyLinks,
  GEM_PAGE_LINK,
  GUIDE_BY_KIND,
  productKind,
  productLinks,
  type FoggerKind,
  type RelatedLink,
} from "@/lib/relatedLinks"
import { getRelatedLinkData } from "@/lib/relatedLinksData"

/**
 * B9 internal-link blocks. Server-rendered, placed after a page's existing
 * content, at most 4 links each, descriptive anchors taken from DB names.
 */
export function RelatedLinksList({
  heading,
  links,
  id,
  tone = "light",
}: {
  heading: string
  links: RelatedLink[]
  id: string
  tone?: "light" | "dark"
}) {
  if (!links.length) return null
  const dark = tone === "dark"
  return (
    <section
      aria-labelledby={id}
      className={dark ? "py-10 bg-gray-950 border-t border-white/[0.06]" : "py-10 border-t border-gray-100"}
    >
      <div className="container mx-auto px-4 max-w-3xl">
        <h2 id={id} className={`text-lg font-semibold mb-4 ${dark ? "text-white" : "text-gray-900"}`}>
          {heading}
        </h2>
        <ul className="space-y-2">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={
                  dark
                    ? "text-sm text-brand-400 hover:text-brand-300 underline underline-offset-2"
                    : "text-sm text-brand-700 hover:text-brand-600 underline underline-offset-2"
                }
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** Product detail pages: up to 3 case studies with the same machine type, then the GeM page. */
export async function ProductRelatedCaseStudies({
  productName,
  category,
  excludeCaseStudySlugs = [],
}: {
  productName: string
  category?: string
  excludeCaseStudySlugs?: string[]
}) {
  const kind = productKind(productName, category)
  if (!kind) return null
  const { caseStudies } = await getRelatedLinkData()
  const cs = caseStudyLinks(caseStudies, [kind], 3, excludeCaseStudySlugs, productName)
  if (!cs.length) return null
  return <RelatedLinksList id="related-case-studies" heading="Related case studies" links={[...cs, GEM_PAGE_LINK]} />
}

/** Case-study pages: up to 3 products of the machine type used, then that type's buying guide. */
export async function CaseStudyRelatedProducts({
  productUsed,
  excludeProductIds = [],
  seed,
}: {
  productUsed?: string
  excludeProductIds?: string[]
  /** e.g. the case-study slug, so pages of the same type do not all link the same products first */
  seed?: string
}) {
  const kind = caseStudyKind(productUsed)
  if (!kind) return null
  const { products } = await getRelatedLinkData()
  const items = productLinks(products, [kind], 3, excludeProductIds, seed)
  if (!items.length) return null
  return <RelatedLinksList id="related-products" heading="Related products" links={[...items, GUIDE_BY_KIND[kind]]} />
}

/** Knowledge guides and the GeM page: products and/or case studies for the given machine types. */
export async function TopicRelatedLinks({
  heading,
  id = "related-products-and-case-studies",
  productKinds = [],
  productLimit = 0,
  caseStudyKinds = [],
  caseStudyLimit = 0,
  extra = [],
  tone = "light",
}: {
  heading: string
  id?: string
  productKinds?: FoggerKind[]
  productLimit?: number
  caseStudyKinds?: FoggerKind[]
  caseStudyLimit?: number
  extra?: RelatedLink[]
  tone?: "light" | "dark"
}) {
  const { products, caseStudies } = await getRelatedLinkData()
  const links = [
    ...productLinks(products, productKinds, productLimit),
    ...caseStudyLinks(caseStudies, caseStudyKinds, caseStudyLimit),
    ...extra,
  ].slice(0, 4)
  return <RelatedLinksList id={id} heading={heading} links={links} tone={tone} />
}
