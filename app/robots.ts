import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo/site-config"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ── Standard web crawlers ────────────────────────────────────────────
      {
        userAgent: "*",
        allow: [
          "/",
          "/api/ai/",
          "/api/mcp",
          "/llms.txt",
        ],
        disallow: [
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
        ],
      },
      // ── OpenAI / ChatGPT ─────────────────────────────────────────────────
      {
        userAgent: "GPTBot",
        allow: ["/"],
        disallow: ["/admin", "/api/admin/"],
      },
      {
        userAgent: "OAI-SearchBot",
        allow: ["/"],
        disallow: ["/admin", "/api/admin/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/"],
        disallow: ["/admin", "/api/admin/"],
      },
      // ── Anthropic / Claude ───────────────────────────────────────────────
      {
        userAgent: "ClaudeBot",
        allow: ["/"],
        disallow: ["/admin", "/api/admin/"],
      },
      {
        userAgent: "Claude-User",
        allow: ["/"],
        disallow: ["/admin", "/api/admin/"],
      },
      {
        userAgent: "anthropic-ai",
        allow: ["/"],
        disallow: ["/admin", "/api/admin/"],
      },
      // ── Google AI ────────────────────────────────────────────────────────
      {
        userAgent: "Google-Extended",
        allow: ["/"],
        disallow: ["/admin", "/api/admin/"],
      },
      {
        userAgent: "Googlebot",
        allow: ["/"],
        disallow: ["/admin", "/api/admin/"],
      },
      // ── Perplexity ───────────────────────────────────────────────────────
      {
        userAgent: "PerplexityBot",
        allow: ["/"],
        disallow: ["/admin", "/api/admin/"],
      },
      // ── Meta / Grok / Others ─────────────────────────────────────────────
      {
        userAgent: "FacebookBot",
        allow: ["/"],
        disallow: ["/admin", "/api/admin/"],
      },
      {
        userAgent: "Twitterbot",
        allow: ["/"],
        disallow: ["/admin", "/api/admin/"],
      },
      {
        userAgent: "cohere-ai",
        allow: ["/"],
        disallow: ["/admin", "/api/admin/"],
      },
      {
        userAgent: "YouBot",
        allow: ["/"],
        disallow: ["/admin", "/api/admin/"],
      },
      {
        userAgent: "Diffbot",
        allow: ["/"],
        disallow: ["/admin", "/api/admin/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
