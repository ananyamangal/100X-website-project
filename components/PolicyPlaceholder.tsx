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
          For queries related to this policy, contact us at{" "}
          <a href="mailto:100xcircle@gmail.com" className="text-brand-600 hover:underline">100xcircle@gmail.com</a>{" "}
          or call <a href="tel:+917827229116" className="text-brand-600 hover:underline">+91-7827229116</a>.
        </p>
        <p className="mt-8">
          <Link href="/" className="text-brand-600 font-medium hover:underline">
            ← Back to Home
          </Link>
        </p>
      </div>
    </div>
  )
}
