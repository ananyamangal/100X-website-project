"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { FileText, MessageCircle, Phone } from "lucide-react"
import { BUSINESS } from "@/lib/seo/site-config"
import { CTA_COPY } from "./cta-config"
import { useMobileCta } from "./MobileCtaContext"
import QuoteModal from "./QuoteModal"

const ADMIN_PREFIX = "/admin"
const CONTACT_PATH = "/contact-us"
const DEFAULT_ANCHOR = "contact-form"

// SSR-safe layout effect to keep the body padding spacer in sync with the
// actual rendered bar height (handles wrapped labels on tiny viewports).
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

export default function MobileCtaBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { audience, productName, whatsappMessage, anchorFormId } = useMobileCta()
  const [quoteOpen, setQuoteOpen] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  const isAdmin = pathname?.startsWith(ADMIN_PREFIX) ?? false
  const isContactPage = pathname === CONTACT_PATH

  const copy = CTA_COPY[audience]
  const message = whatsappMessage?.trim() || copy.whatsappPrefill

  const telHref = `tel:${BUSINESS.phonePrimary.replace(/\s+/g, "")}`
  const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(message)}`

  useIsoLayoutEffect(() => {
    if (isAdmin) {
      document.documentElement.style.removeProperty("--mobile-cta-bar-h")
      return
    }
    if (!barRef.current) return
    const setVar = () => {
      const h = barRef.current?.offsetHeight ?? 64
      document.documentElement.style.setProperty("--mobile-cta-bar-h", `${h}px`)
    }
    setVar()
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(setVar) : null
    ro?.observe(barRef.current)
    return () => {
      ro?.disconnect()
    }
  }, [isAdmin, audience, productName])

  const handleQuoteClick = useCallback(() => {
    if (isContactPage) {
      const id = anchorFormId || DEFAULT_ANCHOR
      const el = typeof document !== "undefined" ? document.getElementById(id) : null
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" })
        return
      }
      router.push(`/contact-us#${id}`)
      return
    }
    setQuoteOpen(true)
  }, [isContactPage, anchorFormId, router])

  if (isAdmin) return null

  return (
    <>
      <div
        ref={barRef}
        role="region"
        aria-label="Quick contact"
        data-gtm-location="sticky_mobile_bar"
        className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur shadow-[0_-2px_8px_rgba(15,23,42,0.08)]"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="grid grid-cols-[5fr_3fr_4fr] gap-2 px-2 pt-2">
          <a
            href={telHref}
            aria-label={`Call ${BUSINESS.phonePrimary}`}
            data-gtm="cta_call"
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-md bg-green-600 px-3 text-white font-semibold text-base shadow-sm transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
          >
            <Phone size={20} aria-hidden="true" />
            <span>{copy.call}</span>
          </a>

          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            data-gtm="cta_whatsapp"
            className="inline-flex min-h-[52px] items-center justify-center gap-1.5 rounded-md border border-green-600 bg-white px-2 text-green-700 font-semibold text-[15px] transition-colors hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
          >
            <MessageCircle size={18} aria-hidden="true" />
            <span>{copy.whatsapp}</span>
          </a>

          <button
            type="button"
            onClick={handleQuoteClick}
            aria-haspopup={isContactPage ? undefined : "dialog"}
            aria-expanded={isContactPage ? undefined : quoteOpen}
            data-gtm="cta_quote"
            className="inline-flex min-h-[52px] items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 text-slate-900 font-semibold transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2"
          >
            <FileText size={16} aria-hidden="true" className="shrink-0" />
            {/* Smaller text for the long "Request Tender Quote" label so it
                doesn't truncate on 360-375px phones. Other labels (Get Quote /
                Get Price / Become Distributor) stay at the standard size. */}
            <span className={copy.quote.length > 12 ? "truncate text-[12px]" : "truncate text-[15px]"}>
              {copy.quote}
            </span>
          </button>
        </div>
      </div>

      <QuoteModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        audience={audience}
        productName={productName}
      />
    </>
  )
}
