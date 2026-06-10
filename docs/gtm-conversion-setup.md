# Google Ads Conversion Tracking Setup Guide
## 100X Circle — GTM-5JMGCKRW

**Status:** GTM installed. DataLayer events firing. AW- IDs needed from Google Ads.  
**Container:** GTM-5JMGCKRW  
**Time to complete:** ~45 minutes  

---

## Overview

Your site already fires these dataLayer events on every qualifying user action:

| dataLayer Event | Where It Fires | Status |
|---|---|---|
| `rfq_submit` | Any RFQ form successful submit | ✅ Firing |
| `generate_lead` | Same moment as `rfq_submit` | ✅ Firing |
| `whatsapp_click` | Any WhatsApp link click | ✅ Firing |
| `phone_click` | Any `tel:` link click | ✅ Firing |

What is missing: Google Ads does not receive these events. GTM needs 5 tags (one per conversion action) with real AW- conversion IDs. This guide creates those.

---

## Step 1 — Create Conversion Actions in Google Ads

Do this once per action. Takes ~5 minutes per action (25 minutes total).

### 1a — Navigate to Conversions

1. Log in to **ads.google.com**
2. Click **Goals** in the left sidebar (or **Tools → Conversions** on older UI)
3. Click **+ New conversion action**
4. Select **Website**

### 1b — Create: RFQ Submit

| Field | Value |
|---|---|
| Category | Lead |
| Conversion name | `RFQ Submit` |
| Value | ₹2,000 (use same value each time — constant) |
| Count | One |
| Click-through conversion window | 30 days |
| View-through conversion window | 1 day |
| Include in "Conversions" | Yes |
| Attribution model | Data-driven (or Last click if data-driven not available) |

After creating: **Click "Tag setup" → "Use Google Tag Manager"**  
Copy the **Conversion ID** (`AW-XXXXXXXXX`) and **Conversion label** (`XXXXXXXXXXXXXX`)  
Save both values — you will need them in Step 2.

### 1c — Create: WhatsApp Click

| Field | Value |
|---|---|
| Category | Contact |
| Conversion name | `WhatsApp Click` |
| Value | ₹500 |
| Count | One |
| Include in "Conversions" | Yes |

### 1d — Create: Phone Call Click

| Field | Value |
|---|---|
| Category | Contact |
| Conversion name | `Phone Call Click` |
| Value | ₹500 |
| Count | One |
| Include in "Conversions" | Yes |

### 1e — Create: Lead Generated

| Field | Value |
|---|---|
| Category | Lead |
| Conversion name | `Lead Generated` |
| Value | ₹2,000 |
| Count | One |
| Include in "Conversions" | Yes |

> Note: This fires alongside RFQ Submit. Both will record, but Lead Generated will be the primary Smart Bidding signal once you have 30+ conversions/month.

### 1f — Create: Dealer Application

| Field | Value |
|---|---|
| Category | Lead |
| Conversion name | `Dealer Application` |
| Value | ₹5,000 |
| Count | One |
| Include in "Conversions" | Yes |

> This is triggered by WhatsApp clicks from dealer pages only (filtered by page path in GTM).

### 1g — Record Your IDs

After creating all 5, fill this table (the Conversion ID is the same for all — it is your account-level ID):

```
AW Conversion ID:  AW-_______________

RFQ Submit label:          _______________
WhatsApp Click label:      _______________
Phone Call Click label:    _______________
Lead Generated label:      _______________
Dealer Application label:  _______________
```

---

## Step 2 — Update the Code with Real IDs

Open `lib/growth-os/conversion-tracking.ts` and replace the placeholder values:

```typescript
// Line 19 — replace with your real account ID
export const AW_CONVERSION_ID = "AW-YOUR_REAL_ID_HERE"

// In CONVERSION_ACTIONS array, replace each conversionLabel:
// "REPLACE_RFQ_SUBMIT_LABEL"          → your RFQ Submit label
// "REPLACE_WHATSAPP_CLICK_LABEL"      → your WhatsApp Click label
// "REPLACE_PHONE_CLICK_LABEL"         → your Phone Call Click label
// "REPLACE_GENERATE_LEAD_LABEL"       → your Lead Generated label
// "REPLACE_DEALER_APPLICATION_LABEL"  → your Dealer Application label

// In buildGTMTags(), update the same 5 conversionLabel fields
```

Commit and push after updating. These values are not secrets (they are visible in the GTM container anyway).

---

## Step 3 — Configure GTM Tags

Log in to **tagmanager.google.com** → select container **GTM-5JMGCKRW**.

### 3a — Create DataLayer Variables

First create the variables that read values from the dataLayer:

**Variable 1: dlv - event**
- Type: Data Layer Variable
- Data Layer Variable Name: `event`
- Name: `dlv - event`

**Variable 2: dlv - value**
- Type: Data Layer Variable
- Data Layer Variable Name: `value`
- Name: `dlv - value`

**Variable 3: dlv - page_path** (for dealer page filter)
- Type: URL
- Component Type: Path
- Name: `dlv - page_path`

### 3b — Add Conversion Linker Tag (required — do first)

- Tag type: **Conversion Linker**
- Trigger: **All Pages**
- Name: `Conversion Linker`

This enables click ID passing. Without it, conversions will not attribute to ads.

### 3c — Create Custom Event Triggers

Create one trigger per dataLayer event:

**Trigger 1: Trigger — rfq_submit**
- Trigger type: Custom Event
- Event name: `rfq_submit`
- This trigger fires on: All Custom Events

**Trigger 2: Trigger — whatsapp_click**
- Trigger type: Custom Event  
- Event name: `whatsapp_click`

**Trigger 3: Trigger — phone_click**
- Trigger type: Custom Event
- Event name: `phone_click`

**Trigger 4: Trigger — generate_lead**
- Trigger type: Custom Event
- Event name: `generate_lead`

**Trigger 5: Trigger — whatsapp_click on dealer pages**
- Trigger type: Custom Event
- Event name: `whatsapp_click`
- Fire this trigger when: `dlv - page_path` **contains** `/dealer`
  - Add OR condition: `dlv - page_path` **contains** `/gem-oem-authorization`

### 3d — Create Google Ads Conversion Tags

Create one tag per conversion action:

---

**Tag 1: GA Ads — RFQ Submit**
- Tag type: **Google Ads Conversion Tracking**
- Conversion ID: `AW-YOUR_REAL_ID`
- Conversion Label: `YOUR_RFQ_SUBMIT_LABEL`
- Conversion Value: `{{dlv - value}}`
- Currency: `INR`
- Trigger: **Trigger — rfq_submit**

---

**Tag 2: GA Ads — WhatsApp Click**
- Tag type: Google Ads Conversion Tracking
- Conversion ID: `AW-YOUR_REAL_ID`
- Conversion Label: `YOUR_WHATSAPP_CLICK_LABEL`
- Conversion Value: `500`
- Currency: `INR`
- Trigger: **Trigger — whatsapp_click**

---

**Tag 3: GA Ads — Phone Click**
- Tag type: Google Ads Conversion Tracking
- Conversion ID: `AW-YOUR_REAL_ID`
- Conversion Label: `YOUR_PHONE_CLICK_LABEL`
- Conversion Value: `500`
- Currency: `INR`
- Trigger: **Trigger — phone_click**

---

**Tag 4: GA Ads — Generate Lead**
- Tag type: Google Ads Conversion Tracking
- Conversion ID: `AW-YOUR_REAL_ID`
- Conversion Label: `YOUR_GENERATE_LEAD_LABEL`
- Conversion Value: `{{dlv - value}}`
- Currency: `INR`
- Trigger: **Trigger — generate_lead**

---

**Tag 5: GA Ads — Dealer Application**
- Tag type: Google Ads Conversion Tracking
- Conversion ID: `AW-YOUR_REAL_ID`
- Conversion Label: `YOUR_DEALER_APPLICATION_LABEL`
- Conversion Value: `5000`
- Currency: `INR`
- Trigger: **Trigger — whatsapp_click on dealer pages**

---

## Step 4 — Validate in GTM Preview Mode

Before publishing:

1. Click **Preview** in GTM (top right)
2. Enter your production URL: `https://100xcircle.com`
3. GTM will open a debug session in a new tab

**Test 1 — RFQ Submit:**
1. Navigate to any page with the RFQ form (e.g., `/public-health-equipment`)
2. Fill out and submit the form
3. In GTM Preview panel, verify:
   - `rfq_submit` event appears in the event list
   - Tags fired: `GA Ads — RFQ Submit` and `GA Ads — Generate Lead`
   - Both show green (fired successfully)

**Test 2 — WhatsApp Click:**
1. Click any WhatsApp button
2. Verify `whatsapp_click` fires
3. Verify `GA Ads — WhatsApp Click` fires
4. Verify `GA Ads — Dealer Application` does NOT fire (we're not on a dealer page)

**Test 3 — Phone Click:**
1. Click any `tel:` phone link (mobile navbar, landing page CTAs)
2. Verify `phone_click` fires
3. Verify `GA Ads — Phone Click` fires

**Test 4 — Dealer Application filter:**
1. Navigate to `/become-a-dealer` or `/dealer-application`
2. Click WhatsApp
3. Verify `GA Ads — Dealer Application` fires
4. Verify `GA Ads — WhatsApp Click` does NOT fire on this page (dealer tag has priority)
   - To enforce this, add an exception to `Trigger — whatsapp_click`: fire on whatsapp_click EXCEPT when page_path contains `/dealer`

---

## Step 5 — Publish GTM Container

After validation passes:

1. Click **Submit** in GTM
2. Version name: `v2 — Google Ads conversion tracking (5 actions)`
3. Click **Publish**

---

## Step 6 — Verify in Google Ads

After publishing and generating 1 real test conversion:

1. Google Ads → **Goals → Conversions**
2. Each action should show status: **Recording conversions** (green)
3. This can take 24–48 hours after first real conversion fires

If status shows "No recent conversions" after 48 hours, use **Tag Assistant** Chrome extension for end-to-end debugging.

---

## Conversion Values Summary

| Action | Value | Rationale |
|---|---|---|
| RFQ Submit | ₹2,000 | High-intent lead, consistent with B2B pipeline value |
| WhatsApp Click | ₹500 | Contact intent; many clicks don't convert |
| Phone Click | ₹500 | Same as WhatsApp |
| Lead Generated | ₹2,000 | Primary Smart Bidding signal (same event as RFQ) |
| Dealer Application | ₹5,000 | Dealer onboarding has higher LTV than direct purchase |

These values are used by Google's Smart Bidding to optimize bids. Set them to reflect relative lead quality, not actual revenue.

---

## Next: Connect to Funnel B Campaign

Once all 5 conversions show "Recording" status in Google Ads:
1. Confirm at least 1 test conversion recorded for each action
2. Signal to proceed with Priority 3: Funnel B Campaign Build
3. Campaign remains PAUSED until conversion tracking is confirmed working
