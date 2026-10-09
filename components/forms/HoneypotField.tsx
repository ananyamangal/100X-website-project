import { HONEYPOT_FIELD } from "@/lib/honeypot"

// Shared honeypot input for every public lead form (owner-approved A7). See lib/honeypot.ts.
// Off-screen (not display:none, which some bots skip), aria-hidden, out of the tab order,
// autocomplete off, and no label or text content, so nothing leaks into the page text.
// The form reads it with readHoneypot(form) and sends it in the POST body.
export default function HoneypotField() {
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}
    >
      <input type="text" name={HONEYPOT_FIELD} defaultValue="" tabIndex={-1} autoComplete="off" aria-hidden="true" />
    </div>
  )
}
