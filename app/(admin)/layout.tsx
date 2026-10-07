// Admin pages were always rendered per request (the old root layout read
// headers() for them) and must stay that way: they render session-dependent
// UI and some (e.g. /admin/login) read search params without a Suspense
// boundary, which a static prerender would push to client-only rendering.
// Public pages never go through this layout, so this costs nothing there.
export const dynamic = "force-dynamic"

import type { ReactNode } from "react"
import { inter } from "@/lib/fonts"
import { generateRootMetadata, rootViewport } from "@/lib/seo/root-metadata"
import "../globals.css"

export const viewport = rootViewport
export const generateMetadata = generateRootMetadata

// Root layout for /admin/*: a bare <html><body> with no public Navbar/Footer,
// GTM or popups. This is what the old single root layout rendered when the
// middleware's x-is-admin header was present; deciding it by route group
// instead lets the public root layouts drop `headers()` and be cached.
// app/(admin)/admin/layout.tsx layers the admin metadata (noindex) on top.
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
