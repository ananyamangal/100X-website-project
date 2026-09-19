import { parseDocument } from "htmlparser2"
import { Element, Text, type ChildNode } from "domhandler"
import { textContent, isTag } from "domutils"
import render from "dom-serializer"

/**
 * Finds a "Frequently Asked Questions" section in admin-authored rich-text
 * HTML (h2 heading + h3-question / p-answer pairs, as produced by the blog
 * and Knowledge Hub editors) and wraps each Q&A pair in a native
 * <details>/<summary> so it becomes clickable/expandable.
 *
 * Deliberately conservative: touches ONLY the matched h3+answer groups
 * inside the FAQ zone. The section heading itself, everything before it,
 * and everything after the zone are returned byte-identical. No JSON-LD is
 * read or written here — this is a pure presentation change on top of
 * content that is already rendered, so it does not affect FAQPage schema,
 * heading text/level, or word count. If the exact pattern isn't found,
 * the input is returned unchanged (safe no-op) rather than guessing.
 */
export function wrapFaqAccordion(html: string): string {
  if (!html || !/frequently\s+asked\s+questions/i.test(html)) return html

  const doc = parseDocument(html)
  const top = doc.children as ChildNode[]

  const faqHeadingIdx = top.findIndex(
    (node) =>
      isTag(node) &&
      node.name === "h2" &&
      textContent(node).trim().toLowerCase() === "frequently asked questions",
  )
  if (faqHeadingIdx === -1) return html

  // Zone ends at the next h1/h2 (a new content section), or end of content.
  let endIdx = top.length
  for (let i = faqHeadingIdx + 1; i < top.length; i++) {
    const node = top[i]
    if (isTag(node) && (node.name === "h1" || node.name === "h2")) {
      endIdx = i
      break
    }
  }

  const zone = top.slice(faqHeadingIdx + 1, endIdx)

  type Group = { question: Element; answer: ChildNode[] }
  const groups: Group[] = []
  let current: Group | null = null

  for (const node of zone) {
    if (isTag(node) && node.name === "h3") {
      current = { question: node, answer: [] }
      groups.push(current)
      continue
    }
    if (!current) continue // stray spacer before the first question — drop
    if (isEmptySpacer(node)) continue
    current.answer.push(node)
  }

  // Nothing shaped like a Q&A list — leave content untouched.
  if (groups.length === 0) return html

  const replacement = groups.map((g) => buildAccordionItem(g.question, g.answer))
  top.splice(faqHeadingIdx + 1, endIdx - (faqHeadingIdx + 1), ...replacement)

  return render(doc)
}

function isEmptySpacer(node: ChildNode): boolean {
  if (!isTag(node)) return false
  if (node.name !== "p" && node.name !== "div") return false
  // The sanitizer's allowlist has no "img"/embeddable tag, so an empty
  // trimmed textContent reliably means a Quill spacer paragraph (<p></p>
  // or <p><br></p>), never lost visible content.
  return textContent(node).trim() === ""
}

function buildAccordionItem(question: Element, answer: ChildNode[]): Element {
  const chevron = new Element(
    "svg",
    {
      class: "faq-accordion-chevron",
      viewBox: "0 0 24 24",
      width: "20",
      height: "20",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
    },
    [new Element("polyline", { points: "6 9 12 15 18 9" }, [])],
  )

  const summary = new Element("summary", { class: "faq-accordion-summary" }, [
    question,
    chevron,
  ])

  const body = new Element("div", { class: "faq-accordion-answer" }, answer)

  return new Element("details", { class: "faq-accordion-item" }, [summary, new Text("\n"), body])
}
