/**
 * Canonical registry for SEO landing pages routed under `/[slug]`.
 *
 * Single source of truth: page type, theme, metadata, hero copy, body
 * sections, FAQs, related links. The sitemap, metadata builder, on-page
 * content, structured data, breadcrumbs, related-product filtering, the
 * audience-aware mobile-CTA bar, and the footer "Popular Products" column
 * all read from here. Launching a new landing page is a **one-file edit**.
 *
 * To add a landing page:
 *   1. Append an entry to `LANDING_PAGES` below.
 *   2. (Optional) Add a permanent redirect from any legacy URL in
 *      `next.config.mjs::redirects`.
 *   3. Everything else picks the new page up automatically.
 *
 * Section vocabulary lives in `./landing-types.ts`.
 */

import { DEFAULT_THEME_BY_TYPE, type LandingPageDef } from "./landing-types"

// ─── Re-exports so existing consumers don't need to update import paths ──
export type { LandingPageDef }
export {
  DEFAULT_THEME_BY_TYPE,
  DEFAULT_SITEMAP_BY_TYPE,
  FORM_SUBMISSION_TYPE,
} from "./landing-types"
export type {
  LandingType,
  LandingTheme,
  LandingSection,
  LandingFormVariant,
  HeroBlock,
  HeroHeadlinePart,
  TrustMetric,
  BenefitItem,
  ProcessStep,
  ComparisonRow,
  CaseStudy,
  FaqEntry,
  CtaBandData,
} from "./landing-types"

/** Legacy alias retained for any external imports. */
export type ContentSection = NonNullable<LandingPageDef["content1"]>

export const LANDING_PAGES: Record<string, LandingPageDef> = {
  "thermal-and-cold-fogging-machine-100xtfs50": {
    slug: "thermal-and-cold-fogging-machine-100xtfs50",
    type: "product",
    metadata: {
      title: "Buy Thermal and Cold Fogging Machine | 100x Circle",
      description:
        "Buy thermal and cold fogging machines from 100x Circle. High-performance, durable foggers for mosquito control and industrial use across India. Contact us today!",
      keywords:
        "buy thermal and cold fogging machine, fogging machine price in india, thermal cold fogger manufacturer india, industrial thermal cold fogging machine supplier, mosquito fogging machine price, order thermal fogging machine",
    },
    content1: {
      h2: "Industrial Thermal Cold Fogging Machine Supplier",
      p: [
        "As a trusted industrial thermal cold fogging machine supplier, 100x Circle offers high-performance machines designed for strong fog output, durability, and ease of operation. Our models are suitable for industrial areas, municipalities, warehouses, farms, and large-scale pest control projects.",
      ],
    },
    content2: {
      h2: "Thermal Cold Fogger Manufacturer  – Wide Applications",
      p: [
        "As a leading thermal cold fogger manufacturer, 100x Circle provides machines that are widely used across multiple industries for effective fogging and disinfection.",
        "Our foggers are commonly used for public health and vector control by municipal corporations, panchayats, hospitals, schools, housing societies, parks, stadiums, and other public institutions to control mosquitoes and harmful insects.",
        "In agriculture and horticulture, the thermal and cold fogging machine helps in pest control for crop fields, greenhouses, and plantations. It is suitable for applying insecticides, fungicides, and disinfectants on crops, fruits, and vegetables.",
        "These machines are also used for warehouse and grain storage disinfection, helping maintain hygiene and prevent contamination. In animal husbandry and veterinary applications, foggers support disease prevention by controlling flies, ticks, and mosquitoes in poultry farms, dairy units, and animal shelters.",
        "For sanitization and disinfection, cold fogging allows safe indoor and outdoor treatment using water-based solutions, making it ideal for commercial and industrial Spaces.",
      ],
    },
    content3: {
      h2: "Fogging Machine Product Certifications & Features",
      p: [
        "If you are looking for the best fogging machine,  100x Circle offers high-quality machines at competitive and budget-friendly rates without compromising on performance.",
        "We focus on delivering certified products that offer long-term value, efficient pest control, and cost-effective performance for both commercial and residential use. Contact us to get the latest price and bulk order details.",
      ],
    },
  },
  "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400": {
    slug: "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
    type: "product",
    metadata: {
      title: "Buy Double Barrel Thermal Fogging Machine | 100x Circle",
      description:
        "Buy Double Barrel Thermal Fogging Machine from 100x Circle. High-power, durable fogger for industrial mosquito control and public health use. Contact us today!",
      keywords:
        "buy double barrel thermal fogging machine, vehicle mounted thermal fogger manufacturer india, vehicle mounted fogging machine, heavy duty vehicle mount fogging machine supplier, double barrel fogging machine",
    },
    content1: {
      h2: "Heavy Duty Vehicle Mount Fogging Machine Supplier",
      p: [
        "As a trusted heavy duty vehicle mount fogging machine supplier, 100x Circle offers powerful and reliable solutions for large-scale mosquito and pest control operations. Our vehicle mount fogging machines are specially designed for wide-area coverage, making them ideal for municipal corporations, public health departments, and industrial zones.",
        "The double barrel system ensures dense and high fog output, allowing faster treatment of cities, villages, factories, and rural areas. Built with a strong pulse jet engine and durable stainless steel components, the machine delivers long-lasting performance even in demanding field conditions.",
        "Our heavy duty vehicle mount fogging machine is suitable for public health drives, emergency vector control programs, and large outdoor fogging projects across India. With high efficiency, strong coverage, and dependable build quality, it is a practical solution for professional use.",
      ],
    },
    content2: {
      h2: "Vehicle Mounted Thermal Fogger Manufacturer - Wide Applications",
      p: [
        "Vehicle Mounted Thermal Fogger Manufacturer, designs high-performance machines built for large-area mosquito and pest control operations. Our vehicle mountable models are specially engineered to deliver dense fog output with strong coverage, making them ideal for municipal corporations, public health departments, and professional pest control agencies.",
        "The Double Barrel Thermal Fogging Machine – 100XDB400 is designed for mounting on vehicles, allowing fast movement and efficient fogging across cities, villages, industrial areas, and rural regions. Its powerful pulse jet engine technology ensures consistent performance, while the durable stainless steel components provide long service life even in demanding field conditions.",
        "We focus on quality manufacturing, reliable performance, and user-friendly operation to support large-scale vector control and emergency fogging drives across India.",
      ],
    },
    content3: {
      h2: "Double Barrel Fogging Machine Product Certifications & Features",
      p: [
        "The Double Barrel Fogging Machine is built with advanced technology and trusted certifications to ensure powerful performance and reliability for large-scale fogging operations.",
        "This machine is designed for high coverage, durability, and efficient mosquito and vector control in urban and rural areas.",
      ],
    },
  },
  "thermal-fogging-machine-with-stainless-steel-tank-100xssma20": {
    slug: "thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
    type: "product",
    metadata: {
      title: "Buy Stainless Steel Tank Thermal Fogger | 100x Circle",
      description:
        "Buy Stainless Steel Tank Thermal Fogger from 100x Circle. Durable, rust-resistant design with powerful fog output for effective mosquito control. Contact us today!",
      keywords:
        "buy stainless steel tank thermal fogger, stainless steel tank fogging machine manufacturer india, SS tank thermal fogging machine supplier, stainless steel fogger price, thermal fogging machine with stainless steel tank, SS fogging machine price",
    },
    content1: {
      h2: "SS Tank Thermal Fogging Machine Supplier",
      p: [
        "The SS Tank Thermal Fogging Machine is designed for powerful mosquito and pest control with long-lasting durability. Built with high-quality stainless steel tanks, this model ensures better resistance to rust and corrosion, making it ideal for regular outdoor and industrial use.",
        "This machine features a portable hand-carried design, allowing easy handling and smooth movement across different locations. As a thermal fogger, it produces dense and uniform fog that helps cover large areas effectively, making it suitable for public health drives, warehouses, farms, factories, and residential societies.",
        "In addition, this model is built for consistent field performance with low maintenance requirements. Its strong engine technology ensures efficient fuel use and steady fog output, helping professionals complete fogging operations quickly and effectively. It is a practical choice for municipalities, pest control agencies, and industrial users looking for a dependable stainless steel thermal fogging machine.",
      ],
    },
    content2: {
      h2: "Stainless Steel Tank Fogging Machine Manufacturer - Wide Applications",
      p: [
        "Stainless steel tank fogging machine manufacturer provides reliable fogging solutions for a wide range of applications across India. Our machines are widely used for public health and vector control by municipal corporations, panchayats, hospitals, schools, housing societies, parks, stadiums, and other public institutions to control mosquitoes and harmful insects effectively.",
        "In the agriculture and horticulture sector, our stainless steel tank fogging machines support pest control in crop fields, greenhouses, and plantations. They are suitable for the application of fungicides, insecticides, and disinfectants on crops, fruits, and vegetables, helping improve plant protection and productivity. The durable SS tank design ensures safe handling of chemicals and long-term performance in field conditions.",
        "These machines are also ideal for warehouse and storage disinfection, including grain silos and storage units, to maintain hygiene and prevent contamination. In animal husbandry and veterinary applications, foggers help reduce disease transmission among livestock by controlling flies, ticks, and mosquitoes in poultry farms, dairy units, animal sheds, and stables.",
      ],
    },
    content3: {
      h2: "Stainless Steel Fogger Product Certifications & Features",
      p: [
        "The Stainless Steel Fogger is built with precision technology to deliver consistent and powerful fog output for professional pest control operations. Designed for durability, its stainless steel construction ensures corrosion resistance and long-term performance in demanding field conditions.",
        "This model is suitable for government departments and authorized buyers. It is also a budget-friendly solution that offers strong performance, reliable operation, and excellent value for public health, agriculture, and industrial fogging applications across India.",
      ],
    },
  },
}

export function getLandingPage(slug: string): LandingPageDef | undefined {
  return LANDING_PAGES[slug]
}

export function getLandingSlugs(): string[] {
  return Object.keys(LANDING_PAGES)
}

export function getAllLandingPages(): LandingPageDef[] {
  return Object.values(LANDING_PAGES)
}

/** Short display name derived from the title (strips " | brand" suffix). */
export function getLandingDisplayName(slug: string): string | undefined {
  const def = LANDING_PAGES[slug]
  if (!def) return undefined
  const [head] = def.metadata.title.split("|")
  return (head || def.metadata.title).trim()
}

/** Resolve effective theme for a landing — registry override wins. */
export function getLandingTheme(def: LandingPageDef) {
  return def.theme ?? DEFAULT_THEME_BY_TYPE[def.type]
}
