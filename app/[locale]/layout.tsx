// Root layout for the locale-managed pages (app/[locale]/[slug] and the
// blog). Same public shell as app/(site)/layout.tsx; the only difference is
// that <html lang>/<dir> come from the :locale segment instead of being fixed
// to "en-IN" — which is why this subtree needs its own root layout.
export const revalidate = 300

import { hasLocale } from "next-intl"
import { setRequestLocale, getMessages } from "next-intl/server"
import { routing } from "@/i18n/routing"
import SiteShell from "@/components/layout/SiteShell"
import { generateRootMetadata, rootViewport } from "@/lib/seo/root-metadata"
import "../globals.css"

export const viewport = rootViewport

const RTL_LOCALES: ReadonlySet<string> = new Set(["ur", "ar"])
export const generateMetadata = generateRootMetadata

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleRootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const valid = hasLocale(routing.locales, locale)

  // An unknown :locale (e.g. /foo/bar) is a 404 — raised by the nested
  // layouts (app/[locale]/[slug]/layout.tsx, app/[locale]/blog/layout.tsx)
  // rather than here, because a notFound() thrown by a ROOT layout has no
  // enclosing boundary to render in. Rendering the shell for it with the
  // English defaults reproduces what the old single root layout produced for
  // such URLs (lang="en-IN", no dir, English footer) around the 404 content.
  const effectiveLocale = valid ? locale : routing.defaultLocale
  setRequestLocale(effectiveLocale)
  const messages = await getMessages()

  // Same rule the old root layout applied (ur/ar → rtl); typed as plain
  // strings because "ar" is not in routing.locales yet.
  const dir = RTL_LOCALES.has(effectiveLocale) ? "rtl" : "ltr"

  return (
    <SiteShell
      htmlLang={valid ? locale : "en-IN"}
      dir={valid ? dir : undefined}
      locale={effectiveLocale}
      messages={messages}
      footerLocale={effectiveLocale}
    >
      {children}
    </SiteShell>
  )
}
