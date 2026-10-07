import { notFound } from 'next/navigation'

// Catch-all for URLs that match no other route. With multiple root layouts
// there is no app/layout.tsx for a global not-found page to render in, so an
// unmatched URL would otherwise get Next's bare built-in 404. Routing it
// here renders app/(site)/not-found.tsx inside the public shell, exactly as
// the old single root layout did, with a real 404 status. Dynamic segments
// are more specific than a catch-all, so /[locale]/[slug] and
// /[locale]/blog/[slug] keep winning for two- and three-segment paths.
export default function CatchAllNotFound() {
  notFound()
}
