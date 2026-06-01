"use client"

import React from "react"

import { CheckCircle } from "lucide-react"
import { DEFAULT_HOME_CONTENT, type HomeContent } from "@/lib/homeContentTypes"

type Props = {
  content?: HomeContent["manufacturerIntro"]
}

export default function ManufacturerIntroBlock({ content }: Props) {
  const c = content ?? DEFAULT_HOME_CONTENT.manufacturerIntro

  return (
    <section className="py-16 md:py-20 bg-white" aria-labelledby="manufacturer-intro-heading">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center mb-14 md:mb-16">
          <div className="order-2 md:order-1 text-center md:text-left">
            <p className="eyebrow text-brand-600 mb-3">{c.badge}</p>
            <h2
              id="manufacturer-intro-heading"
              className="text-display-xs text-gray-900 mb-4 text-balance"
            >
              {c.headline}
            </h2>
            <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-6">
              {c.body}
            </p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm md:text-[15px] text-gray-700 list-none max-w-md mx-auto md:mx-0">
              {c.bullets.map((item) => (
                <li key={item} className="flex items-start">
                  <span className="mt-1.5 mr-2 inline-block w-1.5 h-1.5 rounded-full bg-green-600 shrink-0" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="order-1 md:order-2 relative">
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-md aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.imageUrl}
                alt={c.imageAlt}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 hidden sm:flex flex-col items-start gap-0.5 rounded-xl bg-white shadow-lg ring-1 ring-gray-200 px-4 py-3">
              <span className="text-xs uppercase tracking-wider text-green-700 font-semibold">Manufactured in</span>
              <span className="text-base md:text-lg font-bold text-gray-900">Gurugram, India</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12 mb-12">
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
              {c.section1Title}
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {c.section1Body}
            </p>
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
              {c.section2Title}
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {c.section2Body}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-7 md:p-9">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-5 text-center">
            {c.whyChooseTitle}
          </h3>
          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3 list-none">
            {c.whyChooseBullets.map((item) => (
              <li key={item} className="flex items-start text-gray-700">
                <CheckCircle
                  size={18}
                  aria-hidden="true"
                  className="mt-1 mr-2.5 shrink-0 text-green-600"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
