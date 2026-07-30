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
  light: { card: "bg-brand-50/70 border-brand-100 group-hover:border-brand-300", eyebrow: "text-brand-600", name: "text-gray-500" },
  dark: { card: "bg-white/[0.04] border-white/10 group-hover:border-white/20", eyebrow: "text-brand-400", name: "text-gray-500" },
} as const

/**
 * Trust card for landing pages — a face-forward photo + "As seen on TV &
 * film" hook, linking to the full celebrity section on the homepage.
 * Deliberately not a reuse of CelebritySectionsBlock: this is sized and
 * weighted like a certification card, not a standalone page section.
 */
export default function CelebrityTrustBadge({ theme = "light", className = "" }: CelebrityTrustBadgeProps) {
  const tc = THEME[theme]
  return (
    <a
      href={CELEBRITY_SECTION_HREF}
      className={`group flex items-center gap-4 rounded-xl border p-3 transition-colors ${tc.card} ${className}`}
    >
      <Image
        // Cloudinary already does the face-crop + format/quality transform
        // (source is a tall 3115x4672 portrait, not a headshot) — Next's
        // optimizer can't do gravity-aware cropping, so `unoptimized` skips
        // a redundant re-encode of an already-square image.
        src={cloudinaryAvatarUrl(CELEBRITY_IMAGE_URL, 112)}
        alt="Mushtaq Khan"
        width={112}
        height={112}
        loading="lazy"
        unoptimized
        className="w-24 h-24 md:w-28 md:h-28 rounded-xl object-cover shrink-0"
      />
      <div className="min-w-0">
        <p className={`eyebrow ${tc.eyebrow}`}>As Seen on TV &amp; Film</p>
        <p className={`text-xs mt-1 ${tc.name}`}>Mushtaq Khan</p>
      </div>
    </a>
  )
}
