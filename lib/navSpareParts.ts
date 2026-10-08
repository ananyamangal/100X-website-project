import { navThumbUrl } from "@/lib/navProducts"
import { buildPartUrl } from "@/lib/sparePartUrl"

/**
 * Data for the header "Spare Parts" menu: a capped selection of published
 * parts grouped by the machine they fit (first compatible product name), each
 * linked to its real page (buildPartUrl, the rule /spare-parts uses) with a
 * small thumbnail. Database-free so the shaping is unit-tested on plain
 * objects; the cached reader is getNavSpareParts() in lib/layoutData.ts.
 */
export interface NavSparePart {
  name: string
  href: string
  thumb: string | null
}

export interface NavSparePartGroup {
  machine: string
  parts: NavSparePart[]
}

export const NAV_SPARE_PARTS_LIMIT = 12
const OTHER_MACHINE = "Other parts"

/**
 * Raw spare_parts documents → machine groups. Published only (isPublished ===
 * true, as on /spare-parts), slug and name required. Parts keep the listing
 * order (order, then name). Machines with more parts come first, and parts are
 * taken round-robin across machines until NAV_SPARE_PARTS_LIMIT, so every
 * machine is represented before any one machine gets a second row.
 */
export function shapeNavSpareParts(docs: Record<string, unknown>[]): NavSparePartGroup[] {
  const parts = docs
    .filter((d) => d && d.isPublished === true && typeof d.name === "string" && d.name.trim() && typeof d.slug === "string" && d.slug.trim())
    // Same order as the page's Mongo sort { order: 1, name: 1 } (missing order first).
    .sort((a, b) => {
      const oa = typeof a.order === "number" ? a.order : -Infinity
      const ob = typeof b.order === "number" ? b.order : -Infinity
      if (oa !== ob) return oa - ob
      const na = String(a.name), nb = String(b.name)
      return na < nb ? -1 : na > nb ? 1 : 0
    })

  const byMachine = new Map<string, Record<string, unknown>[]>()
  for (const d of parts) {
    const names = d.compatibleProductNames
    const first = Array.isArray(names) && typeof names[0] === "string" && names[0].trim() ? names[0].trim() : OTHER_MACHINE
    if (!byMachine.has(first)) byMachine.set(first, [])
    byMachine.get(first)!.push(d)
  }
  const machines = [...byMachine.entries()].sort((a, b) => b[1].length - a[1].length)

  const picked = new Map<string, NavSparePart[]>(machines.map(([m]) => [m, []]))
  let taken = 0
  for (let round = 0; taken < NAV_SPARE_PARTS_LIMIT; round++) {
    let any = false
    for (const [machine, list] of machines) {
      if (taken >= NAV_SPARE_PARTS_LIMIT) break
      const d = list[round]
      if (!d) continue
      any = true
      taken++
      const images = d.images
      picked.get(machine)!.push({
        name: (d.name as string).trim(),
        href: buildPartUrl(d),
        thumb: navThumbUrl(Array.isArray(images) ? images[0] : undefined),
      })
    }
    if (!any) break
  }
  return machines.map(([machine]) => ({ machine, parts: picked.get(machine)! })).filter((g) => g.parts.length > 0)
}
