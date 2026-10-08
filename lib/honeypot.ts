/**
 * Value of the hidden `company_website` honeypot input inside a form. Real users
 * never see or fill it, so a non-empty value is sent to the server, whose
 * checks (stripBotFields in /api/submissions, /api/rfq-submit) then reject it.
 * Call synchronously inside the submit handler (before any await).
 */
export function readHoneypot(form: HTMLFormElement | null | undefined): string {
  if (!form) return ""
  try {
    const v = new FormData(form).get("company_website")
    return typeof v === "string" ? v : ""
  } catch {
    return ""
  }
}
