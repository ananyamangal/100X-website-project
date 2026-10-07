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

// The (admin) route group's root layout (app/(admin)/layout.tsx) renders the clean
// <html><body> with no public Navbar/Footer. This layout only adds the admin
// metadata (noindex) and passes children through — no extra wrapping needed.
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
