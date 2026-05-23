"use client"

import React from "react"

interface Props {
  /** Short transition phrase displayed between sections. Keep to 1 line. */
  text: string;
  /** Optional eyebrow shown above the text. */
  eyebrow?: string;
}

export default function SectionConnector({ text, eyebrow }: Props) {
  return (
    <div className="bg-white py-6 md:py-8" aria-hidden="true">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        {eyebrow && (
          <p className="text-xs md:text-sm uppercase tracking-widest text-green-700 font-semibold mb-2">
            {eyebrow}
          </p>
        )}
        <p className="text-base md:text-lg text-gray-500 italic">{text}</p>
      </div>
    </div>
  )
}
