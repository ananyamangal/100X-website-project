// Root layout for every public page outside app/[locale] (home, products,
// landing pages, knowledge, policies, …). Pages here keep their own
// `revalidate`; this value is the ceiling for the ones that set none.
export const revalidate = 300

import { setRequestLocale, getMessages } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import SiteShell from '@/components/layout/SiteShell'
import { generateRootMetadata, rootViewport } from '@/lib/seo/root-metadata'
import '../globals.css'

export const viewport = rootViewport
export const generateMetadata = generateRootMetadata

// Previously a single app/layout.tsx wrapped the whole app and called
// `headers()` (to tell admin and locale-managed requests apart), which opted
// EVERY route into dynamic rendering and silently ignored all the page-level
// `revalidate` exports. The three root layouts (this one, app/[locale],
// app/(admin)) now make that distinction by route group instead, so nothing
// here reads the request and these pages are prerendered / ISR-cached.
export default async function SiteRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Pages outside app/[locale] are English-only and never run the intl
  // middleware; pin the request locale explicitly so next-intl's getters
  // resolve from this value instead of reading request headers (which would
  // opt the route back into dynamic rendering).
  setRequestLocale(routing.defaultLocale)
  const messages = await getMessages()

  // lang="en-IN" with no dir attribute — exactly what every non-locale-managed
  // page rendered before the split.
  return (
    <SiteShell htmlLang="en-IN" locale={routing.defaultLocale} messages={messages} footerLocale="en">
      {children}
    </SiteShell>
  )
}
