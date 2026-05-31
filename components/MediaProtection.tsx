"use client"

import { useEffect } from "react"

/**
 * MEDIA PROTECTION — stops casual copying. Determined users can still:
 * - Take screenshots (OS-level, cannot be blocked)
 * - Use browser DevTools → Network to download loaded assets
 * - Use extensions that bypass all JS/CSS restrictions
 * - View page source to extract URLs
 *
 * What this DOES stop:
 * - Right-click → "Save image as" on images and videos
 * - Drag-to-desktop on images and videos
 * - Easy text selection on product descriptions
 * - Right-click → "Save video as" on video elements
 * - Picture-in-Picture on video (where API is supported)
 * - Logo drag-and-drop
 */
export default function MediaProtection() {
  useEffect(() => {
    // ── Block right-click on media and logo ───────────────────────────
    const blockContext = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (
        t instanceof HTMLImageElement ||
        t instanceof HTMLVideoElement ||
        t.closest('[data-protected]')
      ) {
        e.preventDefault()
      }
    }

    // ── Block drag on images, videos, logo ───────────────────────────
    const blockDrag = (e: DragEvent) => {
      const t = e.target as HTMLElement
      if (
        t instanceof HTMLImageElement ||
        t instanceof HTMLVideoElement ||
        t.closest('[data-protected]')
      ) {
        e.preventDefault()
      }
    }

    // ── Disable picture-in-picture on all videos ──────────────────────
    const disablePip = () => {
      document.querySelectorAll<HTMLVideoElement>("video").forEach((v) => {
        v.disablePictureInPicture = true
        // Prevent keyboard shortcut PiP where supported
        v.addEventListener("enterpictureinpicture", (ev) => ev.preventDefault(), { once: false })
      })
    }
    disablePip()

    // Re-run disablePip when new videos are added (lazy-loaded content)
    const observer = new MutationObserver(disablePip)
    observer.observe(document.body, { childList: true, subtree: true })

    document.addEventListener("contextmenu", blockContext)
    document.addEventListener("dragstart", blockDrag)

    // ── Inject CSS protections ────────────────────────────────────────
    const style = document.createElement("style")
    style.id = "__media-protection"
    style.textContent = `
      /* Block selection on protected text regions */
      [data-no-select], .product-spec-text, .protected-content {
        -webkit-user-select: none;
        user-select: none;
      }

      /* Prevent image saving via pointer events layering */
      .protected-image-wrap {
        position: relative;
        display: inline-block;
      }
      .protected-image-wrap::after {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 1;
        pointer-events: none;
      }

      /* CSS watermark on product gallery images */
      .watermarked-image-wrap {
        position: relative;
        display: block;
        overflow: hidden;
      }
      .watermarked-image-wrap::after {
        content: "100x Circle";
        position: absolute;
        bottom: 8px;
        right: 10px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.04em;
        color: rgba(255,255,255,0.55);
        text-shadow: 0 1px 3px rgba(0,0,0,0.5);
        pointer-events: none;
        z-index: 2;
        white-space: nowrap;
      }

      /* Disable video download control in browsers that show it */
      video::-internal-media-controls-download-button { display: none !important; }
      video::--webkit-media-controls-download-button { display: none !important; }

      /* Logo no-save */
      [data-logo] {
        -webkit-user-drag: none;
        user-drag: none;
      }
    `
    if (!document.getElementById("__media-protection")) {
      document.head.appendChild(style)
    }

    // ── Apply watermarked-image-wrap to product gallery containers ────
    const wrapProductImages = () => {
      const selectors = [
        ".product-gallery img",
        "[data-gallery] img",
        ".deployment-image img",
        ".case-study-image img",
      ]
      selectors.forEach((sel) => {
        document.querySelectorAll<HTMLImageElement>(sel).forEach((img) => {
          if (img.parentElement?.classList.contains("watermarked-image-wrap")) return
          const wrap = document.createElement("div")
          wrap.className = "watermarked-image-wrap"
          img.parentNode?.insertBefore(wrap, img)
          wrap.appendChild(img)
        })
      })
    }
    wrapProductImages()
    const wrapObserver = new MutationObserver(wrapProductImages)
    wrapObserver.observe(document.body, { childList: true, subtree: true })

    return () => {
      document.removeEventListener("contextmenu", blockContext)
      document.removeEventListener("dragstart", blockDrag)
      observer.disconnect()
      wrapObserver.disconnect()
      document.getElementById("__media-protection")?.remove()
    }
  }, [])

  return null
}
