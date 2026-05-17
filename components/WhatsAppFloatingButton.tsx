"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { pushDataLayer } from "@/lib/gtm"

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
        <div className="font-semibold text-green-700">WhatsApp Us</div>
        <div className="mt-1 tabular-nums text-gray-700">{displayPhone}</div>
        <a
          href={telHref}
          className="mt-2 inline-block text-sm font-medium text-green-600 underline decoration-green-600/40 underline-offset-2 hover:text-green-700"
          data-gtm="tel_fallback_float_whatsapp"
          data-gtm-location="floating_whatsapp_tooltip"
        >
          Or call {displayPhone}
        </a>
      </div>

      <button
        type="button"
        className={cn(
          "group flex min-h-[56px] min-w-[56px] shrink-0 items-center gap-3 rounded-full bg-green-600 px-5 py-3 text-white shadow-lg",
          "transition-colors duration-200 hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800",
        )}
        data-gtm="whatsapp_float"
        data-phone={`+${waNumber.replace(/^\+/, "")}`}
        aria-label={`Chat on WhatsApp at ${displayPhone}`}
        aria-expanded={mobileExpanded}
        onClick={handleFabClick}
      >
        <MessageCircle size={28} className="shrink-0" aria-hidden />
        <span className="hidden font-semibold sm:inline">WhatsApp Us</span>
      </button>
    </div>
  )
}
