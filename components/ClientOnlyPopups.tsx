"use client"

import dynamic from "next/dynamic"

// These are all below-the-fold, interactivity-only components.
// Loading them client-only with ssr:false removes them from SSR HTML entirely,
// meaning they don't block the initial server render at all.
const VideoPopup = dynamic(() => import("@/components/VideoPopup"), { ssr: false })
const RFQPopup = dynamic(() => import("@/components/RFQPopup"), { ssr: false })
const RFQFloatingRibbon = dynamic(
  () => import("@/components/forms/RFQFloatingRibbon"),
  { ssr: false }
)
const MediaProtection = dynamic(() => import("@/components/MediaProtection"), { ssr: false })

export default function ClientOnlyPopups() {
  return (
    <>
      <VideoPopup />
      <RFQPopup />
      <RFQFloatingRibbon />
      <MediaProtection />
    </>
  )
}
