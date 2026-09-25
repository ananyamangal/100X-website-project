"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { KnowledgeArticle, KnowledgeBlock, KnowledgeFaq } from "@/lib/knowledge/types"
import { KnowledgeRebuildPanel } from "@/components/admin/KnowledgeRebuildPanel"

const BLOCK_TYPES: KnowledgeBlock["type"][] = ["heading", "paragraph", "list", "table", "callout", "faq"]
const CALLOUT_VARIANTS = ["keyfact", "note", "warning", "info", "success"] as const

function newBlock(type: KnowledgeBlock["type"]): KnowledgeBlock {
  switch (type) {
    case "heading":
      return { type: "heading", level: 2, text: "" }
    case "paragraph":
      return { type: "paragraph", text: "" }
    case "list":
      return { type: "list", ordered: false, items: [""] }
    case "table":
      return { type: "table", columns: [{ text: "" }, { text: "" }], rows: [["", ""]] }
    case "callout":
      return { type: "callout", variant: "note", text: "" }
    case "faq":
      return { type: "faq" }
  }
}

const input = "w-full border border-gray-300 rounded px-2 py-1 text-sm"
const btn = "px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40"

export function KnowledgeManager() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [slug, setSlug] = useState<string | null>(null)
  const [draft, setDraft] = useState<KnowledgeArticle | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/knowledge")
      const data = await res.json()
      setArticles(Array.isArray(data) ? data : [])
    } catch {
      setStatus("Failed to load articles")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const selected = useMemo(() => articles.find((a) => a.slug === slug) ?? null, [articles, slug])

  function open(a: KnowledgeArticle) {
    setSlug(a.slug)
    setDraft(JSON.parse(JSON.stringify(a)))
    setStatus(null)
  }

  function patch(p: Partial<KnowledgeArticle>) {
    setDraft((d) => (d ? { ...d, ...p } : d))
  }

  function patchBlock(i: number, p: Record<string, unknown>) {
    setDraft((d) => {
      if (!d) return d
      const blocks = [...d.blocks]
      blocks[i] = { ...blocks[i], ...p } as KnowledgeBlock
      return { ...d, blocks }
    })
  }

  function moveBlock(i: number, dir: -1 | 1) {
    setDraft((d) => {
      if (!d) return d
      const j = i + dir
      if (j < 0 || j >= d.blocks.length) return d
      const blocks = [...d.blocks]
      ;[blocks[i], blocks[j]] = [blocks[j], blocks[i]]
      return { ...d, blocks }
    })
  }

  function removeBlock(i: number) {
    setDraft((d) => (d ? { ...d, blocks: d.blocks.filter((_, k) => k !== i) } : d))
  }

  function addBlock(type: KnowledgeBlock["type"]) {
    setDraft((d) => (d ? { ...d, blocks: [...d.blocks, newBlock(type)] } : d))
  }

  function patchFaq(i: number, p: Partial<KnowledgeFaq>) {
    setDraft((d) => {
      if (!d) return d
      const faqs = [...d.faqs]
      faqs[i] = { ...faqs[i], ...p }
      return { ...d, faqs }
    })
  }

  async function save() {
    if (!draft) return
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch("/api/admin/knowledge", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText)
      setArticles((list) => list.map((a) => (a.slug === draft.slug ? draft : a)))
      setStatus("Saved — public pages revalidated.")
    } catch (e) {
      setStatus(`Save failed: ${e instanceof Error ? e.message : "unknown error"}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading knowledge articles…</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Knowledge Hub</h2>
        <p className="text-sm text-gray-500">
          {articles.length} article{articles.length === 1 ? "" : "s"} in the CMS. Rows flagged{" "}
          <span className="text-amber-700 font-medium">review pending</span> are safety FAQs awaiting a single approved
          answer.
        </p>
      </div>

      <KnowledgeRebuildPanel onFinished={load} />

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">Article</th>
              <th className="px-3 py-2">Blocks</th>
              <th className="px-3 py-2">FAQs</th>
              <th className="px-3 py-2">Review pending</th>
              <th className="px-3 py-2">Published</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => {
              const pending = a.faqs.filter((f) => f.reviewPending).length
              return (
                <tr key={a.slug} className={`border-t border-gray-200 ${slug === a.slug ? "bg-brand-50" : ""}`}>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-800">{a.title}</div>
                    <div className="text-xs text-gray-500">/knowledge/{a.slug}</div>
                    {a.sync ? (
                      <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                        <span className="rounded bg-blue-50 text-blue-700 px-1.5 py-0.5">Synced from {a.sync.source.replace("_", " ")}</span>
                        {a.sync.policy === "draft-review" && !a.isPublished ? (
                          <span
                            className="rounded bg-amber-50 text-amber-800 px-1.5 py-0.5"
                            title={a.sync.reasons.length ? `Held because it touches: ${a.sync.reasons.join(", ")}` : undefined}
                          >
                            Needs review{a.sync.reasons.length ? `: ${a.sync.reasons.join(", ")}` : ""}
                          </span>
                        ) : null}
                        {a.sync.locked ? <span className="rounded bg-gray-100 text-gray-700 px-1.5 py-0.5">Edited: sync paused</span> : null}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{a.blocks.length}</td>
                  <td className="px-3 py-2">
                    {a.faqs.filter((f) => f.visibleAnswer).length} visible / {a.faqs.length}
                  </td>
                  <td className="px-3 py-2">
                    {pending > 0 ? <span className="text-amber-700 font-medium">{pending}</span> : "—"}
                  </td>
                  <td className="px-3 py-2">{a.isPublished ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" className={btn} onClick={() => open(a)}>
                      Edit
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {draft && selected ? (
        <div className="border border-gray-200 rounded-lg p-4 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold text-gray-900">Editing /knowledge/{draft.slug}</h3>
            <div className="flex items-center gap-2">
              {status ? <span className="text-xs text-gray-600">{status}</span> : null}
              <button type="button" className={btn} onClick={() => open(selected)} disabled={saving}>
                Revert
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                onClick={save}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          {draft.sync && !draft.sync.locked ? (
            <p className="text-xs rounded border border-blue-200 bg-blue-50 text-blue-900 px-3 py-2">
              This article was generated by the Knowledge Base sync. Saving it locks it: the sync will stop updating it, including
              unpublishing it if its source is removed.
              {draft.sync.policy === "draft-review" ? " It is held as a draft until you publish it below." : ""}
            </p>
          ) : null}

          <section className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs text-gray-600">
              Title
              <input className={input} value={draft.title} onChange={(e) => patch({ title: e.target.value })} />
            </label>
            <label className="text-xs text-gray-600">
              H1
              <input className={input} value={draft.h1 ?? ""} onChange={(e) => patch({ h1: e.target.value })} />
            </label>
            <label className="text-xs text-gray-600">
              Meta title
              <input
                className={input}
                value={draft.metaTitle ?? ""}
                onChange={(e) => patch({ metaTitle: e.target.value })}
              />
            </label>
            <label className="text-xs text-gray-600">
              Breadcrumb label
              <input
                className={input}
                value={draft.breadcrumbLabel ?? ""}
                onChange={(e) => patch({ breadcrumbLabel: e.target.value })}
              />
            </label>
            <label className="text-xs text-gray-600 sm:col-span-2">
              Meta description
              <textarea
                className={input}
                rows={2}
                value={draft.metaDescription ?? ""}
                onChange={(e) => patch({ metaDescription: e.target.value })}
              />
            </label>
            <label className="text-xs text-gray-600 flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                checked={!!draft.isPublished}
                onChange={(e) => patch({ isPublished: e.target.checked })}
              />
              Published
            </label>
            <label className="text-xs text-gray-600">
              Order
              <input
                type="number"
                className={input}
                value={draft.order ?? 0}
                onChange={(e) => patch({ order: Number(e.target.value) })}
              />
            </label>
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-800 text-sm">Blocks ({draft.blocks.length})</h4>
              <div className="flex gap-1">
                {BLOCK_TYPES.map((t) => (
                  <button key={t} type="button" className={btn} onClick={() => addBlock(t)}>
                    + {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {draft.blocks.map((b, i) => (
                <div key={i} className="border border-gray-200 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-gray-500">
                      {i}. {b.type}
                      {b.type === "heading" ? ` (h${b.level})` : ""}
                    </span>
                    <div className="flex gap-1">
                      <button type="button" className={btn} onClick={() => moveBlock(i, -1)} disabled={i === 0}>
                        ↑
                      </button>
                      <button
                        type="button"
                        className={btn}
                        onClick={() => moveBlock(i, 1)}
                        disabled={i === draft.blocks.length - 1}
                      >
                        ↓
                      </button>
                      <button type="button" className={`${btn} text-red-600`} onClick={() => removeBlock(i)}>
                        Delete
                      </button>
                    </div>
                  </div>

                  {b.type === "heading" ? (
                    <div className="flex gap-2">
                      <select
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                        value={b.level}
                        onChange={(e) => patchBlock(i, { level: Number(e.target.value) })}
                      >
                        <option value={2}>H2</option>
                        <option value={3}>H3</option>
                      </select>
                      <input className={input} value={b.text} onChange={(e) => patchBlock(i, { text: e.target.value })} />
                    </div>
                  ) : null}

                  {b.type === "paragraph" ? (
                    <textarea
                      className={input}
                      rows={3}
                      value={b.text}
                      onChange={(e) => patchBlock(i, { text: e.target.value })}
                    />
                  ) : null}

                  {b.type === "list" ? (
                    <div className="space-y-1">
                      <label className="text-xs text-gray-600 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={b.ordered}
                          onChange={(e) => patchBlock(i, { ordered: e.target.checked })}
                        />
                        Numbered
                      </label>
                      <textarea
                        className={input}
                        rows={Math.min(8, b.items.length + 1)}
                        value={b.items.join("\n")}
                        onChange={(e) => patchBlock(i, { items: e.target.value.split("\n") })}
                      />
                      <p className="text-[11px] text-gray-400">One item per line.</p>
                    </div>
                  ) : null}

                  {b.type === "callout" ? (
                    <div className="space-y-1">
                      <div className="flex gap-2">
                        <select
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                          value={b.variant}
                          onChange={(e) => patchBlock(i, { variant: e.target.value })}
                        >
                          {CALLOUT_VARIANTS.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                        <input
                          className={input}
                          placeholder="Bold lead label (optional)"
                          value={b.label ?? ""}
                          onChange={(e) => patchBlock(i, { label: e.target.value })}
                        />
                      </div>
                      <textarea
                        className={input}
                        rows={3}
                        value={b.text}
                        onChange={(e) => patchBlock(i, { text: e.target.value })}
                      />
                    </div>
                  ) : null}

                  {b.type === "table" ? (
                    <div className="space-y-1">
                      <input
                        className={input}
                        value={b.columns.map((c) => c.text).join(" | ")}
                        onChange={(e) =>
                          patchBlock(i, { columns: e.target.value.split("|").map((t) => ({ text: t.trim() })) })
                        }
                      />
                      <textarea
                        className={input}
                        rows={Math.min(10, b.rows.length + 1)}
                        value={b.rows.map((r) => r.join(" | ")).join("\n")}
                        onChange={(e) =>
                          patchBlock(i, {
                            rows: e.target.value.split("\n").map((r) => r.split("|").map((c) => c.trim())),
                          })
                        }
                      />
                      <p className="text-[11px] text-gray-400">
                        Header cells and each row use <code>|</code> as the column separator, one row per line.
                      </p>
                    </div>
                  ) : null}

                  {b.type === "faq" ? (
                    <p className="text-xs text-gray-500">
                      The visible FAQ section renders here. Without this marker it renders after the last block.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4 className="font-semibold text-gray-800 text-sm mb-2">FAQs ({draft.faqs.length})</h4>
            <div className="space-y-3">
              {draft.faqs.map((f, i) => (
                <div
                  key={i}
                  className={`border rounded p-3 space-y-2 ${
                    f.reviewPending ? "border-amber-300 bg-amber-50" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-mono text-gray-500">FAQ {i}</span>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={f.safety}
                          onChange={(e) => patchFaq(i, { safety: e.target.checked })}
                        />
                        safety
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={f.reviewPending}
                          onChange={(e) => patchFaq(i, { reviewPending: e.target.checked })}
                        />
                        review pending
                      </label>
                    </div>
                  </div>

                  <label className="block text-xs text-gray-600">
                    Question (also the JSON-LD wording)
                    <input className={input} value={f.question} onChange={(e) => patchFaq(i, { question: e.target.value })} />
                  </label>

                  <label className="block text-xs text-gray-600">
                    On-page question override — leave empty unless the page must show different wording
                    <input
                      className={input}
                      value={f.visibleQuestion ?? ""}
                      onChange={(e) => patchFaq(i, { visibleQuestion: e.target.value || undefined })}
                    />
                  </label>

                  <div className="grid sm:grid-cols-2 gap-2">
                    <label className="block text-xs text-gray-600">
                      Visible answer {f.visibleAnswer == null ? "(empty — schema-only)" : ""}
                      <textarea
                        className={input}
                        rows={4}
                        value={f.visibleAnswer ?? ""}
                        onChange={(e) => patchFaq(i, { visibleAnswer: e.target.value || null })}
                      />
                    </label>
                    <label className="block text-xs text-gray-600">
                      JSON-LD answer {f.schemaAnswer == null ? "(empty — visible-only)" : ""}
                      <textarea
                        className={input}
                        rows={4}
                        value={f.schemaAnswer ?? ""}
                        onChange={(e) => patchFaq(i, { schemaAnswer: e.target.value || null })}
                      />
                    </label>
                  </div>

                  {f.reviewPending ? (
                    <button
                      type="button"
                      className={btn}
                      onClick={() =>
                        patchFaq(i, {
                          visibleAnswer: f.schemaAnswer ?? f.visibleAnswer,
                          schemaAnswer: f.schemaAnswer ?? f.visibleAnswer,
                          reviewPending: false,
                        })
                      }
                    >
                      Approve JSON-LD wording for both sides
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
