import Link from 'next/link'

// The site's 404 content. Each root layout (app/(site), app/[locale], app/(admin))
// has its own not-found.tsx rendering this, so notFound() still produces a real
// 404 status inside that layout's shell — see the note in app/(site)/not-found.tsx.
export default function NotFoundContent() {
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
