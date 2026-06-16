"use client"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { HelpCircle, X, ArrowRight, ExternalLink } from "lucide-react"
import { getDocByRoute } from "@/lib/growth-os/doc-registry"
import Link from "next/link"

const OPEN_EVENT = "open-page-help"

export function openPageHelp() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

export function PageHelp() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const doc = getDocByRoute(pathname)

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener(OPEN_EVENT, handler)
    return () => window.removeEventListener(OPEN_EVENT, handler)
  }, [])

  // Close on route change
  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <>
      {/* Trigger button — always visible in top bar via layout */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-7 h-7 rounded-md border border-gray-200 text-gray-500 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-colors"
        title="Explain this page (?)"
        aria-label="Page help"
      >
        <HelpCircle size={13} />
      </button>

      {/* Slide-out panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[150] bg-black/20"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 bottom-0 z-[151] w-full max-w-sm bg-white shadow-2xl border-l border-gray-200 flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-amber-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <HelpCircle size={15} className="text-amber-600" />
                <span className="text-sm font-semibold text-amber-900">Explain This Page</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              {!doc ? (
                <div className="text-sm text-gray-500 space-y-3">
                  <p>No documentation found for this page.</p>
                  <p className="text-xs text-gray-400">Route: {pathname}</p>
                  <Link
                    href="/admin/growth/help"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800"
                    onClick={() => setOpen(false)}
                  >
                    <ArrowRight size={11} />
                    Browse all documentation
                  </Link>
                </div>
              ) : (
                <>
                  {/* Module name */}
                  <div>
                    <h2 className="text-base font-bold text-gray-900">{doc.name}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{doc.route}</p>
                  </div>

                  {/* Purpose */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">What this does</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{doc.purpose}</p>
                  </div>

                  {/* When to use */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">When to use it</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{doc.when_to_use}</p>
                  </div>

                  {/* How to use */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">How to use</h3>
                    <ul className="space-y-1.5">
                      {doc.how_to_use.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Tips */}
                  {doc.tips && doc.tips.length > 0 && (
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                      <h3 className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-2">Tips</h3>
                      <ul className="space-y-1.5">
                        {doc.tips.map((tip, i) => (
                          <li key={i} className="text-xs text-amber-900 leading-relaxed flex items-start gap-1.5">
                            <span className="flex-shrink-0 mt-0.5">→</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Connects to */}
                  {doc.connects_to.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Connects to</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {doc.connects_to.map(id => (
                          <span
                            key={id}
                            className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-mono"
                          >
                            {id}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Frequency */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded px-3 py-2">
                    <span className="font-semibold text-gray-700">Frequency:</span>
                    {doc.frequency}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0 flex items-center justify-between">
              <Link
                href="/admin/growth/help"
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                onClick={() => setOpen(false)}
              >
                <ExternalLink size={11} />
                Full Knowledge Center
              </Link>
              <Link
                href="/admin/growth/help/chat"
                className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
                onClick={() => setOpen(false)}
              >
                Ask Growth OS →
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  )
}
