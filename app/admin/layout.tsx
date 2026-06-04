import type { ReactNode } from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

// Root layout (app/layout.tsx) detects admin routes via the x-is-admin header
// set by middleware and renders a clean <html><body> with no public Navbar/Footer.
// This layout just passes children through — no extra wrapping needed.
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
