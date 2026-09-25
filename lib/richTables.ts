import { parseDocument } from "htmlparser2"
import { Element, type ChildNode } from "domhandler"
import { isTag } from "domutils"
import render from "dom-serializer"

/**
 * Semantic + responsive pass over tables in already-sanitized rich HTML.
 *
 * Quill's table module emits <table><tbody><tr><td>… with no header markup, so:
 *  - the first row becomes <thead> with <th scope="col"> (crawlable, and screen
 *    readers announce column headers) — only for tables of 2+ rows, so a
 *    single-row table is not turned into a header with no body;
 *  - each table is wrapped in .rich-table-scroll so a wide table scrolls
 *    sideways on a phone instead of breaking the page layout. The wrapper is a
 *    div rather than `display:block` on the table itself, which would strip the
 *    table's semantics in some browsers.
 *
 * Input with no <table> is returned untouched (same string), so this is a no-op
 * for every existing article.
 */
export function enhanceTables(html: string): string {
  if (!html || !/<table[\s>]/i.test(html)) return html

  const doc = parseDocument(html)
  const tables: Element[] = []
  const collect = (nodes: ChildNode[]) => {
    for (const n of nodes) {
      if (!isTag(n)) continue
      if (n.name === "table") tables.push(n)
      collect(n.children as ChildNode[])
    }
  }
  collect(doc.children as ChildNode[])

  for (const table of tables) {
    promoteHeaderRow(table)

    const wrapper = new Element("div", { class: "rich-table-scroll" }, [table])
    const parent = table.parent
    if (parent) {
      const siblings = parent.children as ChildNode[]
      const idx = siblings.indexOf(table)
      siblings[idx] = wrapper
      wrapper.parent = parent
      wrapper.prev = table.prev
      wrapper.next = table.next
      if (table.prev) table.prev.next = wrapper
      if (table.next) table.next.prev = wrapper
      table.prev = null
      table.next = null
    }
    table.parent = wrapper
  }

  return render(doc)
}

function promoteHeaderRow(table: Element) {
  const kids = table.children as ChildNode[]
  if (kids.some((c) => isTag(c) && c.name === "thead")) return

  const tbody = kids.find((c): c is Element => isTag(c) && c.name === "tbody")
  if (!tbody) return
  const rows = (tbody.children as ChildNode[]).filter((c): c is Element => isTag(c) && c.name === "tr")
  if (rows.length < 2) return

  const first = rows[0]
  for (const cell of first.children as ChildNode[]) {
    if (isTag(cell) && cell.name === "td") {
      cell.name = "th"
      cell.attribs = { ...cell.attribs, scope: "col" }
    }
  }

  tbody.children = (tbody.children as ChildNode[]).filter((c) => c !== first)
  const thead = new Element("thead", {}, [first])
  first.parent = thead
  thead.parent = table
  const at = kids.indexOf(tbody)
  kids.splice(at, 0, thead)
}
