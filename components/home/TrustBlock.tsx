"use client"

import React, { useState, useEffect } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight, Quote, ShieldCheck, MapPin, Building2, Globe2, Factory, BadgeCheck } from "lucide-react"

import { Card } from "@/components/ui/card"

function ReviewsCarousel() {
  const reviews = [
    {
      name: "Ramesh S.",
      title: "EcoCare Pest Services, Bihar & Jharkhand",
      review:
        "We've been using 100X fogging machines for over a year now in our pest control business across Bihar and Jharkhand. The coverage and performance are excellent, especially in dense residential areas. Easy to operate, low maintenance, and highly effective in mosquito control. Definitely recommended for professional use.",
      avatar: "/review-avatars/review1.jpg",
    },
    {
      name: "Dr. Meena Verma",
      title: "Public Health Officer, UP",
      review:
        "100X's Double Barrel Fogging Machine was a game-changer during our dengue prevention drives. It covers large areas in less time, and the pulse jet technology really improves the fog output. Our teams found it reliable and easy to handle in both urban and rural campaigns.",
      avatar: "/review-avatars/review3.jpg",
    },
    {
      name: "Vijay Kumar",
      title: "Farmer from Muzaffarpur, Bihar",
      review:
        "I bought the 100X power weeder last season for my vegetable farm. It's strong, fuel-efficient, and saved me a lot of labor. Even my son can handle it without much training. Great support from the company too!",
      avatar: "/review-avatars/review5.jpg",
    },
    {
      name: "Ramdas Yadav",
      title: "Agri Cooperative Leader, UP",
      review:
        "Our cooperative purchased 2 tillers  from 100X for shared farming. These machines are robust and ideal for small and medium farms. We're happy with the results and cost savings. Many farmers in our group are planning to buy their own now.",
      avatar: "/review-avatars/review2.jpg",
    },
    {
      name: "Mahesh Patel",
      title: "Gujarat",
      review:
        "I've used different machines from 100X – from hand carried foggers to vehicle mounted type foggers . All products are solid, well-engineered, and suited for Indian conditions. Their double barrel fogger especially stands out for its fog throw and area coverage.",
      avatar: "/review-avatars/review4.jpg",
    },
  ];

  const [emblaRef, embla] = useEmblaCarousel({ align: "start", loop: false, skipSnaps: false });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [selected, setSelected] = useState(0);

  const refreshState = React.useCallback(() => {
    if (!embla) return;
    setCanPrev(embla.canScrollPrev());
    setCanNext(embla.canScrollNext());
    setSelected(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    refreshState();
    embla.on("select", refreshState);
    embla.on("reInit", refreshState);
  }, [embla, refreshState]);

  return (
    <div className="relative max-w-7xl mx-auto">
      <div className="overflow-hidden" ref={emblaRef}>
        <ul className="flex list-none -ml-4 md:-ml-6">
          {reviews.map((review, idx) => (
            <li
              key={idx}
              className="basis-full md:basis-1/2 lg:basis-1/3 shrink-0 grow-0 pl-4 md:pl-6"
            >
              <Card className="h-full border border-gray-200 shadow-sm p-7 md:p-8 flex flex-col">
                <Quote className="text-brand-600/70 mb-4" size={24} aria-hidden="true" />
                <p className="text-base text-gray-700 leading-relaxed line-clamp-6 italic flex-1">
                  "{review.review}"
                </p>
                <div className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-5">
                  <img
                    src={review.avatar}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                    className="w-11 h-11 rounded-full object-cover border border-gray-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 line-clamp-1">{review.name}</div>
                    <div className="text-xs text-gray-500 line-clamp-1">{review.title}</div>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="flex items-center gap-2" aria-label="Review slide indicators">
          {reviews.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to review ${i + 1}`}
              aria-current={selected === i}
              onClick={() => embla?.scrollTo(i)}
              className={
                selected === i
                  ? "h-1.5 w-6 rounded-full bg-brand-600 transition-all"
                  : "h-1.5 w-1.5 rounded-full bg-gray-300 transition-all hover:bg-gray-400"
              }
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous review"
            disabled={!canPrev}
            onClick={() => embla?.scrollPrev()}
            className="grid h-10 w-10 place-items-center rounded-full border border-gray-300 bg-white text-gray-700 transition-all hover:border-brand-600 hover:text-brand-700 disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next review"
            disabled={!canNext}
            onClick={() => embla?.scrollNext()}
            className="grid h-10 w-10 place-items-center rounded-full border border-gray-300 bg-white text-gray-700 transition-all hover:border-brand-600 hover:text-brand-700 disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TrustBlock() {
  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-14">
          <div className="flex flex-wrap justify-center items-center gap-3 mb-4 text-xs md:text-sm text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600" aria-hidden="true" />
              Field reviews
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600" aria-hidden="true" />
              Real customers
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600" aria-hidden="true" />
              Verified deployments
            </span>
          </div>
          <p className="eyebrow text-brand-600 mb-3">Customer Reviews</p>
          <h2 className="text-display-xs text-gray-900 mb-4 text-balance">What our customers say.</h2>
          <p className="text-base md:text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Trusted by 10,000+ customers — municipal bodies, Nagar Nigams, and farm cooperatives across India. Field reviews from the people running our machines every day.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto mb-12 md:mb-16">
          {[
            { label: "GeM-approved OEM", sub: "Direct government procurement" },
            { label: "Made in India", sub: "Gurugram manufacturing facility" },
            { label: "10,000+ customers", sub: "Municipalities, Nagar Nigams, farmers" },
          ].map((cue) => (
            <div
              key={cue.label}
              className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm"
            >
              <div className="text-base md:text-lg font-bold text-gray-900 mb-1">
                {cue.label}
              </div>
              <div className="text-xs md:text-sm text-gray-600">{cue.sub}</div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-gray-200 bg-gray-50/60 px-5 py-6 md:px-8 md:py-7 max-w-5xl mx-auto mb-12 md:mb-16">
          <p className="text-center text-xs md:text-sm uppercase tracking-widest text-brand-700 font-semibold mb-5">
            Manufacturer Authority
          </p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5 list-none">
            {[
              { icon: BadgeCheck, label: "GeM OEM" },
              { icon: MapPin, label: "Made in India" },
              { icon: Building2, label: "Government Supply" },
              { icon: Globe2, label: "Export Capability" },
              { icon: Factory, label: "In-house Manufacturing" },
              { icon: ShieldCheck, label: "ISO-grade Build" },
            ].map((c) => {
              const Icon = c.icon
              return (
                <li key={c.label} className="flex flex-col items-center text-center gap-2">
                  <span className="grid place-items-center w-10 h-10 rounded-xl bg-white ring-1 ring-gray-200 shadow-sm">
                    <Icon size={18} className="text-brand-700" aria-hidden="true" />
                  </span>
                  <span className="text-xs md:text-sm font-semibold text-gray-800 leading-tight">
                    {c.label}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <ReviewsCarousel />
      </div>
    </section>
  )
}
