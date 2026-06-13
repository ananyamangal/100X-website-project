"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { pushDataLayer } from "@/lib/gtm"

function WhatsAppIcon({ size = 26 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

const DEFAULT_MESSAGE = "Hi, I'm interested in 100x products, please help me out"

type Props = {
  /** E.164 without +, e.g. 917827229116 */
  waNumber: string
  /** Shown in tooltip / label, e.g. +91 78272 29116 */
  displayPhone: string
  /** digits only for dataLayer phone_number (national or full), e.g. 7827229116 */
  phoneDigitsForEvents: string
  message?: string
  className?: string
}

function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(pointer: coarse)").matches
}

function isSmallViewport(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(max-width: 768px)").matches
}

export default function WhatsAppFloatingButton({
  waNumber,
  displayPhone,
  phoneDigitsForEvents,
  message = DEFAULT_MESSAGE,
  className,
}: Props) {
  const [mobileExpanded, setMobileExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`

  const openWhatsApp = useCallback(() => {
    pushDataLayer({
      event: "whatsapp_click",
      location: "floating_button",
      phone_number: phoneDigitsForEvents,
      whatsapp_url: waUrl,
    })
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'whatsapp_click', page: window.location.pathname, source: 'floating_button' }),
    }).catch(() => {})
    window.open(waUrl, "_blank", "noopener,noreferrer")
  }, [waUrl, phoneDigitsForEvents])

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      const el = containerRef.current
      if (!el || !e.target) return
      if (el.contains(e.target as Node)) return
      setMobileExpanded(false)
    }
    document.addEventListener("pointerdown", onDocPointerDown)
    return () => document.removeEventListener("pointerdown", onDocPointerDown)
  }, [])

  const handleFabClick = (e: React.MouseEvent) => {
    const mobile = isSmallViewport() || isCoarsePointer()
    if (mobile) {
      if (!mobileExpanded) {
        e.preventDefault()
        setMobileExpanded(true)
        return
      }
    }
    openWhatsApp()
    setMobileExpanded(false)
  }

  const telHref = `tel:+${waNumber.replace(/^\+/, "")}`

  return (
    <div
      ref={containerRef}
      className={cn(
        "group fixed bottom-6 right-6 z-[70] hidden md:flex md:flex-col items-end gap-2",
        "max-w-[calc(100vw-3rem)]",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-lg transition-opacity duration-200",
          mobileExpanded ? "block" : "max-md:hidden",
          "md:block md:opacity-0 md:pointer-events-none md:transition-opacity",
          "md:group-hover:pointer-events-auto md:group-hover:opacity-100",
          "md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100",
        )}
        role="tooltip"
      >
        <div className="font-semibold text-brand-700">Chat on WhatsApp</div>
        <div className="mt-1 tabular-nums text-gray-700">{displayPhone}</div>
        <a
          href={telHref}
          className="mt-2 inline-block text-sm font-medium text-brand-600 underline decoration-green-600/40 underline-offset-2 hover:text-brand-700"
          data-gtm="tel_fallback_float_whatsapp"
          data-gtm-location="floating_whatsapp_tooltip"
        >
          Or call {displayPhone}
        </a>
      </div>

      <button
        type="button"
        className={cn(
          "flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-xl",
          "transition-all duration-200 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        )}
        style={{ backgroundColor: "#25D366" }}
        data-gtm="whatsapp_float"
        data-phone={`+${waNumber.replace(/^\+/, "")}`}
        aria-label={`Chat on WhatsApp at ${displayPhone}`}
        aria-expanded={mobileExpanded}
        onClick={handleFabClick}
      >
        <WhatsAppIcon size={28} />
      </button>
    </div>
  )
}
