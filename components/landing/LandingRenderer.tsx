import { BreadcrumbJsonLd, type BreadcrumbItem } from "@/components/seo/BreadcrumbJsonLd"
import { ProductLandingJsonLd } from "@/components/seo/ProductLandingJsonLd"
import { MobileCtaOverride } from "@/components/cta/MobileCtaContext"
import ProductPage from "@/app/[slug]/ProductPage"
import {
  getLandingDisplayName,
  getLandingTheme,
} from "@/lib/seo/landing-pages"
import { getMergedLandingPage } from "@/lib/seo/get-merged-landing-page"
import type { FaqEntry, LandingPageDef, LandingSection } from "@/lib/seo/landing-types"

import LandingThemeProvider from "./LandingThemeProvider"
import BreadcrumbNav from "./BreadcrumbNav"
import HeroBlock from "./HeroBlock"
import TrustStripBlock from "./TrustStripBlock"
import BenefitsGridBlock from "./BenefitsGridBlock"
import ProcessTimelineBlock from "./ProcessTimelineBlock"
import ComparisonTableBlock from "./ComparisonTableBlock"
import CaseStudiesBlock from "./CaseStudiesBlock"
import RecommendedProductsBlock from "./RecommendedProductsBlock"
import RelatedLandingsBlock from "./RelatedLandingsBlock"
import FaqBlock from "./FaqBlock"
import CtaBandBlock from "./CtaBandBlock"
import RichTextBlock from "./RichTextBlock"
import LandingFormBlock from "./LandingFormBlock"
import VideoBlock from "./VideoBlock"

type Props = { slug: string }

const AUDIENCE_BY_TYPE: Record<
  NonNullable<LandingPageDef["type"]>,
  "default" | "product" | "tender" | "distributor"
> = {
  product: "product",
  gem: "tender",
  state: "default",
  city: "default",
  "use-case": "product",
  comparison: "default",
  guide: "default",
}

function defaultBreadcrumb(def: LandingPageDef): BreadcrumbItem[] {
  const name = getLandingDisplayName(def.slug) ?? def.slug
  if (def.breadcrumb?.length) {
    return def.breadcrumb.map((b, i, arr) => ({
      name: b.name,
      url: b.url ?? (i === arr.length - 1 ? `/${def.slug}` : "/"),
    }))
  }
  return [
    { name: "Home", url: "/" },
    { name: "Products", url: "/products" },
    { name, url: `/${def.slug}` },
  ]
}

/**
 * Renders one block from the discriminated union. Server component — every
 * block is itself a Server Component (or, in the LandingFormBlock case,
 * a Client Component already marked "use client").
 */
function renderSection(section: LandingSection, def: LandingPageDef, idx: number) {
  switch (section.kind) {
    case "rich-text":
      return <RichTextBlock key={idx} h2={section.h2} paragraphs={section.paragraphs} />
    case "trust-strip":
      return <TrustStripBlock key={idx} metrics={section.metrics} />
    case "benefits-grid":
      return (
        <BenefitsGridBlock
          key={idx}
          eyebrow={section.eyebrow}
          title={section.title}
          items={section.items}
        />
      )
    case "process-timeline":
      return (
        <ProcessTimelineBlock
          key={idx}
          eyebrow={section.eyebrow}
          title={section.title}
          steps={section.steps}
        />
      )
    case "comparison-table":
      return (
        <ComparisonTableBlock
          key={idx}
          eyebrow={section.eyebrow}
          title={section.title}
          columns={section.columns}
          rows={section.rows}
          note={section.note}
        />
      )
    case "case-studies":
      return (
        <CaseStudiesBlock
          key={idx}
          eyebrow={section.eyebrow}
          title={section.title}
          items={section.items}
        />
      )
    case "recommended-products":
      return (
        <RecommendedProductsBlock
          key={idx}
          eyebrow={section.eyebrow}
          title={section.title}
          categoryFilter={section.categoryFilter}
          slugs={section.slugs}
          limit={section.limit}
        />
      )
    case "related-landings":
      return (
        <RelatedLandingsBlock
          key={idx}
          eyebrow={section.eyebrow}
          title={section.title}
          slugs={section.slugs}
          currentSlug={def.slug}
        />
      )
    case "faq": {
      const faqs: FaqEntry[] = section.faqs?.length ? section.faqs : def.faqs || []
      return (
        <FaqBlock
          key={idx}
          eyebrow={section.eyebrow}
          title={section.title}
          faqs={faqs}
        />
      )
    }
    case "form":
      return <LandingFormBlock key={idx} block={section} landingSlug={def.slug} />
    case "cta-band":
      return <CtaBandBlock key={idx} band={section.band} />
    case "video":
      return <VideoBlock key={idx} url={section.url} title={section.title} description={section.description} />
    default:
      // Exhaustiveness guard — unreachable.
      return null
  }
}

/** Has the registry author already placed an FAQ section explicitly? */
function sectionsIncludeFaq(sections: LandingSection[] | undefined): boolean {
  return !!sections?.some((s) => s.kind === "faq")
}

export default async function LandingRenderer({ slug }: Props) {
  const def = await getMergedLandingPage(slug)
  if (!def) return null

  const theme = getLandingTheme(def)
  const breadcrumb = defaultBreadcrumb(def)

  // ─── Back-compat path: existing product landings render the legacy
  // ProductPage UI with their content1/2/3 narrative blocks. No new
  // sections needed — this keeps the 3 existing landings byte-stable.
  if (def.type === "product") {
    return (
      <>
        <ProductLandingJsonLd slug={slug} />
        <BreadcrumbJsonLd items={breadcrumb} />
        <ProductPage />
      </>
    )
  }

  // ─── New section-based path for gem / state / city / use-case / comparison / guide.
  const audience = AUDIENCE_BY_TYPE[def.type]
  const sections = def.sections ?? []
  const hasInlineFaq = sectionsIncludeFaq(sections)

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumb} />
      <MobileCtaOverride audience={audience} productName={getLandingDisplayName(def.slug)} />
      <LandingThemeProvider theme={theme}>
        <BreadcrumbNav items={breadcrumb} />
        {def.hero ? <HeroBlock hero={def.hero} theme={theme} /> : null}
        {sections.map((s, i) => {
          try { return renderSection(s, def, i) } catch { return null }
        })}

        {/* Auto-append an FAQ section when faqs are declared but the
            author didn't explicitly place a {kind:'faq'} section.
            Keeps the FAQPage schema discoverable without forcing every
            landing to mention `faq` in its sections array. */}
        {!hasInlineFaq && def.faqs?.length ? (
          <FaqBlock faqs={def.faqs} />
        ) : null}

        {/* Default tail: related landings — opt-out only if the author
            already placed a `related-landings` section. */}
        {!sections.some((s) => s.kind === "related-landings") ? (
          <RelatedLandingsBlock currentSlug={def.slug} />
        ) : null}
      </LandingThemeProvider>
    </>
  )
}
