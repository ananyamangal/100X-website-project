"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { BlogBody } from "@/components/BlogBody"
import "react-quill-new/dist/quill.snow.css"

// next/dynamic's return type doesn't expose `ref` even though react-quill-new
// (a class component) forwards it fine at runtime — cast so the ref below typechecks.
const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[220px] rounded-md border border-input bg-muted/40 animate-pulse" aria-hidden />
  ),
}) as any

export type EditorHandle = { insertImage: (url: string) => boolean }

type AdminRichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  // Blog post body: adds the table controls and an Edit / Preview toggle whose
  // preview renders through BlogBody, the exact component the live page uses.
  blog?: boolean
  // Populated with imperative helpers (inserting a gallery image at the cursor).
  handleRef?: { current: EditorHandle | null }
}

type TableAction =
  | "insertRowAbove"
  | "insertRowBelow"
  | "insertColumnLeft"
  | "insertColumnRight"
  | "deleteRow"
  | "deleteColumn"
  | "deleteTable"

// Same unsigned Cloudinary preset already used for the blog top/inline image
// uploads elsewhere in the admin (app/admin/page.tsx) — reused here so a
// pasted or toolbar-inserted image lands as a hosted URL, not a giant
// base64 blob in the stored content.
async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", "product_uploads")
  const res = await fetch("https://api.cloudinary.com/v1_1/dhbvzugv6/image/upload", {
    method: "POST",
    body: formData,
  })
  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${res.statusText}`)
  const data = await res.json()
  if (!data.secure_url) throw new Error("No secure URL returned from Cloudinary")
  return data.secure_url as string
}

export function AdminRichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  blog = false,
  handleRef,
}: AdminRichTextEditorProps) {
  const quillRef = useRef<{ getEditor: () => any } | null>(null)
  const lastIndex = useRef<number | null>(null)
  const [mode, setMode] = useState<"edit" | "preview">("edit")
  const [inTable, setInTable] = useState(false)
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(3)

  function trackSelection(range: { index: number } | null) {
    if (range) lastIndex.current = range.index
    const quill = quillRef.current?.getEditor()
    if (!quill || !blog || !range) {
      setInTable(false)
      return
    }
    try {
      const [table] = quill.getModule("table").getTable(range)
      setInTable(!!table)
    } catch {
      setInTable(false)
    }
  }

  function insertTable() {
    const quill = quillRef.current?.getEditor()
    if (!quill) return
    quill.focus()
    let at: number = lastIndex.current ?? Math.max(quill.getLength() - 1, 0)
    // Quill turns the line the cursor is on into the first table cell, which
    // would swallow an existing paragraph. Put the table on its own blank line
    // directly below the current paragraph instead.
    const [line] = quill.getLine(at)
    if (line && line.length() > 1) {
      const textEnd = quill.getIndex(line) + line.length() - 1
      quill.insertText(textEnd, "\n", "user")
      quill.formatLine(textEnd + 1, 1, { header: false, list: false }, "user")
      at = textEnd + 1
    }
    quill.setSelection(at, 0)
    quill
      .getModule("table")
      .insertTable(Math.min(Math.max(rows, 1), 20), Math.min(Math.max(cols, 1), 8))
  }

  function tableAction(action: TableAction) {
    const quill = quillRef.current?.getEditor()
    if (!quill) return
    quill.focus()
    quill.getModule("table")[action]()
  }

  async function insertImageAtCursor(file: File) {
    const quill = quillRef.current?.getEditor()
    if (!quill) return
    const range = quill.getSelection(true)
    const insertAt = range ? range.index : quill.getLength()
    try {
      const url = await uploadImage(file)
      quill.insertEmbed(insertAt, "image", url, "user")
      quill.setSelection(insertAt + 1, 0)
    } catch (err) {
      console.error("Error uploading pasted/inserted image:", err)
    }
  }

  // Re-assigned every render (no dep array) because the editor is lazy-loaded and
  // quillRef is still null on the first passes.
  useEffect(() => {
    if (!handleRef) return
    handleRef.current = {
      insertImage(url: string) {
        const quill = quillRef.current?.getEditor()
        if (!quill) return false
        const at = lastIndex.current ?? Math.max(quill.getLength() - 1, 0)
        quill.insertEmbed(at, "image", url, "user")
        quill.setSelection(at + 1, 0)
        return true
      },
    }
    return () => {
      handleRef.current = null
    }
  })

  const modules = useMemo(
    () => ({
      ...(blog ? { table: true } : {}),
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ size: ["small", false, "large", "huge"] }],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "image"],
          ["clean"],
        ],
        handlers: {
          image() {
            const input = document.createElement("input")
            input.setAttribute("type", "file")
            input.setAttribute("accept", "image/*")
            input.onchange = () => {
              const file = input.files?.[0]
              if (file) insertImageAtCursor(file)
            }
            input.click()
          },
        },
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [blog]
  )

  const formats = useMemo(
    () => [
      "header", "bold", "italic", "underline", "strike", "list", "bullet", "size", "link", "image",
      ...(blog ? ["table"] : []),
    ],
    [blog]
  )

  // Clipboard paste isn't covered by the toolbar handler — Quill's default
  // behavior for a pasted image FILE (e.g. a copied screenshot) is to embed
  // it as a base64 data URI, via a listener Quill attaches directly on its
  // own editor root during initialization. A same-element 'paste' listener
  // added afterwards — even capturing, even with stopImmediatePropagation —
  // still runs after Quill's, which by then has already inserted the base64
  // image; same-element capture listeners fire in registration order, and
  // Quill registers first. Capture-phase listeners on an ANCESTOR (document)
  // fire before ANY listener on a descendant regardless of registration
  // order, so attaching here and calling stopImmediatePropagation() there
  // stops the event before it ever reaches Quill's handler.
  useEffect(() => {
    const quill = quillRef.current?.getEditor()
    if (!quill) return
    const root: HTMLElement = quill.root
    const onPaste = (e: ClipboardEvent) => {
      if (!root.contains(e.target as Node)) return
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) {
            e.preventDefault()
            e.stopImmediatePropagation()
            insertImageAtCursor(file)
          }
          return
        }
      }
    }
    document.addEventListener("paste", onPaste, true)
    return () => document.removeEventListener("paste", onPaste, true)
  })

  // Covers the other paste shape: an <img> copied from elsewhere as HTML
  // with an already-embedded base64 src (rather than a raw pasted file) —
  // clipboard.addMatcher runs inside Quill's own HTML-to-delta pipeline, so
  // it isn't a race. Returning an empty delta (same-class Delta sliced to
  // zero ops, avoiding a separate Delta import) drops the base64 insert.
  // Runs on every render (no dep array) because the editor is lazy-loaded and
  // `quillRef` is still null on the first passes — but Quill has no
  // removeMatcher, so registering per render would stack a matcher per
  // keystroke and upload a pasted image once per copy. The ref latches it to
  // exactly one registration, the first render where the editor exists.
  const imgMatcherRegistered = useRef(false)
  useEffect(() => {
    if (imgMatcherRegistered.current) return
    const quill = quillRef.current?.getEditor()
    if (!quill) return
    imgMatcherRegistered.current = true
    quill.clipboard.addMatcher("img", (node: HTMLImageElement, delta: any) => {
      const src = node.getAttribute("src") || ""
      if (!src.startsWith("data:")) return delta
      fetch(src)
        .then((r) => r.blob())
        .then((blob) => uploadImage(new File([blob], "pasted-image", { type: blob.type || "image/png" })))
        .then((url) => {
          const range = quill.getSelection(true)
          const insertAt = range ? range.index : quill.getLength()
          quill.insertEmbed(insertAt, "image", url, "user")
          quill.setSelection(insertAt + 1, 0)
        })
        .catch((err: unknown) => console.error("Error uploading pasted image:", err))
      return delta.slice(0, 0)
    })
  })

  const btn = "rounded border border-input bg-background px-2 py-1 text-xs hover:bg-muted"
  // Keep the editor's selection when a control is clicked, so table actions
  // land where the cursor was.
  const keepSelection = (e: React.MouseEvent) => e.preventDefault()
  const tableButtons: [string, TableAction][] = [
    ["Row above", "insertRowAbove"],
    ["Row below", "insertRowBelow"],
    ["Col left", "insertColumnLeft"],
    ["Col right", "insertColumnRight"],
    ["Delete row", "deleteRow"],
    ["Delete column", "deleteColumn"],
    ["Delete table", "deleteTable"],
  ]

  return (
    <div
      className={cn(
        "admin-rich-text rounded-md border border-input bg-background overflow-hidden",
        "[&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-input [&_.ql-toolbar]:rounded-t-md",
        "[&_.ql-container]:border-0 [&_.ql-container]:rounded-b-md [&_.ql-editor]:min-h-[200px] [&_.ql-editor]:text-base",
        "[&_.ql-editor_img]:max-w-full [&_.ql-editor_img]:h-auto [&_.ql-editor_img]:rounded-lg",
        className
      )}
    >
      {blog && (
        <div className="flex items-center gap-1 border-b border-input bg-muted/40 px-2 py-1">
          <button
            type="button"
            data-testid="editor-tab-edit"
            className={cn(btn, mode === "edit" && "font-semibold")}
            onClick={() => setMode("edit")}
          >
            Edit
          </button>
          <button
            type="button"
            data-testid="editor-tab-preview"
            className={cn(btn, mode === "preview" && "font-semibold")}
            onClick={() => setMode("preview")}
          >
            Preview (as published)
          </button>
        </div>
      )}
      {blog && mode === "edit" && (
        <div className="flex flex-wrap items-center gap-2 border-b border-input bg-muted/20 px-2 py-1.5 text-xs">
          <span className="font-medium">Table</span>
          <label className="flex items-center gap-1">
            Rows
            <input
              type="number"
              min={1}
              max={20}
              value={rows}
              onChange={(e) => setRows(Number(e.target.value) || 1)}
              className="w-14 rounded border border-input px-1 py-0.5"
            />
          </label>
          <label className="flex items-center gap-1">
            Columns
            <input
              type="number"
              min={1}
              max={8}
              value={cols}
              onChange={(e) => setCols(Number(e.target.value) || 1)}
              className="w-14 rounded border border-input px-1 py-0.5"
            />
          </label>
          <button type="button" data-testid="insert-table" className={btn} disabled={inTable} onMouseDown={keepSelection} onClick={insertTable}>
            Insert table
          </button>
          {inTable &&
            tableButtons.map(([label, action]) => (
              <button
                key={action}
                type="button"
                className={cn(btn, action === "deleteTable" && "text-red-600")}
                onMouseDown={keepSelection}
                onClick={() => tableAction(action)}
              >
                {label}
              </button>
            ))}
          <span className="ml-auto text-muted-foreground">First row is published as the header row.</span>
        </div>
      )}
      {blog && mode === "preview" && (
        <div className="bg-gray-50 p-4 min-h-[200px]" data-testid="editor-preview">
          <div className="max-w-3xl mx-auto">
            <BlogBody html={value ?? ""} />
          </div>
        </div>
      )}
      <div className={cn(blog && mode === "preview" && "hidden")}>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value ?? ""}
          onChange={onChange}
          onChangeSelection={trackSelection}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
        />
      </div>
    </div>
  )
}
