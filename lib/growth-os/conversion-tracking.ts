/**
 * Growth OS — Google Ads Conversion Tracking Configuration.
 *
 * ⚠️ PARKED / NOT LIVE CONFIG (as of 2026-07-30) ⚠️
 * Nothing in this file is wired into the real site. AW_CONVERSION_ID and
 * every CONVERSION_LABEL below are still literal placeholder strings, and
 * this registry is never imported or read by any live code path -- the
 * one conversion action that actually works in production ("Ads - Request
 * Quote") was wired ad hoc directly in the relevant form components
 * (see components/oem/PartnerApplyForm.tsx, components/RFQPopup.tsx,
 * components/oem/OemAuthForm.tsx -- search for pushDataLayer + generate_lead)
 * rather than through this registry. Treat this file as a design proposal /
 * reference for what COULD be set up in Google Ads, not as documentation of
 * what currently exists. Note its OEM Authorization entry's gtmPageFilter
 * ("/gem-oem-authorization") is also stale -- the real form lives at
 * /oem-authorization-letter -- so do not wire this file up as-is without
 * fixing that first.
 *
 * This module defines the canonical conversion action registry.
 * It maps existing dataLayer events (already firing in production)
 * to Google Ads conversion actions via GTM.
 *
 * HOW TO USE:
 *   1. Create conversion actions in Google Ads (see docs/gtm-conversion-setup.md)
 *   2. Replace AW_CONVERSION_ID and each CONVERSION_LABEL placeholder
 *      with real values from your Google Ads account
 *   3. Create GTM tags using the trigger mapping in CONVERSION_ACTIONS below
 *   4. Publish GTM container and verify in GTM Preview mode
 */

// ── Google Ads Account Configuration ─────────────────────────────────────────
// Replace with your actual Google Ads account conversion ID.
// Found in: Google Ads → Goals → Conversions → [any conversion] → Tag setup
export const AW_CONVERSION_ID = "AW-REPLACE_WITH_YOUR_ID"

// ── Conversion Action Registry ────────────────────────────────────────────────
// Each entry maps a dataLayer event (already firing in production) to a
// Google Ads conversion action. These are the 5 actions to create in Google Ads.

export interface ConversionAction {
  name:            string     // Name as it appears in Google Ads
  conversionLabel: string     // From Google Ads → Goals → Conversions → Tag setup
  dataLayerEvent:  string     // dataLayer event that triggers this conversion
  category:        "lead" | "contact" | "engagement"
  defaultValue:    number     // Value in INR assigned to this conversion
  countingMode:    "ONE_PER_CLICK" | "MANY_PER_CLICK"
  description:     string
  gtmTriggerType:  "Custom Event"
  isRevenue:       boolean    // Whether this is a direct revenue signal
}

// gtmPageFilter: page path substring that scopes this conversion (undefined = all pages)
export interface ConversionAction {
  name:            string
  conversionLabel: string
  dataLayerEvent:  string
  category:        "lead" | "contact" | "engagement"
  defaultValue:    number
  countingMode:    "ONE_PER_CLICK" | "MANY_PER_CLICK"
  description:     string
  gtmTriggerType:  "Custom Event"
  gtmPageFilter?:  string
  isRevenue:       boolean
}

export const CONVERSION_ACTIONS: ConversionAction[] = [
  {
    name:           "RFQ Submit",
    conversionLabel: "REPLACE_RFQ_SUBMIT_LABEL",
    dataLayerEvent:  "rfq_submit",
    category:        "lead",
    defaultValue:    2000,
    countingMode:    "ONE_PER_CLICK",
    description:     "RFQ form submitted on any page. Primary Funnel B conversion signal.",
    gtmTriggerType:  "Custom Event",
    isRevenue:       true,
  },
  {
    name:           "WhatsApp Click",
    conversionLabel: "REPLACE_WHATSAPP_CLICK_LABEL",
    dataLayerEvent:  "whatsapp_click",
    category:        "contact",
    defaultValue:    500,
    countingMode:    "ONE_PER_CLICK",
    description:     "WhatsApp link clicked — any page. Fires alongside the page-specific actions below.",
    gtmTriggerType:  "Custom Event",
    isRevenue:       false,
  },
  {
    name:           "Phone Click",
    conversionLabel: "REPLACE_PHONE_CLICK_LABEL",
    dataLayerEvent:  "phone_click",
    category:        "contact",
    defaultValue:    500,
    countingMode:    "ONE_PER_CLICK",
    description:     "tel: phone link clicked — any page. MobileCtaBar is primary source.",
    gtmTriggerType:  "Custom Event",
    isRevenue:       false,
  },
  {
    name:           "Dealer Application",
    conversionLabel: "REPLACE_DEALER_APPLICATION_LABEL",
    dataLayerEvent:  "whatsapp_click",
    category:        "lead",
    defaultValue:    5000,
    countingMode:    "ONE_PER_CLICK",
    description:     "WhatsApp click from dealer pages. High-value Funnel A signal.",
    gtmTriggerType:  "Custom Event",
    gtmPageFilter:   "/dealer",
    isRevenue:       true,
  },
  {
    name:           "OEM Authorization",
    conversionLabel: "REPLACE_OEM_AUTH_LABEL",
    dataLayerEvent:  "whatsapp_click",
    category:        "lead",
    defaultValue:    5000,
    countingMode:    "ONE_PER_CLICK",
    description:     "WhatsApp click from /gem-oem-authorization. High-value Funnel A signal.",
    gtmTriggerType:  "Custom Event",
    gtmPageFilter:   "/gem-oem-authorization",
    isRevenue:       true,
  },
]

// ── GTM Tag Configuration Export ──────────────────────────────────────────────
// Use this to document the GTM setup. Each tag maps 1:1 to a conversion action.

export interface GTMTag {
  tagName:        string
  tagType:        "Google Ads Conversion Tracking"
  conversionId:   string
  conversionLabel:string
  conversionValue:string   // dynamic or static
  currency:       "INR"
  triggerName:    string
  triggerType:    "Custom Event"
  triggerEvent:   string
  triggerFilter?: string   // optional page path filter
}

export function buildGTMTags(): GTMTag[] {
  return [
    {
      tagName:         "GA Ads — RFQ Submit",
      tagType:         "Google Ads Conversion Tracking",
      conversionId:    AW_CONVERSION_ID,
      conversionLabel: "REPLACE_RFQ_SUBMIT_LABEL",
      conversionValue: "{{dlv - value}}",
      currency:        "INR",
      triggerName:     "CE — rfq_submit",
      triggerType:     "Custom Event",
      triggerEvent:    "rfq_submit",
    },
    {
      tagName:         "GA Ads — WhatsApp Click",
      tagType:         "Google Ads Conversion Tracking",
      conversionId:    AW_CONVERSION_ID,
      conversionLabel: "REPLACE_WHATSAPP_CLICK_LABEL",
      conversionValue: "500",
      currency:        "INR",
      triggerName:     "CE — whatsapp_click",
      triggerType:     "Custom Event",
      triggerEvent:    "whatsapp_click",
    },
    {
      tagName:         "GA Ads — Phone Click",
      tagType:         "Google Ads Conversion Tracking",
      conversionId:    AW_CONVERSION_ID,
      conversionLabel: "REPLACE_PHONE_CLICK_LABEL",
      conversionValue: "500",
      currency:        "INR",
      triggerName:     "CE — phone_click",
      triggerType:     "Custom Event",
      triggerEvent:    "phone_click",
    },
    {
      tagName:         "GA Ads — Dealer Application",
      tagType:         "Google Ads Conversion Tracking",
      conversionId:    AW_CONVERSION_ID,
      conversionLabel: "REPLACE_DEALER_APPLICATION_LABEL",
      conversionValue: "5000",
      currency:        "INR",
      triggerName:     "CE — whatsapp_click (dealer pages)",
      triggerType:     "Custom Event",
      triggerEvent:    "whatsapp_click",
      triggerFilter:   "Page Path contains /dealer",
    },
    {
      tagName:         "GA Ads — OEM Authorization",
      tagType:         "Google Ads Conversion Tracking",
      conversionId:    AW_CONVERSION_ID,
      conversionLabel: "REPLACE_OEM_AUTH_LABEL",
      conversionValue: "5000",
      currency:        "INR",
      triggerName:     "CE — whatsapp_click (OEM page)",
      triggerType:     "Custom Event",
      triggerEvent:    "whatsapp_click",
      triggerFilter:   "Page Path contains /gem-oem-authorization",
    },
  ]
}

// ── Validation Checklist ──────────────────────────────────────────────────────
// Run this before enabling any Google Ads campaigns.

export const GTM_VALIDATION_CHECKLIST = [
  { step: 1,  check: "GTM container JSON imported into GTM-5JMGCKRW (docs/gtm-container-import.json)", critical: true },
  { step: 2,  check: "Conversion Linker tag present and firing on All Pages", critical: true },
  { step: 3,  check: "AW_CONVERSION_ID filled in — numeric ID from Google Ads Goals → Conversions → Tag setup", critical: true },
  { step: 4,  check: "All 5 conversion labels filled in from Google Ads (one per action)", critical: true },
  { step: 5,  check: "GTM Preview: /public-health-equipment → submit RFQ → rfq_submit fires → GA Ads RFQ Submit tag fires", critical: true },
  { step: 6,  check: "GTM Preview: any page → WhatsApp click → whatsapp_click fires → GA Ads WhatsApp Click tag fires", critical: true },
  { step: 7,  check: "GTM Preview: any page → tel: click → phone_click fires → GA Ads Phone Click tag fires", critical: true },
  { step: 8,  check: "GTM Preview: /become-a-dealer → WhatsApp click → Dealer Application tag fires (not generic WA tag)", critical: true },
  { step: 9,  check: "GTM Preview: /gem-oem-authorization → WhatsApp click → OEM Authorization tag fires", critical: true },
  { step: 10, check: "GTM container published (Submit → Publish)", critical: true },
  { step: 11, check: "Google Ads → Goals → Conversions: all 5 actions show 'Recording conversions' within 24 h", critical: true },
  { step: 12, check: "Tag Assistant extension confirms conversion tag fires end-to-end on production URL", critical: false },
]
