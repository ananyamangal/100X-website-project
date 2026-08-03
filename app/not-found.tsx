import Link from 'next/link'

// Without this file, Next.js has no NotFoundBoundary anywhere in the tree,
// so notFound() throws inside the tree but the response is served with the
// framework's fallback rendering path and no dedicated boundary forces the
// status to 404 — the page renders correct "not found" content at HTTP 200.
// This file is what makes notFound() actually produce a 404 response.
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center px-4 bg-white">
      <div className="max-w-md">
        <p className="text-5xl font-black text-gray-200 mb-6">404</p>
        <h2 className="text-xl font-bold text-gray-900 mb-3">Page not found</h2>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 bg-brand-600 text-white rounded-full text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
