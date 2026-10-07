import { notFound } from "next/navigation"
import { hasLocale } from "next-intl"
import { routing } from "@/i18n/routing"

// Validates the :locale segment for /blog and /blog/[slug]. This used to live
// in app/[locale]/layout.tsx; now that one is a root layout it can't 404
// itself (see the comment there), so each nested segment checks instead.
export default async function BlogLocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  return children
}
