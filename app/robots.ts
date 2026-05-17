import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo/site-config"

/**
 * Robots policy. The `host` directive is intentionally omitted —
 * `MetadataRoute.Robots` does not surface it in the generated robots.txt
 * and Google has deprecated the host directive in practice; canonical
 * origin is enforced via the www redirect in next.config.mjs instead.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          // Conversion / funnel pages — no SEO value, waste of crawl budget.
          "/brochure-thank-you",
          "/thank-you",
          // Internal previews of work-in-progress designs (e.g. /preview/2026).
          "/preview",
          "/preview/",
          // Common crawl traps via query strings (UTM, click ids, preview).
          "/*?utm_*",
          "/*?fbclid=*",
          "/*?gclid=*",
          "/*?msclkid=*",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
