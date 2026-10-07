import NotFoundContent from "@/components/NotFoundContent"

// 404 boundary for the locale-managed subtree (unknown locale, unknown slug,
// untranslatable product landing under a non-English prefix). Renders inside
// app/[locale]/layout.tsx's shell with a real 404 status.
export default function NotFound() {
  return <NotFoundContent />
}
