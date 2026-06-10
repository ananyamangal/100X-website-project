# Google Ads Conversion Tracking Setup
## 100X Circle — GTM-5JMGCKRW

**Estimated time:** 30 minutes  
**Container:** GTM-5JMGCKRW  
**GTM import file:** `docs/gtm-container-import.json`

---

## What Already Exists

The site fires these dataLayer events in production today:

| Event | Fires when | Status |
|---|---|---|
| `rfq_submit` | RFQ form submitted successfully | ✅ Live |
| `whatsapp_click` | Any WhatsApp link clicked | ✅ Live |
| `phone_click` | Any `tel:` link clicked | ✅ Live |

GTM-5JMGCKRW is installed in `app/layout.tsx`. The events fire but no Google Ads conversion tags exist yet. This guide connects them.

---

## Step 1 — Create 5 Conversion Actions in Google Ads

Log in to **ads.google.com** → Goals → Conversions → **+ New conversion action** → Website.

Create each action exactly as specified:

### Action 1: RFQ Submit
| Field | Value |
|---|---|
| Category | Lead |
| Conversion name | `RFQ Submit` |
| Value | ₹2,000 (Use the same value each time) |
| Count | One |
| Click-through window | 30 days |
| View-through window | 1 day |
| Include in "Conversions" | Yes |
| Attribution model | Data-driven |

### Action 2: WhatsApp Click
| Field | Value |
|---|---|
| Category | Contact |
| Conversion name | `WhatsApp Click` |
| Value | ₹500 |
| Count | One |
| Include in "Conversions" | Yes |

### Action 3: Phone Click
| Field | Value |
|---|---|
| Category | Contact |
| Conversion name | `Phone Click` |
| Value | ₹500 |
| Count | One |
| Include in "Conversions" | Yes |

### Action 4: Dealer Application
| Field | Value |
|---|---|
| Category | Lead |
| Conversion name | `Dealer Application` |
| Value | ₹5,000 |
| Count | One |
| Include in "Conversions" | Yes |

### Action 5: OEM Authorization
| Field | Value |
|---|---|
| Category | Lead |
| Conversion name | `OEM Authorization` |
| Value | ₹5,000 |
| Count | One |
| Include in "Conversions" | Yes |

### After creating each action:

Click **"Tag setup"** → **"Use Google Tag Manager"**

You will see two values — copy both:
- **Conversion ID** — looks like `AW-1234567890` (the number after AW- is what GTM needs)
- **Conversion label** — looks like `AbCd_EfGhIjKlMn`

Record all 5 sets here:

```
Conversion ID (same for all):  AW-_______________
  Numeric part only:           _______________

RFQ Submit label:              _______________
WhatsApp Click label:          _______________
Phone Click label:             _______________
Dealer Application label:      _______________
OEM Authorization label:       _______________
```

---

## Step 2 — Update Placeholders in the Import File

Open `docs/gtm-container-import.json` and use Find & Replace (Ctrl+H in VS Code):

| Find | Replace with |
|---|---|
| `REPLACE_AW_NUMERIC_ID` | The numeric part of your AW- ID (e.g., `1234567890`) |
| `REPLACE_RFQ_SUBMIT_LABEL` | Your RFQ Submit label |
| `REPLACE_WHATSAPP_CLICK_LABEL` | Your WhatsApp Click label |
| `REPLACE_PHONE_CLICK_LABEL` | Your Phone Click label |
| `REPLACE_DEALER_APPLICATION_LABEL` | Your Dealer Application label |
| `REPLACE_OEM_AUTH_LABEL` | Your OEM Authorization label |

`REPLACE_AW_NUMERIC_ID` appears 5 times (once per tag) — replace all.

Also update `lib/growth-os/conversion-tracking.ts`:
- Line 19: `AW_CONVERSION_ID` → your full `AW-XXXXXXXXX` string
- Each `conversionLabel` field → matching label

---

## Step 3 — Import the Container into GTM

1. Go to **tagmanager.google.com** → select container **GTM-5JMGCKRW**
2. Click **Admin** (top nav) → **Import Container**
3. Upload `docs/gtm-container-import.json`
4. Choose workspace: **Default Workspace** (or create a new one named "Conversion Tracking")
5. Merge option: **Merge** → **Rename conflicting tags, triggers, and variables**
6. Click **Confirm**

GTM will import:
- 1 variable: `dlv - value` (reads `value` from dataLayer)
- 6 triggers: All Pages, rfq_submit, whatsapp_click, phone_click, whatsapp dealer pages, whatsapp OEM page
- 6 tags: Conversion Linker + 5 Google Ads conversion tags

---

## Step 4 — Verify in GTM Preview Mode

Click **Preview** in the top-right of GTM. This opens a debug session on your production site.

Run each test:

**Test 1 — RFQ Submit**
1. Navigate to `https://100xcircle.com/public-health-equipment`
2. Fill in the RFQ form and submit
3. GTM Preview should show:
   - Event: `rfq_submit`
   - Tags fired: `GA Ads — RFQ Submit` (green)

**Test 2 — WhatsApp Click (any page)**
1. Click any WhatsApp button
2. GTM Preview should show:
   - Event: `whatsapp_click`
   - Tags fired: `GA Ads — WhatsApp Click` (green)
   - Tags NOT fired: Dealer Application, OEM Authorization (we're not on those pages)

**Test 3 — Phone Click**
1. On mobile (or mobile view in DevTools), click the phone bar
2. GTM Preview should show:
   - Event: `phone_click`
   - Tags fired: `GA Ads — Phone Click` (green)

**Test 4 — Dealer Application**
1. Navigate to `/become-a-dealer`
2. Click WhatsApp
3. GTM Preview should show:
   - Event: `whatsapp_click`
   - Tags fired: `GA Ads — WhatsApp Click` AND `GA Ads — Dealer Application` (both green)
   - `GA Ads — OEM Authorization` should NOT fire

**Test 5 — OEM Authorization**
1. Navigate to `/gem-oem-authorization`
2. Click WhatsApp
3. GTM Preview should show:
   - Tags fired: `GA Ads — WhatsApp Click` AND `GA Ads — OEM Authorization` (both green)
   - `GA Ads — Dealer Application` should NOT fire

---

## Step 5 — Publish the Container

After all 5 tests pass:

1. Click **Submit** in GTM
2. Version name: `v2 — Google Ads Conversion Tracking (5 actions)`
3. Click **Publish**

---

## Step 6 — Verify in Google Ads

After publishing and generating at least 1 real conversion:

1. Google Ads → **Goals → Conversions**
2. All 5 actions should show **"Recording conversions"** (green)
3. Allow 24–48 hours after first real conversion fires for status to update

If status stays "No recent conversions" after 48 hours:
- Install **Tag Assistant** Chrome extension
- Visit your site — it will show which tags fired and any errors

---

## Conversion Value Summary

| Action | Value | Smart Bidding weight |
|---|---|---|
| RFQ Submit | ₹2,000 | Primary signal |
| WhatsApp Click | ₹500 | Secondary |
| Phone Click | ₹500 | Secondary |
| Dealer Application | ₹5,000 | Funnel A primary |
| OEM Authorization | ₹5,000 | Funnel A primary |

Values reflect relative lead quality, not actual revenue. Adjust after 30 days of data.

---

## Next Step After Verification

Once all 5 actions show "Recording conversions":

→ Activate Funnel B campaign (see `docs/funnel-b-campaign-draft.md`)  
→ Campaign is pre-built as PAUSED draft — only change status to ENABLED
