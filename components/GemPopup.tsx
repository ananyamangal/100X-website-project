"use client"

import React, { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const WHATSAPP = "917827229116"
const DELAY_MS = 20000 // 20 seconds after page load

export default function GemPopup() {
  const pathname = usePathname()
  const [show, setShow] = useState(false)
  const [mobile, setMobile] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Show popup after delay on every load/navigation. No localStorage – always show again on refresh even if user closed it.
  useEffect(() => {
    if (typeof window === "undefined") return
    if (pathname != null && String(pathname).startsWith("/admin")) return

    setShow(false)

    const forceShow = /showgem=1/.test(window.location.search || "")
    const delay = forceShow ? 2000 : DELAY_MS

    // Defer so we're past hydration; then show after delay
    const start = setTimeout(() => {
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        setShow(true)
      }, delay)
    }, 100)

    return () => {
      clearTimeout(start)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [pathname])

  const dismiss = () => setShow(false)

  // Scroll lock + ESC support
  useEffect(() => {
    if (!show) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShow(false); setSubmitted(false) }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [show])

  const submitNumber = () => {
    const trimmed = mobile.trim()
    if (!trimmed) {
      setPhoneError("Please enter your mobile number.")
      return
    }
    setPhoneError("")

    fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "GeM Popup",
        phone: trimmed,
        type: "gem_popup_submit_only",
      }),
    }).catch(() => {})

    setSubmitted(true)
    setTimeout(() => { setShow(false); setSubmitted(false) }, 2500)
  }

  const talkToOem = () => {
    const msg = `Hi, I need help selecting GeM / ISI / WHO compliant fogging machine. I'm interested in GeM reseller code or Bulk & institutional pricing.${mobile.trim() ? ` My number: ${mobile.trim()}` : ""}`
    fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "GeM Popup",
        phone: mobile.trim() || "Not shared",
        type: "gem_popup",
      }),
    }).catch(() => {})
    setShow(false)
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank")
  }

  if (!show) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gem-popup-title"
      onClick={dismiss}
    >
      <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <CardContent className="p-6">
          {submitted ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 text-lg mb-1">Thank you!</h3>
              <p className="text-gray-600 text-sm">Our team will contact you shortly.</p>
            </div>
          ) : (
            <>
              <h3 id="gem-popup-title" className="text-xl font-bold text-gray-800 mb-3">
                Need help selecting GeM / ISI / WHO compliant fogging machine?
              </h3>
              <p className="text-gray-600 mb-4">
                Talk directly to OEM for GeM reseller code or for Bulk & institutional pricing.
              </p>
              <p className="text-sm font-medium text-gray-700 mb-2">Share your Mobile number for GeM support.</p>
              <Input
                type="tel"
                placeholder="e.g. 9876543210"
                value={mobile}
                onChange={(e) => { setMobile(e.target.value); if (phoneError) setPhoneError("") }}
                className="p-3 mb-1"
                aria-invalid={!!phoneError}
              />
              {phoneError && (
                <p className="text-red-600 text-xs mb-3" role="alert">{phoneError}</p>
              )}
              {!phoneError && <div className="mb-5" />}
              <Button
                onClick={submitNumber}
                className="w-full mb-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 text-base"
              >
                Submit
              </Button>
              <div className="flex gap-3">
                <Button onClick={talkToOem} className="flex-1 bg-brand-600 hover:bg-brand-700">
                  <MessageCircle className="mr-2" size={18} />
                  Talk to OEM
                </Button>
                <Button type="button" variant="outline" onClick={dismiss} className="bg-transparent">
                  No Thanks
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
