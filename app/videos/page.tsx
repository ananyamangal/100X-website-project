import type { Metadata } from "next"
import Link from "next/link"
import clientPromise from "@/lib/mongodb"
import { SITE_URL } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Video Knowledge Center | 100x Circle Thermal Fogging",
  description:
    "Watch tutorials, product demonstrations, and deployment videos for 100x Circle thermal fogging machines. Learn operation, maintenance, and best practices.",
  alternates: { canonical: `${SITE_URL}/videos` },
}

async function getVideos() {
  try {
    const client = await clientPromise
    const db = client.db()
    return await db.collection("videos").find({ published: true }).sort({ createdAt: -1 }).toArray()
  } catch {
    return []
  }
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/)
  return m ? m[1] : null
}

export default async function VideosPage() {
  const videos = await getVideos()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-green-700 to-green-900 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-green-300 text-sm font-medium uppercase tracking-wider mb-3">Video Knowledge Center</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Learn from Our Video Library
          </h1>
          <p className="text-green-100 text-lg max-w-2xl">
            Product demonstrations, operation tutorials, maintenance guides, and field deployment
            videos for 100x Circle thermal fogging machines.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {videos.length === 0 ? (
          <div className="text-center py-24 text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-xl mb-2">Video library coming soon</p>
            <p className="text-sm">We are adding our product and tutorial videos. Check back soon.</p>
            <Link href="/products" className="mt-6 inline-block bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-green-700 transition-colors">
              View Products
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {videos.map((v: any) => {
              const ytId = v.videoUrl ? getYouTubeId(v.videoUrl) : null
              return (
                <div key={String(v._id)} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {ytId ? (
                    <div className="aspect-video">
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}`}
                        title={v.title}
                        className="w-full h-full"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {v.relatedProduct && (
                        <span className="text-xs bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full font-medium">
                          {v.relatedProduct}
                        </span>
                      )}
                    </div>
                    <h2 className="font-bold text-gray-900 text-base mb-2">{v.title}</h2>
                    {v.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{v.description}</p>
                    )}
                    {v.transcript && (
                      <details className="mt-3">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-green-600">View transcript</summary>
                        <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">{v.transcript}</p>
                      </details>
                    )}
                    {v.relatedBlog && (
                      <Link href={`/blog/${v.relatedBlog}`} className="mt-3 block text-xs text-green-600 hover:underline">
                        Related article →
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
