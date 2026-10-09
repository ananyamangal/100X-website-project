/**
 * Code-side fixes for defective product <title> / meta description values
 * that are stored in the database (`products.seoTitle` / `products.metaDescription`).
 *
 * Why code and not a DB write: the SEO program (2026-10, item B4) must not
 * write to the production database. Each entry below is keyed by the product
 * slug (the /products/<slug> URL segment, which never changes) and records the
 * exact stored value it replaces.
 *
 * Safety rule: an override is applied ONLY while the stored DB value is still
 * the defective one recorded in `replacesTitle` / `replacesDescription`
 * (compared after whitespace normalisation). As soon as someone edits the
 * product's SEO fields in the admin, the admin value wins and the override
 * goes dormant. Nothing here changes a slug, canonical or URL.
 *
 * Every change is logged in docs/SEO_CHANGELOG.md (title/meta budget item B4).
 */

export interface ProductSeoOverride {
  /** Model number the fix is about (documentation + tests). */
  model: string
  /** Stored DB seoTitle this override replaces. */
  replacesTitle?: string
  /** New <title> (keep the existing ranking words, add the model, about 60 chars). */
  title?: string
  /** Stored DB metaDescription this override replaces. */
  replacesDescription?: string
  /** New meta description (155-160 chars max). */
  description?: string
}

export const PRODUCT_SEO_OVERRIDES: Readonly<Record<string, ProductSeoOverride>> = {
  // HBL22 carried the HM20 title AND the HM20 meta description (copied record).
  "isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhbl22-c-ea7f75": {
    model: "100XHBL22",
    replacesTitle: "ISI marked Thermal Fogging Machine with HDPE Tanks | India Manufacturer | 100X",
    title: "ISI Marked Thermal Fogging Machine HDPE Tank 100XHBL22 | 100X",
    replacesDescription:
      "ISI marked Thermal Fogging Machine with HDPE tank-100XHM20 : fogging machines for Municipal mosquito and vector control (dengue, malaria, chikungunya pr…",
    description:
      "100XHBL22 pulse jet thermal fogging machine, ISI marked, with HDPE tanks: 6 L solution tank, 2 L fuel tank, 30-40 L/hr output. For municipal vector control.",
  },
  // HM20: 78-char title (cut off in results), no model number, meta cut off mid-word.
  "isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhm20-fcbbde": {
    model: "100XHM20",
    replacesTitle: "ISI marked Thermal Fogging Machine with HDPE Tanks | India Manufacturer | 100X",
    title: "ISI Marked Thermal Fogging Machine HDPE Tank 100XHM20 | 100X",
    replacesDescription:
      "ISI marked Thermal Fogging Machine with HDPE tank-100XHM20 : fogging machines for Municipal mosquito and vector control (dengue, malaria, chikungunya pr…",
    description:
      "100XHM20 ISI marked thermal fogging machine with HDPE tanks: 5.5 L solution tank, 2 L fuel tank, 30-40 L/hr adjustable output. For municipal vector control.",
  },
  // ULV22: stored title was truncated mid-word ("...machine wi").
  "ulv-cold-fogger-machine-100xmcf42-copy-8dcd42lvlv": {
    model: "100XULV22",
    replacesTitle: "ULV Cold fogger machine wi | India Manufacturer | 100X",
    title: "ULV Cold Fogger Machine 100XULV22 | India Manufacturer | 100X",
  },
  // ULVSS10: title was only the model code; meta was a 39-char fragment.
  "100xulvss10-5e46c5": {
    model: "100XULVSS10",
    replacesTitle: "",
    title: "ULV Electric Cold Fogger 100XULVSS10 | 100x Circle",
    replacesDescription: "",
    description:
      "100XULVSS10 ULV electric cold fogger and mist sprayer: 240 V AC, 5 L chemical tank, 0.5-30 micron adjustable droplets. For hospitals and food facilities.",
  },
  // MCF42: 67-char title with a typo ("2 stoke") and no model; meta cut off ("& Disinfect").
  "cold-fogger-machine-with-2-stoke-engine-100xmcf42-c42ca1": {
    model: "100XMCF42",
    replacesTitle: "Cold fogger machine with 2 stoke engine | India Manufacturer | 100X",
    title: "Cold Fogger Machine with 2 Stroke Engine 100XMCF42 | 100X",
    replacesDescription:
      "Cold fogger machine with 2 stoke engine- 100XMCF42 : cold fogger for Municipal mosquito and vector control (dengue, malaria, chikungunya prevention) & Disinfect",
    description:
      "100XMCF42 cold fogger machine with a 2-stroke petrol engine: 14 L chemical tank, 20-100 micron adjustable droplets. For mosquito control and disinfection.",
  },
  // ATS trolley: stored title truncated ("Trolleys Stainless | ..."), meta cut off ("OEM manufacturer i…").
  "passenger-baggage-trolleys-stainless-steel-with-brakes-100xats": {
    model: "100XATS",
    replacesTitle: "Passenger Baggage Trolleys Stainless  | India Manufacturer | 100X",
    title: "Passenger Baggage Trolleys Stainless Steel 100XATS | 100X",
    replacesDescription:
      "Passenger Baggage Trolleys Stainless steel with brakes-100XATS: accessories for Airport baggage handling & Railway station platforms. OEM manufacturer i…",
    description:
      "Passenger baggage trolleys 100XATS in grade 304 stainless steel with foot-operated locking brakes, 150 kg load. For airports, railway stations and hotels.",
  },
}

const norm = (s: string | undefined | null) => (s ?? "").replace(/\s+/g, " ").trim()

/**
 * Returns the overridden title / description for a product, or undefined for
 * each field that should keep its stored (or fallback) value.
 */
export function resolveProductSeoOverride(
  slug: string,
  storedTitle: string | undefined | null,
  storedDescription: string | undefined | null,
): { title?: string; description?: string } {
  const o = PRODUCT_SEO_OVERRIDES[slug]
  if (!o) return {}
  const out: { title?: string; description?: string } = {}
  if (o.title && o.replacesTitle !== undefined && norm(storedTitle) === norm(o.replacesTitle)) out.title = o.title
  if (o.description && o.replacesDescription !== undefined && norm(storedDescription) === norm(o.replacesDescription)) {
    out.description = o.description
  }
  return out
}
