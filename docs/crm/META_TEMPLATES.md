# Meta WhatsApp templates: fogging CRM (draft v1, 2026-10-10)

The owner submits these by hand in WhatsApp Manager, under the **fogging WABA**.
- Each template is submitted in two languages, `en_US` and `hi`, under the same name. The CRM picks the language per contact (`preferredLanguage`).
- Variables are positional (`{{1}}`, `{{2}}` …). Meta requires a sample value for each one; samples are given below.
- Signature line: "– 100X Circle". Change it if you prefer a different sign-off.

> **Timing:** templates belong to a WABA. They can only be submitted once the new fogging number's WABA exists, i.e. after Embedded Signup. Submit them the same day you register the number.

## Not templates (session messages, no approval needed)
These are replies within 24 h of the customer's own message, so they are sent as plain text. The text is configurable in CRM settings.
- **Auto-acknowledge (first message from a new number)**
  - en: "Thanks for contacting 100X Circle. We've received your message and our team will reply shortly."
  - hi: "100X Circle से संपर्क करने के लिए धन्यवाद। आपका संदेश मिल गया है, हमारी टीम जल्द ही जवाब देगी।"
- **Outside business hours**
  - en: "Thanks for your message. Our office hours are {hours}. We'll reply as soon as we're back."
  - hi: "आपके संदेश के लिए धन्यवाद। हमारा कार्यालय समय {hours} है। हम जल्द ही जवाब देंगे।"
- **STOP confirmation**
  - en: "You've been unsubscribed from promotional messages. Reply START to subscribe again."
  - hi: "आपको प्रमोशनल संदेशों से हटा दिया गया है। फिर से जुड़ने के लिए START लिखें।"

---

## 1. `fog_quote_document`: send the quotation PDF (step 6)
**Category:** UTILITY. **Header:** DOCUMENT (the quotation PDF, attached at send time). **Used when:** the quotation goes out more than 24 h after the customer's last message. Inside the window it is sent as a plain document message.

| Var | Meaning | Sample |
|---|---|---|
| {{1}} | customer name | Ramesh Kumar |
| {{2}} | quotation no. + version | Q-2026-0142 v2 |
| {{3}} | product / model | Thermal Fogger TF-35 |
| {{4}} | total amount incl. GST | 48,380 |
| {{5}} | valid until | 25 Oct 2026 |

**en_US**
```
Hello {{1}}, please find attached quotation {{2}} for {{3}}.
Total amount: ₹{{4}} (incl. GST). This quotation is valid until {{5}}.
Reply to this message if you have any questions.
– 100X Circle
```
**hi**
```
नमस्ते {{1}}, {{3}} के लिए कोटेशन {{2}} संलग्न है।
कुल राशि: ₹{{4}} (GST सहित)। यह कोटेशन {{5}} तक मान्य है।
किसी भी सवाल के लिए इस संदेश का जवाब दें।
– 100X Circle
```

## 2. `fog_quote_followup`: customer quotation follow-up (step 7, opt-in only)
**Category:** UTILITY. Meta may reclassify it as MARKETING; if so, accept that, since it still works and only the price changes. **Buttons (quick reply):** "Need changes" / "Will confirm soon".

| Var | Meaning | Sample |
|---|---|---|
| {{1}} | customer name | Ramesh Kumar |
| {{2}} | quotation date | 10 Oct 2026 |
| {{3}} | product / model | Thermal Fogger TF-35 |
| {{4}} | quotation no. | Q-2026-0142 |

**en_US**
```
Hello {{1}}, we sent you quotation {{4}} for {{3}} on {{2}}.
Do you have any questions, or would you like any changes? Reply to this message and our team will help.
– 100X Circle
```
**hi**
```
नमस्ते {{1}}, हमने {{2}} को आपको {{3}} के लिए कोटेशन {{4}} भेजा था।
क्या आपका कोई सवाल है या कोई बदलाव चाहिए? इस संदेश का जवाब दें, हमारी टीम आपकी मदद करेगी।
– 100X Circle
```
hi buttons: "बदलाव चाहिए" / "जल्द कन्फर्म करेंगे"

## 3. `fog_service_reminder`: repeat-service / AMC reminder (step 7 + broadcasts to Closed-Won)
**Category:** UTILITY. **Buttons (quick reply):** "Book service" / "Not now".

| Var | Meaning | Sample |
|---|---|---|
| {{1}} | customer name | Ramesh Kumar |
| {{2}} | machine model | Thermal Fogger TF-35 |
| {{3}} | purchase / last service date | 12 Apr 2026 |

**en_US**
```
Hello {{1}}, your {{2}} was last serviced on {{3}} and is now due for its routine service.
Tap "Book service" to schedule a visit, or reply to this message with any questions.
– 100X Circle
```
**hi**
```
नमस्ते {{1}}, आपकी {{2}} मशीन की पिछली सर्विस {{3}} को हुई थी। अब इसकी नियमित सर्विस का समय हो गया है।
सर्विस बुक करने के लिए "सर्विस बुक करें" दबाएँ, या किसी सवाल के लिए इस संदेश का जवाब दें।
– 100X Circle
```
hi buttons: "सर्विस बुक करें" / "अभी नहीं"

## 4. `fog_team_task`: internal task push to the assignee (step 7)
**Category:** UTILITY. **en_US only** (team-facing). It is sent to a teammate's WhatsApp, so the teammate must not have opted out.

| Var | Meaning | Sample |
|---|---|---|
| {{1}} | assignee name | Vaibhav |
| {{2}} | task | Follow up on quotation Q-2026-0142 (no reply in 3 days) |
| {{3}} | customer name | Ramesh Kumar |
| {{4}} | customer mobile | +91 98XXXXXX10 |
| {{5}} | due | 13 Oct 2026, 11:00 |

```
Task reminder for {{1}}: {{2}}
Customer: {{3}} ({{4}})
Due: {{5}}
Open the 100X CRM to update this lead.
```

## 5. `fog_product_offer`: broadcast (step 9)
**Category:** MARKETING. **Buttons (quick reply):** "Get quotation" / "Stop promotions". The second button feeds the opt-out list, together with a typed "STOP".
- I have not added product claims (GeM listing, certifications, etc.). Add any you want included and I will keep both language versions in sync.

| Var | Meaning | Sample |
|---|---|---|
| {{1}} | contact name | Ramesh Kumar |
| {{2}} | product / model | Thermal Fogger TF-35 |
| {{3}} | price (INR, excl./incl. GST as you prefer) | 41,000 |

**en_US**
```
Hello {{1}}, {{2}} is now available at ₹{{3}}.
Reply to this message for a quotation or a demo.
– 100X Circle
```
**hi**
```
नमस्ते {{1}}, {{2}} अब ₹{{3}} में उपलब्ध है।
कोटेशन या डेमो के लिए इस संदेश का जवाब दें।
– 100X Circle
```
hi buttons: "कोटेशन चाहिए" / "प्रमोशन बंद करें"

---
**Submission checklist (owner):**
- Enter each name exactly as written above.
- Add both languages for templates 1, 2, 3 and 5.
- Paste the sample values.
- Set the header type DOCUMENT on template 1.
- Report back the status (approved/rejected plus reason) per name/language.
