"use client"

import { useEffect, useState } from "react"
import { MessageCircle } from "lucide-react"
import { BUSINESS } from "@/lib/seo/site-config"

/** sessionStorage key holding the RFQ's prefilled WhatsApp text (set by RFQForm after a confirmed save). */
export const RFQ_WA_MESSAGE_KEY = "rfq_wa_message"

/**
 * Optional "send the same details on WhatsApp" button on /thank-you?type=rfq.
 * Renders nothing unless this tab saved an RFQ (server HTML is unchanged).
 */
export function RfqWhatsAppFollowUp({ type }: { type?: string }) {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (type !== "rfq") return
    try {
      setMessage(sessionStorage.getItem(RFQ_WA_MESSAGE_KEY))
    } catch {
      setMessage(null)
    }
  }, [type])

  if (!message) return null
  return (
    <a
      href={`https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      data-gtm-location="thank_you_rfq_details"
      className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md border border-gray-300 text-base font-semibold text-gray-800 hover:bg-gray-50"
    >
      <MessageCircle className="h-5 w-5" aria-hidden />
      Also send your request details on WhatsApp (optional)
    </a>
  )
}
