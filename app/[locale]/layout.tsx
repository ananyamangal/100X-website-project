import { notFound } from "next/navigation"
import { hasLocale } from "next-intl"
import { setRequestLocale } from "next-intl/server"
import { routing } from "@/i18n/routing"

// Root <html>/<body>/Navbar/Footer/NextIntlClientProvider all live in the
// true app root layout (app/layout.tsx) — it resolves the same locale via
// getLocale() for every request, including these. This layout only exists
// to validate the :locale segment and enable static rendering.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleSegmentLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  setRequestLocale(locale)

  return children
}
