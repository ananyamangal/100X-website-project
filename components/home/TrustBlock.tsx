"use client"

import React, { useState, useEffect } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight, Quote } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
                <Quote className="text-green-600/70 mb-4" size={24} aria-hidden="true" />
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
                  ? "h-1.5 w-6 rounded-full bg-green-600 transition-all"
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
            className="grid h-10 w-10 place-items-center rounded-full border border-gray-300 bg-white text-gray-700 transition-all hover:border-green-600 hover:text-green-700 disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next review"
            disabled={!canNext}
            onClick={() => embla?.scrollNext()}
            className="grid h-10 w-10 place-items-center rounded-full border border-gray-300 bg-white text-gray-700 transition-all hover:border-green-600 hover:text-green-700 disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
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
        <div className="text-center mb-16">
          <Badge className="mb-6 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 text-lg px-6 py-2">
            Customer Reviews
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">Trusted Fogging Machine Supplier – What Our Customers Say</h2>
          <p className="text-xl text-gray-600 max-w-5xl mb-4 mx-auto">
            As a reliable <a className="text-blue-500" href="https://www.100xcircle.com/">fogging machine supplier</a>, 100X Circle Pvt Ltd values real feedback from customers across India. Our clients share their experiences about product quality, performance, durability, and after-sales support.
          </p>
          <p className="text-xl text-gray-600 max-w-5xl mx-auto">
            From industrial users to municipal projects, customers appreciate our powerful fog output, easy operation, and long-lasting machines. Their reviews reflect our commitment to delivering dependable fogging solutions for effective pest and mosquito control.
          </p>
        </div>
        <ReviewsCarousel />
      </div>
    </section>
  )
}
