export const dynamic = "force-dynamic"

import clientPromise from "@/lib/mongodb"
import { getHomeContent } from "@/lib/homeContent"
import { serializeBlogs } from "@/lib/blogSerialize"
import HomePageClient from "@/components/home/HomePageClient"

export default async function HomePage() {
  const client = await clientPromise
  const db = client.db()

  const [productsRaw, bannersRaw, blogsRaw, accreditationsRaw, customersRaw, brochureDoc, homeContent] =
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

  return (
    <HomePageClient
      products={products}
      banners={banners}
      blogPosts={blogPosts}
      accreditations={accreditations}
      customers={customers}
      mainBrochureUrl={mainBrochureUrl}
      homeContent={homeContent}
    />
  )
}
