import { Inter } from 'next/font/google'

// Shared by every root layout (public site, locale-managed pages, admin) so the
// generated class name and preloaded font file are identical across them —
// next/font hashes the generated CSS, not the importing file.
export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  preload: true,
})
