"use client"
/**
 * SeoSchemaOverrideInjector
 * Reads approved schema additions from the SEO override store and injects them
 * as <script type="application/ld+json"> tags into the document <head>.
 *
 * Runs client-side on every path change. Googlebot renders JavaScript so these
 * schemas are eligible for rich results. Server-side schema injection (GlobalJsonLd)
 * remains the primary source — this layer adds Growth OS approved overrides on top.
 */
import { useEffect } from "react"
import { usePathname } from "next/navigation"

export default function SeoSchemaOverrideInjector() {
  const pathname = usePathname()

  useEffect(() => {
    const controller = new AbortController()

    fetch(`/api/seo/page-overrides?path=${encodeURIComponent(pathname)}`, {
      signal: controller.signal,
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: { schema_additions?: object[] } | null) => {
        if (!data?.schema_additions?.length) return

        // Remove any previously injected override schemas
        document.querySelectorAll("script[data-seo-override='schema']").forEach(el => el.remove())

        // Inject new schemas from the override store
        data.schema_additions.forEach((schema, i) => {
          const el = document.createElement("script")
          el.type = "application/ld+json"
          el.setAttribute("data-seo-override", "schema")
          el.setAttribute("data-override-index", String(i))
          el.textContent = JSON.stringify(schema)
          document.head.appendChild(el)
        })
      })
      .catch(() => {}) // fail silently — injector is additive, not critical

    return () => controller.abort()
  }, [pathname])

  return null
}
