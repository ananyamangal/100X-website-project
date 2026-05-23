"use client"

import React from "react"

const LOGO_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect fill='%23e5e7eb' width='80' height='80' rx='8'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='10'%3ELogo%3C/text%3E%3C/svg%3E";

interface Props {
  accreditations: any[];
}

export default function AccreditationsStrip({ accreditations }: Props) {
  if (accreditations.length === 0) return null;

  const n = accreditations.length;
  const extendedAccreditations = [...accreditations, ...accreditations];
  const itemWidthPercent = 100 / n;

  return (
    <section className="py-6 md:py-12 bg-gray-50 overflow-hidden">
      <div className="container mx-auto px-2 md:px-4">
        <div className="relative overflow-hidden">
          <div className="flex animate-logo-marquee">
            {extendedAccreditations.map((accreditation, index) => (
              <div
                key={`acc-${index}-${(accreditation as any)._id ?? accreditation.logo ?? index}`}
                className="flex-shrink-0 px-1 md:px-4 max-md:!w-1/3"
                style={{ width: `${itemWidthPercent}%` }}
              >
                <div className="bg-white rounded-lg p-1.5 md:p-6 h-20 md:h-28 lg:h-32 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow min-h-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={accreditation.logo || LOGO_PLACEHOLDER}
                    alt={accreditation.name ? `${accreditation.name} certification` : "Industry certification"}
                    className="object-contain max-w-full max-h-full min-h-0 min-w-0 w-full h-full"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { e.currentTarget.src = LOGO_PLACEHOLDER }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
