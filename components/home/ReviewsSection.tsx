'use client'
import React, { useEffect, useRef, useState } from 'react'
import ScrollReveal from '@/components/cinematic/ScrollReveal'

interface Review {
  _id: string
  customerName: string
  organization?: string
  location?: string
  rating: number
  review: string
  imageUrl?: string
  product?: string
  isPublished?: boolean
  order?: number
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"
          className={s <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-200'}
          fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-4 h-full">
      <div className="flex items-start justify-between gap-3">
        <StarRating rating={review.rating} />
        <svg width="28" height="20" viewBox="0 0 28 20" fill="none" aria-hidden="true" className="text-brand-100 shrink-0 mt-0.5">
          <path d="M0 20V12.5C0 5.596 3.654 1.458 10.96 0L12.5 2.692C9.615 3.5 7.788 4.596 7.02 5.98 6.25 7.365 5.962 8.75 6.154 10.135H12.5V20H0zm15.5 0V12.5C15.5 5.596 19.154 1.458 26.46 0L28 2.692C25.115 3.5 23.288 4.596 22.52 5.98c-.77 1.385-1.058 2.77-.866 4.155H28V20H15.5z" fill="currentColor" />
        </svg>
      </div>
      <p className="text-gray-700 text-sm leading-relaxed flex-1 italic">"{review.review}"</p>
      <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
        {review.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={review.imageUrl} alt={review.customerName || 'Customer'} className="w-10 h-10 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            <span className="text-brand-700 font-700 text-sm">{(review.customerName || '?').charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="font-600 text-gray-900 text-sm truncate">{review.customerName || 'Anonymous'}</p>
          {(review.organization || review.location) && (
            <p className="text-gray-400 text-xs truncate">
              {[review.organization, review.location].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface ReviewsSectionProps {
  product?: string
  limit?: number
}

export default function ReviewsSection({ product, limit = 6 }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loaded, setLoaded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (product) params.set('product', product)
    fetch(`/api/reviews?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setReviews(data)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [product, limit])

  if (loaded && reviews.length === 0) return null

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (r.rating || 5), 0) / reviews.length).toFixed(1)
    : '5.0'

  return (
    <section className="py-20 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <ScrollReveal animation="fade-up" className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-brand-600 mb-3">Customer Reviews</p>
              <h2 className="text-display-xs text-gray-900 text-balance">
                What our customers say.
              </h2>
            </div>
            {reviews.length > 0 && (
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-center">
                  <p className="text-4xl font-800 text-gray-900 leading-none">{avgRating}</p>
                  <StarRating rating={parseFloat(avgRating)} />
                  <p className="text-xs text-gray-400 mt-1">{reviews.length} reviews</p>
                </div>
              </div>
            )}
          </div>
        </ScrollReveal>

        {!loaded ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shimmer h-48" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {reviews.map((r, i) => (
              <ScrollReveal key={r._id} animation="fade-up" delay={i * 60}>
                <ReviewCard review={r} />
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
