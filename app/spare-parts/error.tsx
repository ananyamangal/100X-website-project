'use client'

import Link from 'next/link'

export default function SparePartsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-center px-4 bg-white pt-24">
      <div className="max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Unable to load spare parts</h2>
        <p className="text-gray-500 text-sm mb-8">
          There was an error loading this page. Please try again.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset} className="px-5 py-2.5 bg-brand-600 text-white rounded-full text-sm font-semibold hover:bg-brand-700 transition-colors">
            Try again
          </button>
          <Link href="/" className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-full text-sm font-semibold hover:border-gray-300 transition-colors">
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
