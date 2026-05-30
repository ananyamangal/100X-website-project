"use client"

import { useEffect } from "react"

/**
 * Registers global event listeners that deter casual image saving.
 * - Blocks right-click context menu on all img elements
 * - Blocks drag-start on all img elements
 * Does NOT damage accessibility (keyboard users are unaffected).
 * Determined users can still screenshot or use DevTools.
 */
export default function MediaProtection() {
  useEffect(() => {
    const blockContext = (e: MouseEvent) => {
      if (e.target instanceof HTMLImageElement) {
        e.preventDefault()
      }
    }
    const blockDrag = (e: DragEvent) => {
      if (e.target instanceof HTMLImageElement) {
        e.preventDefault()
      }
    }
    document.addEventListener("contextmenu", blockContext)
    document.addEventListener("dragstart", blockDrag)
    return () => {
      document.removeEventListener("contextmenu", blockContext)
      document.removeEventListener("dragstart", blockDrag)
    }
  }, [])

  return null
}
