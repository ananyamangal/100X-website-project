"use client"

import React, { useState, useEffect } from "react"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const WHATSAPP = "917827229116"
// 30–45 seconds in production; 3 seconds in development for easier testing
const getDelayMs = () =>
  typeof process !== "undefined" && process.env.NODE_ENV === "development"
    ? 3000
    : 30000 + Math.random() * 15000
const STORAGE_KEY = "gem-popup-dismissed"

export default function GemPopup() {
  const [show, setShow] = useState(false)
  const [mobile, setMobile] = useState("")

  useEffect(() => {
    if (typeof window === "undefined") return

    // ?showgem=1 in URL forces the popup (ignores localStorage, 2s delay) for testing
    const forceShow = /showgem=1/.test(window.location.search || "")
    if (forceShow) {
      const t = setTimeout(() => setShow(true), 2000)
      return () => clearTimeout(t)
    }

    let dismissed = false
    try {
      dismissed = !!localStorage.getItem(STORAGE_KEY)
    } catch {
      // ignore localStorage errors (e.g. private mode)
    }
    if (dismissed) return

    const delay = getDelayMs()
    const t = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(t)
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true")
    } catch {}
    setShow(false)
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
    try {
      localStorage.setItem(STORAGE_KEY, "true")
    } catch {}
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
