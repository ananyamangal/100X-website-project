// Disallow lines for every crawler. A crawler that matches a named group below
// ignores the "*" group entirely, so each named group repeats these (B7).
// Named AI crawlers stay allowed everywhere else.
export const GENERIC_DISALLOW = [
  "/admin",
  "/admin/",
  "/api/admin/",
  "/api/submissions",
  "/api/brochure",
  "/brochure-thank-you",
  "/thank-you",
  "/*?utm_*",
  "/*?fbclid=*",
  "/*?gclid=*",
  "/*?msclkid=*",
]

/** A named group's own disallow lines first, then any generic ones it lacks. */
export function withGenericDisallow(own: string[]): string[] {
  return [...own, ...GENERIC_DISALLOW.filter((p) => !own.includes(p))]
}
