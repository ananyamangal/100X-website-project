import { notFound } from "next/navigation"
import LandingRenderer from "@/components/landing/LandingRenderer"
import { productLandingMetadata } from "@/lib/seo/product-landing-meta"
import { getLandingPage } from "@/lib/seo/landing-pages"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return productLandingMetadata(slug)
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!getLandingPage(slug)) notFound()
  return <LandingRenderer slug={slug} />
}
