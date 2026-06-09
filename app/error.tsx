'use client'

import Link from 'next/link'

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center text-center px-4 bg-white">
      <div className="max-w-md">
        <p className="text-5xl font-black text-gray-200 mb-6">Oops</p>
        <h2 className="text-xl font-bold text-gray-900 mb-3">Something went wrong</h2>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          We hit an unexpected error loading this page. Our team has been notified.
          Please try again or return to the homepage.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-brand-600 text-white rounded-full text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-full text-sm font-semibold hover:border-gray-300 transition-colors"
          >
            Go home
          </Link>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-8 text-left text-xs text-red-600 bg-red-50 rounded-xl p-4 overflow-auto max-h-40 border border-red-200">
            {error?.message}
          </pre>
        )}
      </div>
    </div>
  )
}
