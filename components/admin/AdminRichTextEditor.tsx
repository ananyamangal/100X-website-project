"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useRef } from "react"
import { cn } from "@/lib/utils"
import "react-quill-new/dist/quill.snow.css"

// next/dynamic's return type doesn't expose `ref` even though react-quill-new
// (a class component) forwards it fine at runtime — cast so the ref below typechecks.
const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[220px] rounded-md border border-input bg-muted/40 animate-pulse" aria-hidden />
  ),
}) as any

type AdminRichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

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

export function AdminRichTextEditor({ value, onChange, placeholder, className }: AdminRichTextEditorProps) {
  const quillRef = useRef<{ getEditor: () => any } | null>(null)

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

  const modules = useMemo(
    () => ({
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
    []
  )

  const formats = useMemo(
    () => ["header", "bold", "italic", "underline", "strike", "list", "bullet", "size", "link", "image"],
    []
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
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value ?? ""}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  )
}
