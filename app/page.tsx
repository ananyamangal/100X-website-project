// Revalidate homepage data every 60 seconds via ISR.
// Content changes (banners, products) go live within 1 minute max.
export const revalidate = 60

import clientPromise from "@/lib/mongodb"
import { getHomeContent } from "@/lib/homeContent"
import { serializeBlogs } from "@/lib/blogSerialize"
import HomePageClient from "@/components/home/HomePageClient"
import HomepageAiSummary from "@/components/seo/HomepageAiSummary"
import HomepageTestimonialsJsonLd from "@/components/seo/HomepageTestimonialsJsonLd"
import { optimizeCloudinary } from "@/lib/cloudinaryUrl"

// Server-side preload component for the first banner image.
// This emits <link rel="preload"> tags in <head> for the actual dynamic
// Cloudinary banner URLs, not just the static fallbacks in layout.tsx.
function BannerPreloads({ banners }: { banners: any[] }) {
  const first = banners[0]
  if (!first) return null
  const desktop = optimizeCloudinary(first.desktopBannerImage || first.image, 1920)
  const tablet = optimizeCloudinary(first.tabletBannerImage || first.desktopBannerImage || first.image, 1200)
  const mobile = optimizeCloudinary(first.mobileBannerImage || first.desktopBannerImage || first.image, 800)
  return (
    <>
      {desktop && desktop.includes("cloudinary.com") && (
        <link rel="preload" as="image" href={desktop} media="(min-width: 1024px)" />
      )}
      {tablet && tablet.includes("cloudinary.com") && (
        <link rel="preload" as="image" href={tablet} media="(min-width: 768px) and (max-width: 1023.98px)" />
      )}
      {mobile && mobile.includes("cloudinary.com") && (
        <link rel="preload" as="image" href={mobile} media="(max-width: 767.98px)" />
      )}
    </>
  )
}

export default async function HomePage() {
  const client = await clientPromise
  const db = client.db()

  const [productsRaw, bannersRaw, blogsRaw, accreditationsRaw, customersRaw, brochureDoc, homeContent, homepageSectionsRaw, sparePartsRaw, trustBadgesRaw, pageSectionsRaw] =
    await Promise.all([
      db.collection("products").find({}).toArray(),
      db.collection("banners").find({}).toArray(),
      db
        .collection("blogs")
        .aggregate([
          { $match: { isPublished: true } },
          { $addFields: { orderSort: { $ifNull: ["$order", 999999] } } },
          { $sort: { orderSort: 1, publishedAt: -1 } },
        ])
        .toArray(),
      db.collection("accreditations").find({}).sort({ order: 1 }).toArray(),
      db.collection("customers").find({}).sort({ order: 1 }).toArray(),
      db.collection("brochure").findOne({ key: "main" }),
      getHomeContent(),
      db.collection("homepage_sections").find({ enabled: true }).sort({ order: 1 }).toArray(),
      db.collection("spare_parts").find({ isPublished: true }).sort({ order: 1 }).limit(8).toArray(),
      db.collection("trust_badges").find({ isActive: true }).sort({ order: 1 }).toArray(),
      db.collection("page_sections").find({ pageKey: "homepage" }).toArray(),
    ])

  // Serialize MongoDB docs (ObjectId → hex string, Date → ISO string)
  const products = (JSON.parse(JSON.stringify(productsRaw)) as any[])
    .map((p: any) => ({
      ...p,
      imageUrls: Array.isArray(p.imageUrls) ? p.imageUrls : p.imageUrl ? [p.imageUrl] : [],
    }))
    .sort((a: any, b: any) => {
      const orderA = a.order !== undefined ? a.order : Infinity
      const orderB = b.order !== undefined ? b.order : Infinity
      if (orderA !== orderB) return orderA - orderB
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    })

  const banners = JSON.parse(JSON.stringify(bannersRaw))
  const blogPosts = serializeBlogs(blogsRaw)
  const accreditations = JSON.parse(JSON.stringify(accreditationsRaw))
  const customers = JSON.parse(JSON.stringify(customersRaw))
  const mainBrochureUrl: string | null = brochureDoc ? (brochureDoc as any).mainBrochureUrl ?? null : null
  const homepageSections = JSON.parse(JSON.stringify(homepageSectionsRaw))
  const spareParts = JSON.parse(JSON.stringify(sparePartsRaw))
  const trustBadges = JSON.parse(JSON.stringify(trustBadgesRaw))
  const pageSections = JSON.parse(JSON.stringify(pageSectionsRaw))

  return (
    <>
      <BannerPreloads banners={banners} />
      <HomepageAiSummary />
      <HomepageTestimonialsJsonLd />
      <HomePageClient
        products={products}
        banners={banners}
        blogPosts={blogPosts}
        accreditations={accreditations}
        customers={customers}
        mainBrochureUrl={mainBrochureUrl}
        homeContent={homeContent}
        homepageSections={homepageSections}
        spareParts={spareParts}
        trustBadges={trustBadges}
        pageSections={pageSections}
      />
    </>
  )
}
