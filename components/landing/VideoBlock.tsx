type Props = {
  url: string
  title?: string
  description?: string
}

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    // youtube.com/watch?v=ID or youtu.be/ID
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube-nocookie.com/embed/${u.searchParams.get("v")}`
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube-nocookie.com/embed${u.pathname}`
    }
    // Already an embed URL
    if (url.includes("/embed/")) return url
    return null
  } catch {
    return null
  }
}

export default function VideoBlock({ url, title, description }: Props) {
  const embedUrl = getEmbedUrl(url)
  if (!embedUrl) return null

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 md:px-6 max-w-4xl">
        {(title || description) && (
          <div className="text-center mb-8">
            {title && <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{title}</h2>}
            {description && <p className="text-base text-gray-600 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={embedUrl}
            title={title ?? "Video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full rounded-2xl shadow-lg"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  )
}
