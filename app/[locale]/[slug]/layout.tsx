import { notFound } from "next/navigation"
import { hasLocale } from "next-intl"
import { routing } from "@/i18n/routing"
import { isUntranslatableProductLanding } from "@/lib/seo/locale-gate"

// This check lives here rather than in page.tsx on purpose: this segment's
// loading.tsx wraps page.tsx (and everything below it) in a Suspense
// boundary, and Next.js commits the response's HTTP status once that
// boundary's fallback is flushed — before page.tsx's own async work gets a
// chance to call notFound(). That produced a real bug: the 3 untranslatable
// product landing pages (TFS50/DB400/SSMA20) rendered correct "not found"
// content under /hi and /id, but the response was still HTTP 200. A layout
// for the same segment renders outside its own loading.tsx boundary, so
// notFound() called here actually produces a 404 status.
export default async function ProductSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string; locale: string }>
}) {
  const { slug, locale } = await params
  // Unknown :locale → 404 here, not in app/[locale]/layout.tsx: that is a
  // root layout now and has no enclosing boundary to render a 404 in.
  if (!hasLocale(routing.locales, locale)) notFound()
  if (await isUntranslatableProductLanding(slug, locale)) notFound()
  return children
}
