import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo/site-config"
import { GENERIC_DISALLOW, withGenericDisallow } from "@/lib/seo/robotsRules"

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
        disallow: GENERIC_DISALLOW,
      },
      // ── OpenAI / ChatGPT ─────────────────────────────────────────────────
      {
        userAgent: "GPTBot",
        allow: ["/"],
        disallow: withGenericDisallow(["/admin", "/api/admin/"]),
      },
      {
        userAgent: "OAI-SearchBot",
        allow: ["/"],
        disallow: withGenericDisallow(["/admin", "/api/admin/"]),
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/"],
        disallow: withGenericDisallow(["/admin", "/api/admin/"]),
      },
      // ── Anthropic / Claude ───────────────────────────────────────────────
      {
        userAgent: "ClaudeBot",
        allow: ["/"],
        disallow: withGenericDisallow(["/admin", "/api/admin/"]),
      },
      {
        userAgent: "Claude-User",
        allow: ["/"],
        disallow: withGenericDisallow(["/admin", "/api/admin/"]),
      },
      {
        userAgent: "anthropic-ai",
        allow: ["/"],
        disallow: withGenericDisallow(["/admin", "/api/admin/"]),
      },
      // ── Google AI ────────────────────────────────────────────────────────
      {
        userAgent: "Google-Extended",
        allow: ["/"],
        disallow: withGenericDisallow(["/admin", "/api/admin/"]),
      },
      {
        userAgent: "Googlebot",
        allow: ["/"],
        disallow: withGenericDisallow(["/admin", "/api/admin/"]),
      },
      // ── Perplexity ───────────────────────────────────────────────────────
      {
        userAgent: "PerplexityBot",
        allow: ["/"],
        disallow: withGenericDisallow(["/admin", "/api/admin/"]),
      },
      // ── Meta / Grok / Others ─────────────────────────────────────────────
      {
        userAgent: "FacebookBot",
        allow: ["/"],
        disallow: withGenericDisallow(["/admin", "/api/admin/"]),
      },
      {
        userAgent: "Twitterbot",
        allow: ["/"],
        disallow: withGenericDisallow(["/admin", "/api/admin/"]),
      },
      {
        userAgent: "cohere-ai",
        allow: ["/"],
        disallow: withGenericDisallow(["/admin", "/api/admin/"]),
      },
      {
        userAgent: "YouBot",
        allow: ["/"],
        disallow: withGenericDisallow(["/admin", "/api/admin/"]),
      },
      {
        userAgent: "Diffbot",
        allow: ["/"],
        disallow: withGenericDisallow(["/admin", "/api/admin/"]),
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
