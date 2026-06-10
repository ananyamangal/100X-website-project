/**
 * Growth OS — Google Ads Conversion Tracking Configuration.
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

export const CONVERSION_ACTIONS: ConversionAction[] = [
  {
    name:           "RFQ Submit",
    conversionLabel: "REPLACE_RFQ_SUBMIT_LABEL",
    dataLayerEvent:  "rfq_submit",
    category:        "lead",
    defaultValue:    2000,
    countingMode:    "ONE_PER_CLICK",
    description:     "User submitted the Request for Quote form (any page). High-intent dealer/buyer lead.",
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
    description:     "User clicked a WhatsApp link (wa.me). Tracked globally across all pages.",
    gtmTriggerType:  "Custom Event",
    isRevenue:       false,
  },
  {
    name:           "Phone Call Click",
    conversionLabel: "REPLACE_PHONE_CLICK_LABEL",
    dataLayerEvent:  "phone_click",
    category:        "contact",
    defaultValue:    500,
    countingMode:    "ONE_PER_CLICK",
    description:     "User clicked a tel: phone link. Tracked globally. MobileCtaBar is primary source.",
    gtmTriggerType:  "Custom Event",
    isRevenue:       false,
  },
  {
    name:           "Lead Generated",
    conversionLabel: "REPLACE_GENERATE_LEAD_LABEL",
    dataLayerEvent:  "generate_lead",
    category:        "lead",
    defaultValue:    2000,
    countingMode:    "ONE_PER_CLICK",
    description:     "Fires alongside rfq_submit. Use as the primary Smart Bidding signal once 30+ conversions/month.",
    gtmTriggerType:  "Custom Event",
    isRevenue:       true,
  },
  {
    name:           "Dealer Application",
    conversionLabel: "REPLACE_DEALER_APPLICATION_LABEL",
    dataLayerEvent:  "whatsapp_click",
    category:        "lead",
    defaultValue:    5000,
    description:     "WhatsApp click from /dealer-application or /become-a-dealer pages. High-value Funnel A signal.",
    gtmTriggerType:  "Custom Event",
    countingMode:    "ONE_PER_CLICK",
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
      conversionValue: "{{dlv - value}}",  // dynamic from dataLayer value field
      currency:        "INR",
      triggerName:     "Trigger — rfq_submit",
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
      triggerName:     "Trigger — whatsapp_click",
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
      triggerName:     "Trigger — phone_click",
      triggerType:     "Custom Event",
      triggerEvent:    "phone_click",
    },
    {
      tagName:         "GA Ads — Generate Lead",
      tagType:         "Google Ads Conversion Tracking",
      conversionId:    AW_CONVERSION_ID,
      conversionLabel: "REPLACE_GENERATE_LEAD_LABEL",
      conversionValue: "{{dlv - value}}",
      currency:        "INR",
      triggerName:     "Trigger — generate_lead",
      triggerType:     "Custom Event",
      triggerEvent:    "generate_lead",
    },
    {
      tagName:         "GA Ads — Dealer Application (WhatsApp from dealer pages)",
      tagType:         "Google Ads Conversion Tracking",
      conversionId:    AW_CONVERSION_ID,
      conversionLabel: "REPLACE_DEALER_APPLICATION_LABEL",
      conversionValue: "5000",
      currency:        "INR",
      triggerName:     "Trigger — whatsapp_click on dealer pages",
      triggerType:     "Custom Event",
      triggerEvent:    "whatsapp_click",
      triggerFilter:   "Page Path contains /dealer-application OR /become-a-dealer OR /gem-oem-authorization",
    },
  ]
}

// ── Validation Checklist ──────────────────────────────────────────────────────
// Run this before enabling any Google Ads campaigns.

export const GTM_VALIDATION_CHECKLIST = [
  { step: 1, check: "Conversion Linker tag installed (all pages trigger)", critical: true },
  { step: 2, check: "AW_CONVERSION_ID replaced with real value in Google Ads account", critical: true },
  { step: 3, check: "All 5 conversion labels replaced with real labels from Google Ads", critical: true },
  { step: 4, check: "GTM Preview: submit RFQ form → rfq_submit fires → GA Ads tag fires", critical: true },
  { step: 5, check: "GTM Preview: click WhatsApp link → whatsapp_click fires → GA Ads tag fires", critical: true },
  { step: 6, check: "GTM Preview: click phone link → phone_click fires → GA Ads tag fires", critical: true },
  { step: 7, check: "GTM Preview: navigate to /dealer-application → click WA → dealer tag fires (not generic WA tag)", critical: true },
  { step: 8, check: "Google Ads → Goals → Conversions: all 5 actions show 'Recording conversions' status", critical: true },
  { step: 9, check: "DataLayer variable dlv - value configured in GTM for dynamic value passthrough", critical: false },
  { step: 10, check: "Tag Assistant Chrome extension: end-to-end conversion path verified on production URL", critical: true },
]
