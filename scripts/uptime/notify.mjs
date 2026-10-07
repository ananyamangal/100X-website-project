// Alert delivery for the uptime workflow. Every address, key and token comes from the
// environment (GitHub repository secrets) — nothing is hard-coded here or in the README.
//
// E-mail is mandatory (the job fails loudly if it is not configured). WhatsApp, Telegram
// and ntfy are optional; Telegram / ntfy act as the free fallback when WhatsApp is not
// configured or fails (or always, with the ALERT_ALWAYS_FALLBACK repository variable).
// DRY_RUN=true prints what would be sent instead of sending it (local testing).

const env = (name) => (process.env[name] ?? "").trim()
const list = (name) => env(name).split(",").map((s) => s.trim()).filter(Boolean)
const DRY_RUN = env("DRY_RUN").toLowerCase() === "true"

export function describeConfig() {
  const email = env("SMTP_HOST") ? "smtp" : env("RESEND_API_KEY") ? "resend" : env("BREVO_API_KEY") ? "brevo" : env("SENDGRID_API_KEY") ? "sendgrid" : null
  const whatsapp = env("WHATSAPP_TOKEN") && env("WHATSAPP_PHONE_NUMBER_ID") ? "meta" : env("TWILIO_ACCOUNT_SID") && env("TWILIO_AUTH_TOKEN") ? "twilio" : null
  return {
    email,
    recipients: list("ALERT_EMAIL_TO").length,
    whatsapp: whatsapp && list("WHATSAPP_TO").length ? whatsapp : null,
    telegram: !!(env("TELEGRAM_BOT_TOKEN") && env("TELEGRAM_CHAT_ID")),
    ntfy: !!env("NTFY_TOPIC"),
    dryRun: DRY_RUN,
  }
}

/** Throws with an actionable message when the mandatory e-mail channel is not configured. */
export function assertAlertConfig() {
  const problems = []
  if (list("ALERT_EMAIL_TO").length === 0) problems.push("ALERT_EMAIL_TO is not set (comma-separated recipient addresses)")
  const c = describeConfig()
  if (!c.email) problems.push("no e-mail transport: set SMTP_HOST + SMTP_PORT + SMTP_USER + SMTP_PASS, or RESEND_API_KEY, or BREVO_API_KEY, or SENDGRID_API_KEY")
  if (c.email === "smtp" && !(env("SMTP_USER") && env("SMTP_PASS"))) problems.push("SMTP_HOST is set but SMTP_USER / SMTP_PASS are missing")
  if (c.email && c.email !== "smtp" && !env("ALERT_EMAIL_FROM")) problems.push(`ALERT_EMAIL_FROM is required with the ${c.email} transport`)
  if (problems.length) {
    throw new Error("Alert configuration is incomplete — add the missing GitHub repository secrets:\n  - " + problems.join("\n  - "))
  }
}

async function postJson(url, body, headers = {}) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res
}

async function sendEmail({ subject, text }) {
  const to = list("ALERT_EMAIL_TO")
  const transport = describeConfig().email
  const from = env("ALERT_EMAIL_FROM") || env("SMTP_USER")
  if (transport === "smtp") {
    const { default: nodemailer } = await import("nodemailer")
    const port = Number(env("SMTP_PORT") || 465)
    const t = nodemailer.createTransport({ host: env("SMTP_HOST"), port, secure: port === 465, auth: { user: env("SMTP_USER"), pass: env("SMTP_PASS") } })
    await t.sendMail({ from, to: to.join(", "), subject, text })
    return
  }
  if (transport === "resend") {
    await postJson("https://api.resend.com/emails", { from, to, subject, text }, { authorization: `Bearer ${env("RESEND_API_KEY")}` })
    return
  }
  if (transport === "brevo") {
    await postJson(
      "https://api.brevo.com/v3/smtp/email",
      { sender: { email: from }, to: to.map((email) => ({ email })), subject, textContent: text },
      { "api-key": env("BREVO_API_KEY") },
    )
    return
  }
  if (transport === "sendgrid") {
    await postJson(
      "https://api.sendgrid.com/v3/mail/send",
      { personalizations: [{ to: to.map((email) => ({ email })) }], from: { email: from }, subject, content: [{ type: "text/plain", value: text }] },
      { authorization: `Bearer ${env("SENDGRID_API_KEY")}` },
    )
    return
  }
  throw new Error("no e-mail transport configured")
}

// WhatsApp business-initiated messages must use an approved template. The template body
// is expected to contain a single {{1}} parameter that receives the whole alert text.
// Meta rejects newlines/tabs inside parameters, so the text is flattened to one line.
async function sendWhatsApp({ subject, text }) {
  const flat = `${subject} — ${text}`.replace(/\s*\n+\s*/g, " | ").replace(/\t/g, " ").slice(0, 1000)
  const to = list("WHATSAPP_TO")
  const c = describeConfig()
  if (c.whatsapp === "meta") {
    for (const number of to) {
      await postJson(
        `https://graph.facebook.com/v21.0/${env("WHATSAPP_PHONE_NUMBER_ID")}/messages`,
        {
          messaging_product: "whatsapp",
          to: number.replace(/[^0-9]/g, ""),
          type: "template",
          template: {
            name: env("WHATSAPP_TEMPLATE_NAME") || "site_alert",
            language: { code: env("WHATSAPP_TEMPLATE_LANG") || "en_US" },
            components: [{ type: "body", parameters: [{ type: "text", text: flat }] }],
          },
        },
        { authorization: `Bearer ${env("WHATSAPP_TOKEN")}` },
      )
    }
    return
  }
  if (c.whatsapp === "twilio") {
    const sid = env("TWILIO_ACCOUNT_SID")
    const auth = Buffer.from(`${sid}:${env("TWILIO_AUTH_TOKEN")}`).toString("base64")
    for (const number of to) {
      const form = new URLSearchParams({ From: env("TWILIO_WHATSAPP_FROM"), To: `whatsapp:${number.startsWith("+") ? number : "+" + number}` })
      if (env("TWILIO_CONTENT_SID")) {
        form.set("ContentSid", env("TWILIO_CONTENT_SID"))
        form.set("ContentVariables", JSON.stringify({ 1: flat }))
      } else {
        form.set("Body", flat)
      }
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: { authorization: `Basic ${auth}` },
        body: form,
      })
      if (!res.ok) throw new Error(`twilio responded ${res.status}: ${(await res.text()).slice(0, 200)}`)
    }
    return
  }
  throw new Error("WhatsApp not configured")
}

async function sendTelegram({ subject, text }) {
  await postJson(`https://api.telegram.org/bot${env("TELEGRAM_BOT_TOKEN")}/sendMessage`, {
    chat_id: env("TELEGRAM_CHAT_ID"),
    text: `${subject}\n\n${text}`,
    disable_web_page_preview: true,
  })
}

async function sendNtfy({ subject, text }) {
  const server = (env("NTFY_SERVER") || "https://ntfy.sh").replace(/\/$/, "")
  const res = await fetch(`${server}/${env("NTFY_TOPIC")}`, {
    method: "POST",
    headers: { title: subject, priority: subject.includes("RECOVERED") ? "default" : "high" },
    body: text,
  })
  if (!res.ok) throw new Error(`ntfy responded ${res.status}`)
}

/**
 * Sends one alert on every configured channel. E-mail failure throws (the job must fail
 * loudly); other channels only log. Returns a per-channel summary for the job log.
 */
export async function sendAlert({ subject, text }) {
  const c = describeConfig()
  if (DRY_RUN) {
    console.log(`\n[dry-run] would send on ${JSON.stringify(c)}\n[dry-run] subject: ${subject}\n[dry-run] text:\n${text}\n`)
    return { dryRun: true }
  }
  const summary = {}
  await sendEmail({ subject, text })
  summary.email = `sent via ${c.email} to ${c.recipients} recipient(s)`

  let whatsappFailed = false
  if (c.whatsapp) {
    try {
      await sendWhatsApp({ subject, text })
      summary.whatsapp = `sent via ${c.whatsapp}`
    } catch (err) {
      whatsappFailed = true
      summary.whatsapp = `FAILED: ${err.message}`
    }
  } else {
    summary.whatsapp = "not configured"
  }

  const useFallback = !c.whatsapp || whatsappFailed || env("ALERT_ALWAYS_FALLBACK").toLowerCase() === "true"
  if (useFallback && c.telegram) {
    try {
      await sendTelegram({ subject, text })
      summary.telegram = "sent"
    } catch (err) {
      summary.telegram = `FAILED: ${err.message}`
    }
  }
  if (useFallback && c.ntfy) {
    try {
      await sendNtfy({ subject, text })
      summary.ntfy = "sent"
    } catch (err) {
      summary.ntfy = `FAILED: ${err.message}`
    }
  }
  return summary
}
