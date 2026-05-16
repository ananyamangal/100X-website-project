import Link from "next/link"

export default function PolicyPlaceholder({
  title,
  intro,
}: {
  title: string
  intro: string
}) {
  return (
    <div className="pt-32 min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">{title}</h1>
        <p className="text-gray-700 leading-relaxed mb-8">{intro}</p>
        <p className="text-gray-600 text-sm border-t border-gray-200 pt-6">
          Final policy wording will be provided by 100X Circle. This page is live so navigation and SEO stay consistent;
          replace this placeholder when your legal copy is ready.
        </p>
        <p className="mt-8">
          <Link href="/" className="text-green-600 font-medium hover:underline">
            ← Back to Home
          </Link>
        </p>
      </div>
    </div>
  )
}
