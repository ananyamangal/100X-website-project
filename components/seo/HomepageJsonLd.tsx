import React from "react"

interface Props {
  heroVideoId?: string;
}

export default function HomepageJsonLd({ heroVideoId }: Props) {
  const items: Record<string, any>[] = []

  if (heroVideoId && heroVideoId !== "REPLACE_WITH_HERO_VIDEO_ID") {
    items.push({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: "100X Fogging Machines in Real-World Operation",
      description:
        "Pulse-jet thermal fogging machine demos from 100X Circle — municipal vector control and agricultural use.",
      thumbnailUrl: `https://i.ytimg.com/vi/${heroVideoId}/hqdefault.jpg`,
      uploadDate: "2024-01-01",
      contentUrl: `https://www.youtube.com/watch?v=${heroVideoId}`,
      embedUrl: `https://www.youtube.com/embed/${heroVideoId}`,
    })
  }

  items.push({
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How Pulse-Jet Thermal Fogging Works",
    description:
      "Four engineered stages turn a fuel-air spark into a dense, deep-penetrating fog for vector control and agricultural use.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Pulse-Jet Combustion",
        text: "A pulse-jet engine ignites a controlled fuel-air mix at high frequency.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Chemical Vaporization",
        text: "Heat from the combustion chamber vaporizes the chemical or water-based solution.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Ultra-Fine Fog Ejection",
        text: "Vapor cools at the nozzle to form sub-50-micron droplets.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Deep Penetration",
        text: "Dense fog penetrates foliage, drains, and voids that conventional sprayers cannot reach.",
      },
    ],
  })

  items.push({
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Pulse-Jet Thermal Fogging Equipment Supply",
    provider: {
      "@type": "Organization",
      name: "100x Circle Pvt Ltd",
    },
    areaServed: {
      "@type": "Country",
      name: "India",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Fogging Equipment Programs",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Municipal & Government Procurement (GeM)",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Dealer & Distributor Partnership",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Export & International Buyers",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Industrial & Estate Buyers",
          },
        },
      ],
    },
  })

  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  )
}
