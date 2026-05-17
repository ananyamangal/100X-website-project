import type { Metadata } from "next"

import RedesignThemeProvider from "@/components/redesign/theme/RedesignThemeProvider"
import RedesignNavbar from "@/components/redesign/chrome/RedesignNavbar"
import RedesignFooter from "@/components/redesign/chrome/RedesignFooter"
import DesktopInquiryBar from "@/components/redesign/chrome/DesktopInquiryBar"

import Hero from "@/components/redesign/sections/Hero"
import TrustStrip from "@/components/redesign/sections/TrustStrip"
import GovTrustBlock from "@/components/redesign/sections/GovTrustBlock"
import DeploymentShowcase from "@/components/redesign/sections/DeploymentShowcase"
import CertificationsGrid from "@/components/redesign/sections/CertificationsGrid"
import TestimonialSlider from "@/components/redesign/sections/TestimonialSlider"
import VideoSection from "@/components/redesign/sections/VideoSection"
import FaqAccordion from "@/components/redesign/sections/FaqAccordion"

/**
 * /preview/2026
 *
 * Preview-only mount for the 2026 industrial redesign. Noindex via
 * page metadata + blocked at robots.txt. Composes every section in
 * the order the production homepage will use once the redesign is
 * approved for switch-over.
 *
 * NOTE: the existing global Navbar and SiteFooter (mounted in the
 * root layout) will appear above/below this preview. That's expected
 * for the preview-only mount — the production switch will replace
 * `app/page.tsx` and either suppress or replace the global chrome.
 */
export const metadata: Metadata = {
  title: "Preview · 2026 Redesign | 100x Circle",
  description: "Internal preview of the 100x Circle 2026 industrial redesign.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/preview/2026" },
}

const HERO_VIDEO_SRC = "/videos/hero-fog.mp4"   // optional asset — drop into public/videos/ to activate
const HERO_VIDEO_POSTER = "/videos/hero-fog-poster.jpg"

const TRUST_STRIP_ITEMS = [
  { to: 10000, suffix: "+", label: "Customers served" },
  { to: 50, suffix: "+", label: "Active distributors" },
  { to: 10, suffix: "+", label: "Years in production" },
  { displayValue: "GeM Q2", label: "OEM certified" },
  { displayValue: "Pan-India", label: "Supply network" },
]

const TESTIMONIALS = [
  {
    quote:
      "The double-barrel units cleared our ward backlog in two weeks. Documentation arrived ready for audit — exactly what tender procurement needs.",
    author: "Procurement Officer",
    role: "Tier-1 Municipal Corporation",
  },
  {
    quote:
      "OEM authorization took 48 hours. We've closed five GeM orders in the first quarter — margins clean, dispatch reliable, no rejections.",
    author: "GeM reseller (Lucknow)",
    role: "Channel partner",
  },
  {
    quote:
      "Dense fog output, low maintenance, English + Hindi support. We've standardised on 100x Circle across our pest-control branches.",
    author: "Operations Head",
    role: "Pest-control firm, Mumbai",
  },
  {
    quote:
      "Pre-monsoon delivery on time, technical briefing for our field crews in Hindi, and consistent fog output across 14 districts.",
    author: "State Health Department",
    role: "Eastern India",
  },
]

const FAQS = [
  {
    q: "Are 100x Circle machines acceptable for GeM and government tenders?",
    a: "Yes. We're a GeM-approved OEM (Q2 category) for fogging machines. Every SKU is spec-mapped to current GeM technical sheets and dispatched with the full compliance dossier procurement teams need — OEM authorization letter, GST invoice, dispatch challan, warranty certificate.",
  },
  {
    q: "Do you supply to dealers and distributors?",
    a: "Yes — channel slots open across most Indian states. Reach out via the contact form with your city, current business, and target volume; margins, territory, and onboarding are discussed in the first call.",
  },
  {
    q: "How quickly can you deliver against a municipal tender?",
    a: "In-stock models dispatch in 24–72 hours from our Gurugram plant. Bulk and custom configurations get a confirmed delivery commitment as part of the tender quote. Pre-monsoon vector-control schedules are coordinated directly with municipal logistics.",
  },
  {
    q: "What after-sales support do institutional buyers get?",
    a: "Dedicated account manager, technical support in English and Hindi, spare-parts dispatch from Gurugram, operator training videos for first-time field teams, and on-site briefings for large deployments.",
  },
  {
    q: "Where can I see the machines in operation?",
    a: "Field-side demo videos are shared with every quote. For 10+ unit orders, we arrange in-person demos at our Gurugram facility or coordinate a visit to the nearest active deployment.",
  },
  {
    q: "Do you provide warranty and what does it cover?",
    a: "Standard manufacturer warranty against material and manufacturing defects. Specific terms — duration, covered components, claim process — are confirmed at the time of quotation and supplied as a warranty certificate with each machine.",
  },
]

// Optional override — set to a YouTube id if you want the demo section to load a specific video.
const DEMO_YOUTUBE_ID = "dQw4w9WgXcQ" // placeholder; swap to a real product demo before promoting

export default function Page() {
  return (
    <RedesignThemeProvider>
      <RedesignNavbar />

      <main>
        <Hero
          eyebrow="Premium industrial · Made in India"
          headline={[
            { text: "Industrial fogging," },
            { text: "engineered" },
            { text: "for India.", accent: true },
          ]}
          sub="GeM-approved OEM supplying thermal, cold, and vehicle-mounted fogging machines to municipal corporations, government health departments, and channel partners across every Indian state."
          primary={{ label: "Request a quote", href: "/contact-us", track: "rd_hero_primary" }}
          secondary={{
            label: "WhatsApp our team",
            href:
              "https://wa.me/917827229116?text=Hi%2C%20I%27d%20like%20to%20discuss%20100x%20Circle%20fogging%20machines",
            track: "rd_hero_whatsapp",
          }}
          videoSrc={HERO_VIDEO_SRC}
          videoPoster={HERO_VIDEO_POSTER}
        />

        <TrustStrip items={TRUST_STRIP_ITEMS} />

        <GovTrustBlock />

        <DeploymentShowcase />

        <CertificationsGrid />

        <TestimonialSlider items={TESTIMONIALS} />

        <VideoSection
          youtubeId={DEMO_YOUTUBE_ID}
          title="Field-side demonstration."
          sub="Footage of 100x Circle machines in real conditions — output, coverage area, and operator workflow."
        />

        <FaqAccordion faqs={FAQS} />
      </main>

      <RedesignFooter />
      <DesktopInquiryBar />
    </RedesignThemeProvider>
  )
}
