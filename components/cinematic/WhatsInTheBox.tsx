import React from 'react'
import Image from 'next/image'
import ScrollReveal from '@/components/cinematic/ScrollReveal'
import { Package } from 'lucide-react'

interface BoxItem {
  item: string
  quantity: string
  imageUrl?: string
}

export default function WhatsInTheBox({ items, productName }: { items: BoxItem[]; productName: string }) {
  if (!items?.length) return null

  return (
    <section className="py-16 md:py-20 bg-white border-t border-gray-100">
      <div className="container mx-auto px-4 md:px-6">
        <ScrollReveal animation="fade-up" className="mb-10">
          <p className="eyebrow text-brand-600 mb-3">In the Box</p>
          <h2 className="text-display-xs text-gray-900">What's included.</h2>
          <p className="text-gray-500 text-sm mt-2">Every {productName} ships complete — nothing extra to buy.</p>
        </ScrollReveal>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((item, i) => (
            <ScrollReveal key={i} animation="fade-up" delay={i * 50}>
              <div className="group flex flex-col items-center text-center bg-gray-50 hover:bg-brand-50 border border-gray-100 hover:border-brand-200 rounded-2xl p-5 transition-all duration-300 h-full">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.item}
                    width={64}
                    height={64}
                    className="w-16 h-16 object-contain mb-3"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-brand-100 group-hover:bg-brand-200 flex items-center justify-center mb-3 transition-colors">
                    <Package size={22} className="text-brand-600" />
                  </div>
                )}
                <p className="font-600 text-gray-900 text-sm leading-snug mb-1.5">{item.item}</p>
                <span className="text-[11px] font-600 bg-white border border-gray-200 text-gray-500 px-2.5 py-0.5 rounded-full">
                  ×{item.quantity}
                </span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
