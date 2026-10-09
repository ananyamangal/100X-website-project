// Display label for a product feature on list cards.
// Features in the DB are objects shaped { title, value, ... } where value may be
// empty; older records may be plain strings ("Engine Power: 2HP") or use
// label/name instead of title. Returns "title: value" when both exist, the
// single non-empty part otherwise, and never drops the value.
function clean(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v !== 'string' && typeof v !== 'number') return ''
  return String(v).replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

export function featureLabel(f: unknown): string {
  if (typeof f === 'string' || typeof f === 'number') return clean(f)
  if (f && typeof f === 'object') {
    const o = f as Record<string, unknown>
    const title = clean(o.title) || clean(o.label) || clean(o.name) || clean(o.key)
    const value = clean(o.value) || clean(o.text) || clean(o.description)
    if (title && value) {
      if (title.toLowerCase() === value.toLowerCase()) return title
      return `${title.replace(/:\s*$/, '')}: ${value}`
    }
    return title || value
  }
  return ''
}
