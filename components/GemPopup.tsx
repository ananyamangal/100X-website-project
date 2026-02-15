"use client"

import React, { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const WHATSAPP = "917827229116"
const DELAY_MS = 5000 // 5 seconds after page load

export default function GemPopup() {
  const pathname = usePathname()
  const [show, setShow] = useState(false)
  const [mobile, setMobile] = useState("")
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

  const submitNumber = () => {
    const trimmed = mobile.trim()
    if (!trimmed) {
      alert("Please enter your mobile number before submitting.")
      return
    }

    fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "GeM Popup",
        phone: trimmed,
        type: "gem_popup_submit_only",
      }),
    }).catch(() => {})

    setShow(false)
    alert("Thank you! Our team will contact you shortly.")
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-3">
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
            onChange={(e) => setMobile(e.target.value)}
            className="p-3 mb-5"
          />
          <Button
            onClick={submitNumber}
            className="w-full mb-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 text-base"
          >
            Submit
          </Button>
          <div className="flex gap-3">
            <Button onClick={talkToOem} className="flex-1 bg-green-600 hover:bg-green-700">
              <MessageCircle className="mr-2" size={18} />
              Talk to OEM
            </Button>
            <Button type="button" variant="outline" onClick={dismiss} className="bg-transparent">
              No Thanks
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
