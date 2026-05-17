"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { usePathname } from "next/navigation"
import {
  type Audience,
  type MobileCtaContextValue,
  detectAudienceFromPath,
} from "./cta-config"

type Ctx = {
  value: MobileCtaContextValue
  setOverride: (partial: Partial<MobileCtaContextValue>) => void
  clearOverride: () => void
}

const MobileCtaCtx = createContext<Ctx | null>(null)

export function MobileCtaProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [override, setOverrideState] = useState<Partial<MobileCtaContextValue> | null>(null)

  const value = useMemo<MobileCtaContextValue>(() => {
    const base: MobileCtaContextValue = { audience: detectAudienceFromPath(pathname) }
    return override ? { ...base, ...override } : base
  }, [pathname, override])

  const setOverride = useCallback((partial: Partial<MobileCtaContextValue>) => {
    setOverrideState((prev) => ({ ...(prev || {}), ...partial }))
  }, [])

  const clearOverride = useCallback(() => setOverrideState(null), [])

  const ctx = useMemo<Ctx>(() => ({ value, setOverride, clearOverride }), [
    value,
    setOverride,
    clearOverride,
  ])

  return <MobileCtaCtx.Provider value={ctx}>{children}</MobileCtaCtx.Provider>
}

export function useMobileCta(): MobileCtaContextValue {
  const ctx = useContext(MobileCtaCtx)
  if (!ctx) {
    // Safe fallback when provider isn't mounted (e.g. /admin without provider).
    return { audience: "default" }
  }
  return ctx.value
}

type OverrideProps = {
  audience?: Audience
  productName?: string
  whatsappMessage?: string
  anchorFormId?: string
}

/**
 * Drop into any page's tree to temporarily override what the sticky bar shows.
 * Renders nothing; cleans up on unmount so other routes are not affected.
 */
export function MobileCtaOverride(props: OverrideProps) {
  const ctx = useContext(MobileCtaCtx)
  const { audience, productName, whatsappMessage, anchorFormId } = props

  useEffect(() => {
    if (!ctx) return
    const partial: Partial<MobileCtaContextValue> = {}
    if (audience) partial.audience = audience
    if (productName) partial.productName = productName
    if (whatsappMessage) partial.whatsappMessage = whatsappMessage
    if (anchorFormId) partial.anchorFormId = anchorFormId
    if (Object.keys(partial).length === 0) return
    ctx.setOverride(partial)
    return () => ctx.clearOverride()
  }, [ctx, audience, productName, whatsappMessage, anchorFormId])

  return null
}
