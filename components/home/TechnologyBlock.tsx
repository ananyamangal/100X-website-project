"use client"

import React, { useState, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Flame,
  Droplets,
  Wind,
  Target,
  Leaf,
  ShieldCheck,
  Building2,
  Sprout,
  ArrowRight,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { DEFAULT_HOME_CONTENT, type HomeContent } from "@/lib/homeContentTypes"

const STEP_ICONS = [Flame, Droplets, Wind, Target]
const BENEFIT_ICONS = [Leaf, ShieldCheck, Building2, Sprout]

type Props = {
  content?: HomeContent["technology"]
}

export default function TechnologyBlock({ content }: Props) {
  const c = content ?? DEFAULT_HOME_CONTENT.technology
  const [activeStep, setActiveStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleStepClick = (index: number) => {
    setActiveStep((prev) => (prev === index ? -1 : index))
  }

  return (
    <section className="bg-white py-16 md:py-24" aria-labelledby="technology-heading">
      <div className="container mx-auto px-4 max-w-6xl">

        {/* Section header */}
        <div className="text-center mb-12 md:mb-16">
          <p className="eyebrow text-brand-600 mb-3">{c.badge}</p>
          <h2
            id="technology-heading"
            className="text-display-xs text-gray-900 mb-4 text-balance"
          >
            {c.headline}
          </h2>
          <p className="text-base md:text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">{c.body}</p>
        </div>

        {/* Video + Steps — desktop side-by-side, mobile stacked */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-16 md:mb-20 items-start">

          {/* LEFT: Video panel */}
          <div className="lg:sticky lg:top-24">
            <div className="relative rounded-2xl overflow-hidden bg-gray-950 shadow-2xl ring-1 ring-white/10 aspect-video">
              {c.videoUrl ? (
                <>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    ref={videoRef}
                    src={c.videoUrl}
                    poster={c.videoPoster || undefined}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    aria-label={c.videoAlt || "Thermal fogging machine demonstration"}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                  {/* Play / Pause control */}
                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={isPlaying ? "Pause video" : "Play video"}
                    className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white rounded-full p-3 transition-all hover:scale-105 focus-visible:ring-2 focus-visible:ring-green-400"
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  {/* Gradient overlay — subtle brand touch */}
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                </>
              ) : (
                /* Placeholder when no video is configured */
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-500 p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                    <Play size={30} className="ml-1 text-brand-400" />
                  </div>
                  <p className="text-sm text-gray-400 leading-snug">
                    Demo video not configured yet.
                    <br />
                    Upload one in Admin → Homepage Content → How It Works.
                  </p>
                </div>
              )}
            </div>

            {/* Video caption / SEO description */}
            {c.videoAlt && (
              <p className="mt-3 text-center text-xs text-gray-400 leading-snug px-2">
                {c.videoAlt}
              </p>
            )}
          </div>

          {/* RIGHT: Process steps accordion */}
          <div className="relative">
            {/* Vertical connecting line */}
            <div
              className="absolute left-[19px] top-10 bottom-10 w-0.5 bg-gradient-to-b from-green-400/60 via-green-200/40 to-transparent pointer-events-none"
              aria-hidden
            />

            <ol className="space-y-2 list-none relative">
              {c.steps.map((step, index) => {
                const Icon = STEP_ICONS[index % STEP_ICONS.length]
                const isActive = activeStep === index

                return (
                  <li key={`${step.title}-${index}`} className="relative">
                    <button
                      type="button"
                      aria-expanded={isActive}
                      onClick={() => handleStepClick(index)}
                      className={`w-full text-left flex gap-4 items-start px-4 py-4 rounded-xl transition-all duration-200 ${
                        isActive
                          ? "bg-brand-50 ring-1 ring-green-400/50 shadow-sm"
                          : "hover:bg-gray-50/80"
                      }`}
                    >
                      {/* Step number circle */}
                      <span
                        className={`relative z-10 shrink-0 grid place-items-center w-10 h-10 rounded-full text-sm font-bold ring-2 transition-colors ${
                          isActive
                            ? "bg-brand-600 ring-brand-500 text-white shadow-green-200 shadow-md"
                            : "bg-white ring-gray-200 text-gray-500"
                        }`}
                      >
                        {index + 1}
                      </span>

                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3
                            className={`font-semibold leading-snug text-base ${
                              isActive ? "text-brand-800" : "text-gray-800"
                            }`}
                          >
                            {step.title}
                          </h3>
                          <div className="flex items-center gap-2 shrink-0">
                            <Icon
                              className={`transition-colors ${isActive ? "text-green-500" : "text-gray-300"}`}
                              size={18}
                              aria-hidden
                            />
                            {isActive ? (
                              <ChevronUp size={16} className="text-green-500" />
                            ) : (
                              <ChevronDown size={16} className="text-gray-300" />
                            )}
                          </div>
                        </div>
                        {!isActive && (
                          <p className="text-sm text-gray-400 mt-0.5 line-clamp-1">{step.body}</p>
                        )}
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isActive && (
                      <div className="pl-14 pr-4 pb-4 -mt-1">
                        <p className="text-gray-600 text-sm leading-relaxed">{step.body}</p>
                        {step.details && (
                          <p className="text-gray-500 text-sm leading-relaxed mt-2 pt-2 border-t border-brand-100">
                            {step.details}
                          </p>
                        )}

                        {/* Per-step media */}
                        {step.mediaUrl && step.mediaType === "image" && (
                          <Image
                            src={step.mediaUrl}
                            alt={step.mediaAlt || step.title}
                            width={800}
                            height={400}
                            className="mt-3 rounded-xl w-full h-auto max-h-48 object-cover ring-1 ring-gray-200"
                            decoding="async"
                          />
                        )}
                        {step.mediaUrl && step.mediaType === "gif" && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={step.mediaUrl}
                            alt={step.mediaAlt || step.title}
                            className="mt-3 rounded-xl w-full ring-1 ring-gray-200"
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                        {step.mediaUrl && step.mediaType === "video" && (
                          // eslint-disable-next-line jsx-a11y/media-has-caption
                          <video
                            src={step.mediaUrl}
                            aria-label={step.mediaAlt || step.title}
                            className="mt-3 rounded-xl w-full ring-1 ring-gray-200"
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="metadata"
                          />
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          </div>
        </div>

        {/* Benefits dark panel */}
        <div className="rounded-3xl bg-gradient-to-b from-gray-950 to-gray-900 p-8 md:p-10">
          <h3 className="text-2xl md:text-3xl font-bold text-white text-center mb-8 md:mb-10">
            {c.benefitsTitle}
          </h3>
          <ul className="grid sm:grid-cols-2 gap-6 md:gap-8 list-none">
            {c.benefits.map((b, index) => {
              const Icon = BENEFIT_ICONS[index % BENEFIT_ICONS.length]
              return (
                <li key={b.title} className="flex gap-4 items-start">
                  <span className="shrink-0 grid place-items-center w-11 h-11 rounded-xl bg-brand-600/15 ring-1 ring-brand-500/30">
                    <Icon className="text-brand-400" size={22} aria-hidden />
                  </span>
                  <div>
                    <h4 className="text-base md:text-lg font-semibold text-white mb-1">{b.title}</h4>
                    <p className="text-sm md:text-base text-gray-300 leading-relaxed">{b.body}</p>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="mt-10 md:mt-12 flex justify-center">
            <Button asChild size="lg" className="bg-brand-600 hover:bg-brand-700 text-lg px-8 py-4">
              <Link href="#products" className="flex items-center">
                Explore Machines <ArrowRight className="ml-2" size={20} />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
