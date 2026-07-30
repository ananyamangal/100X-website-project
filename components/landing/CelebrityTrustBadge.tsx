import Image from "next/image"
import { cloudinaryAvatarUrl } from "@/lib/cloudinaryUrl"

// Sourced from the celebrity_assets library (asset "Mushtaq khan",
// _id 6a1bec82bdd35898e24d9604) — the endorsement/"vouching" photo, not the
// "problem" narrative photo also in that collection. Hardcoded rather than
// fetched: this badge only ever features one person, so a dedicated API
// route would just be a network round trip for a URL that never changes.
const CELEBRITY_IMAGE_URL =
  "https://res.cloudinary.com/dhbvzugv6/image/upload/v1780214888/tc0ezlvaku38ypw5ajet.png"

// Anchors to the currently-enabled homepage celebrity section
// (components/home/CelebritySectionsBlock.tsx, sectionKey
// "celebrity-solution-mushtaq"). If that section is ever disabled/renamed
// in the Homepage Sections admin tab, this link degrades to landing on the
// homepage top rather than 404ing.
const CELEBRITY_SECTION_HREF = "/#celebrity-solution-mushtaq"

interface CelebrityTrustBadgeProps {
  theme?: "light" | "dark"
  className?: string
}

const THEME = {
  light: { text: "text-gray-600 group-hover:text-brand-700", ring: "ring-gray-200" },
  dark: { text: "text-gray-400 group-hover:text-brand-400", ring: "ring-white/10" },
} as const

/**
 * Compact trust badge for landing pages — a small circular photo + one line
 * of endorsement text, linking to the full celebrity section on the
 * homepage. Deliberately not a reuse of CelebritySectionsBlock: this is
 * sized and weighted like a testimonial avatar / certification badge, not
 * a standalone page section.
 */
export default function CelebrityTrustBadge({ theme = "light", className = "" }: CelebrityTrustBadgeProps) {
  const tc = THEME[theme]
  return (
    <a
      href={CELEBRITY_SECTION_HREF}
      className={`group inline-flex items-center gap-3 ${className}`}
    >
      <Image
        // Cloudinary already does the face-crop + format/quality transform
        // (source is a tall 3115x4672 portrait, not a headshot) — Next's
        // optimizer can't do gravity-aware cropping, so `unoptimized` skips
        // a redundant re-encode of an already-128x128 image.
        src={cloudinaryAvatarUrl(CELEBRITY_IMAGE_URL, 64)}
        alt="Mushtaq Khan"
        width={64}
        height={64}
        loading="lazy"
        unoptimized
        className={`w-16 h-16 rounded-full object-cover ring-2 shrink-0 ${tc.ring}`}
      />
      <span className={`text-sm font-medium leading-snug transition-colors ${tc.text}`}>
        Trusted &amp; Recommended by
        <br />
        <span className="font-semibold">Mushtaq Khan</span>
      </span>
    </a>
  )
}
