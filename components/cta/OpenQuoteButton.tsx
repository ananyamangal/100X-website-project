"use client"

import { useState, type ReactNode } from "react"
import QuoteModal from "./QuoteModal"
import type { Audience } from "./cta-config"

type Props = {
  children: ReactNode
  className?: string
  audience?: Audience
  productName?: string
  /** data-gtm value for click tracking */
  gtm?: string
}

/** Client wrapper so server-rendered pages can open the shared QuoteModal. */
export default function OpenQuoteButton({
  children,
  className,
  audience = "tender",
  productName,
  gtm = "cta_quote",
}: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        data-gtm={gtm}
        className={className}
      >
        {children}
      </button>
      <QuoteModal open={open} onClose={() => setOpen(false)} audience={audience} productName={productName} />
    </>
  )
}
