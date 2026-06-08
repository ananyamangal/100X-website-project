"use client"
import { useEffect } from "react"

export default function GrowthOSError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[GrowthOS] Client error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl border border-red-200 shadow-lg max-w-2xl w-full p-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-red-600 font-bold text-lg">!</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">Growth OS — Runtime Error</h1>
            <p className="text-xs text-gray-400 mt-0.5">A component crashed. Details below will help diagnose the issue.</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
          <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wide mb-1">Error</p>
          <p className="text-sm text-red-800 font-mono break-all">{error.message || "(no message)"}</p>
          {error.digest && (
            <p className="text-[11px] text-red-400 mt-1.5">Digest: {error.digest}</p>
          )}
        </div>

        {error.stack && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 max-h-72 overflow-auto">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Stack trace</p>
            <pre className="text-[10px] text-gray-600 whitespace-pre-wrap break-all leading-relaxed">{error.stack}</pre>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 bg-brand-600 text-white text-xs py-2.5 rounded-xl hover:bg-brand-700 font-medium transition-colors"
          >
            Try again
          </button>
          <a
            href="/admin/login"
            className="flex-1 text-center border border-gray-200 text-gray-600 text-xs py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Return to Login
          </a>
        </div>
      </div>
    </div>
  )
}
