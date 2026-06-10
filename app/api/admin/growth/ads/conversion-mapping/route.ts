import { NextResponse } from "next/server"
import { CONVERSION_ACTIONS, AW_CONVERSION_ID } from "@/lib/growth-os/conversion-tracking"

export const dynamic = "force-dynamic"

// Canonical mapping: which conversion actions apply to each ad group theme
const AD_GROUP_CONVERSION_MAP: Record<string, string[]> = {
  "Dealer Program":       ["RFQ Submit", "WhatsApp Click", "Phone Click", "Dealer Application"],
  "OEM Authorization":    ["RFQ Submit", "WhatsApp Click", "Phone Click", "OEM Authorization"],
  "GeM Reseller":         ["RFQ Submit", "WhatsApp Click", "Phone Click"],
}

export async function GET() {
  const conversionIdConfigured = !AW_CONVERSION_ID.includes("REPLACE")

  const actions = CONVERSION_ACTIONS.map(a => ({
    name:            a.name,
    dataLayerEvent:  a.dataLayerEvent,
    category:        a.category,
    defaultValue:    a.defaultValue,
    countingMode:    a.countingMode,
    description:     a.description,
    gtmPageFilter:   a.gtmPageFilter ?? null,
    isRevenue:       a.isRevenue,
    labelConfigured: !a.conversionLabel.includes("REPLACE"),
  }))

  const totalValue = CONVERSION_ACTIONS.reduce((s, a) => s + a.defaultValue, 0)
  const allLabelsConfigured = actions.every(a => a.labelConfigured)

  return NextResponse.json({
    conversionIdConfigured,
    allLabelsConfigured,
    awConversionId:    conversionIdConfigured ? AW_CONVERSION_ID : "NOT_SET",
    gtmContainer:      "GTM-5JMGCKRW",
    setupDocUrl:       "/docs/gtm-conversion-setup.md",
    actions,
    totalValue,
    adGroupMap:        AD_GROUP_CONVERSION_MAP,
    status:            conversionIdConfigured && allLabelsConfigured ? "configured" : "pending_setup",
  })
}
