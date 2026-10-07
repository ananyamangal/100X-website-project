import NotFoundContent from '@/components/NotFoundContent'

// Without this file, Next.js has no NotFoundBoundary anywhere in the tree,
// so notFound() throws inside the tree but the response is served with the
// framework's fallback rendering path and no dedicated boundary forces the
// status to 404 — the page renders correct "not found" content at HTTP 200.
// This file is what makes notFound() actually produce a 404 response.
//
// It lives inside the (site) route group (not at app/) because the app has
// three root layouts now; a top-level not-found.tsx would have no root layout
// to render in. app/(site)/[...notFound]/page.tsx routes every URL that
// matches nothing else here, so unknown URLs still get the public shell.
export default function NotFound() {
  return <NotFoundContent />
}
