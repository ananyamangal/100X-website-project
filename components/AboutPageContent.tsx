"use client"

import Link from "next/link"
import {
  Award,
  CheckCircle,
  ChevronLeft,
  Eye,
  Factory,
  HandHeart,
  Heart,
  ShieldCheck,
  Target,
  Truck,
  Users,
  Wrench,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RichContent } from "@/components/RichContent"
import { optimizeCloudinary } from "@/lib/cloudinaryUrl"

export default function AboutPageContent({
  content,
}: {
  content: Record<string, string> | null
}) {
  const c = content || {}
  const heroBadge = c.heroBadge ?? "About Us"
  const heroTitle = c.heroTitle ?? "About 100X Circle Pvt Ltd"
  const journeyHeading = c.journeyHeading ?? "Our Journey"
  const journeyParagraph1 = c.journeyParagraph1 ?? ""
  const journeyList = c.journeyList ?? ""
  const journeyParagraph2 = c.journeyParagraph2 ?? ""
  const journeyStat1Value = c.journeyStat1Value ?? "2015"
  const journeyStat1Label = c.journeyStat1Label ?? "Founded"
  const journeyStat2Value = c.journeyStat2Value ?? "10K+"
  const journeyStat2Label = c.journeyStat2Label ?? "Happy customers"
  const journeyImage = c.journeyImage ?? "/new.png"
  const foundationHeading = c.foundationHeading ?? "Our Foundation"
  const foundationSubtext = c.foundationSubtext ?? "The principles that guide our work and define our commitment to excellence."
  const missionTitle = c.missionTitle ?? "Mission"
  const missionDescription = c.missionDescription ?? ""
  const visionTitle = c.visionTitle ?? "Vision"
  const visionDescription = c.visionDescription ?? ""
  const valuesTitle = c.valuesTitle ?? "Values"
  const valuesDescription = c.valuesDescription ?? ""
  const manufacturingHeading = c.manufacturingHeading ?? "Manufacturing Excellence"
  const manufacturingParagraph = c.manufacturingParagraph ?? ""
  const manufacturingImage = c.manufacturingImage ?? "/production.png"
  const journeyListItems = journeyList ? journeyList.split("\n").filter((line) => line.trim()) : []
  const values = [
    { icon: Target, title: missionTitle, description: missionDescription },
    { icon: Eye, title: visionTitle, description: visionDescription },
    { icon: Heart, title: valuesTitle, description: valuesDescription },
  ]
  const manufacturingStats = [
    { value: c.manufacturingStat1Value ?? "ISO", label: c.manufacturingStat1Label ?? "Certified", bg: "bg-blue-50", text: "text-blue-600" },
    { value: c.manufacturingStat2Value ?? "99.5%", label: c.manufacturingStat2Label ?? "Quality Rate", bg: "bg-brand-50", text: "text-brand-600" },
    { value: c.manufacturingStat3Value ?? "24/7", label: c.manufacturingStat3Label ?? "Production", bg: "bg-purple-50", text: "text-purple-600" },
    { value: c.manufacturingStat4Value ?? "50+", label: c.manufacturingStat4Label ?? "Products", bg: "bg-orange-50", text: "text-orange-600" },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Cinematic hero */}
      <section className="bg-gray-950 pt-24 pb-14 md:pt-28 md:pb-16">
        <div className="container mx-auto px-4 md:px-6">
          <nav className="flex items-center gap-2 text-xs text-cinema-500 mb-8">
            <a href="/" className="hover:text-cinema-300 transition-colors">Home</a>
            <span>/</span>
            <span className="text-cinema-300">About Us</span>
          </nav>
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-400 mb-4">{heroBadge}</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-800 text-white leading-tight mb-5 text-balance">
              {heroTitle}
            </h1>
            <div className="flex flex-wrap gap-x-8 gap-y-3 mt-8">
              {[
                { value: "15+", label: "Years Manufacturing" },
                { value: "10,000+", label: "Machines Deployed" },
                { value: "GeM", label: "OEM Registered" },
                { value: "ISO", label: "9001:2015 Certified" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-800 text-white">{s.value}</p>
                  <p className="text-cinema-500 text-xs font-500 uppercase tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <div className="bg-gray-50">
      <div className="container mx-auto px-4 py-12 md:py-16">

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h2 className="text-4xl font-bold text-gray-800 mb-6">{journeyHeading}</h2>
            {journeyParagraph1 && (
              <div className="text-lg text-gray-600 mb-6 leading-relaxed">
                <RichContent html={journeyParagraph1} />
              </div>
            )}
            {journeyListItems.length > 0 && (
              <>
                <p className="text-lg text-gray-600 mb-2 leading-relaxed">Our range includes:</p>
                <ul className="text-lg text-gray-600 mb-6 leading-relaxed list-disc list-inside">
                  {journeyListItems.map((item, i) => (
                    <li key={i}>{item.trim()}</li>
                  ))}
                </ul>
              </>
            )}
            {journeyParagraph2 && (
              <div className="text-lg text-gray-600 mb-8 leading-relaxed">
                <RichContent html={journeyParagraph2} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-6 bg-brand-50 rounded-xl">
                <div className="text-3xl font-bold text-brand-600 mb-2">{journeyStat1Value}</div>
                <div className="text-gray-600">{journeyStat1Label}</div>
              </div>
              <div className="text-center p-6 bg-brand-50 rounded-xl">
                <div className="text-3xl font-bold text-brand-600 mb-2">{journeyStat2Value}</div>
                <div className="text-gray-600">{journeyStat2Label}</div>
              </div>
            </div>
          </div>
          <div className="relative">
            <img src={optimizeCloudinary(journeyImage, 1200) || journeyImage} alt={heroTitle} className="w-full rounded-2xl shadow-2xl" loading="lazy" decoding="async" />
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-brand-600 rounded-2xl flex items-center justify-center">
              <Award className="text-white" size={32} />
            </div>
          </div>
        </div>

        <div className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">{foundationHeading}</h2>
            {foundationSubtext && <p className="text-xl text-gray-600 max-w-3xl mx-auto">{foundationSubtext}</p>}
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="text-center hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <value.icon className="text-brand-600" size={36} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">{value.title}</h3>
                  <div className="text-gray-600 leading-relaxed">
                    <RichContent html={value.description} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">{manufacturingHeading}</h2>
              {manufacturingParagraph && (
                <div className="text-lg text-gray-600 mb-6 leading-relaxed">
                  <RichContent html={manufacturingParagraph} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-6">
                {manufacturingStats.map((stat, i) => (
                  <div key={i} className={`text-center p-4 rounded-lg ${stat.bg}`}>
                    <div className={`text-2xl font-bold ${stat.text} mb-1`}>{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <img src={optimizeCloudinary(manufacturingImage, 1200) || manufacturingImage} alt="Manufacturing facility" className="w-full rounded-xl shadow-lg" loading="lazy" decoding="async" />
            </div>
          </div>
        </div>

        {/* ─── Agency-supplied expansion (Tab 3) ──────────────────────────
            Mission / Vision / Commitment as a 3-column block, followed by
            What-Sets-Us-Apart bullets and a Public-Health-Solutions
            narrative. Existing CMS-driven Foundation cards above stay
            untouched so populated admin content keeps rendering. */}
        <section
          aria-labelledby="about-purpose-heading"
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12 mb-12"
        >
          <div className="text-center mb-10">
            <h2
              id="about-purpose-heading"
              className="text-3xl md:text-4xl font-bold text-gray-800 mb-3"
            >
              Mission, Vision &amp; Commitment
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Why we build what we build, and the standards every machine has to meet.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                <Target size={22} aria-hidden="true" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Our Mission</h3>
              <p className="text-gray-700 leading-relaxed mb-3">
                Deliver high-performance fogging and agricultural equipment that improves productivity, reduces operational effort, and supports critical public-health and agricultural activities across India.
              </p>
              <ul className="space-y-2 text-gray-700 leading-relaxed list-none">
                {[
                  "Reliable fogging machines for public health and pest-control programmes",
                  "Efficient agricultural spraying and fogging solutions for farmers",
                  "Effective equipment for municipal disease-control operations",
                  "Reduced downtime and lower maintenance cost over the lifetime",
                  "Long-term performance through strong engineering + quality control",
                ].map((item) => (
                  <li key={item} className="flex items-start text-sm">
                    <CheckCircle size={16} aria-hidden="true" className="mt-1 mr-2 shrink-0 text-brand-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Eye size={22} aria-hidden="true" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Our Vision</h3>
              <p className="text-gray-700 leading-relaxed mb-3">
                Become India's most trusted, performance-driven manufacturer of fogging machines and field equipment — with products that are:
              </p>
              <ul className="space-y-2 text-gray-700 leading-relaxed list-none">
                {[
                  "Durable under extreme field conditions",
                  "Easy to operate for everyday users",
                  "Cost-efficient over long-term usage",
                  "Supported by strong after-sales service networks",
                ].map((item) => (
                  <li key={item} className="flex items-start text-sm">
                    <CheckCircle size={16} aria-hidden="true" className="mt-1 mr-2 shrink-0 text-blue-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <HandHeart size={22} aria-hidden="true" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Our Commitment</h3>
              <p className="text-gray-700 leading-relaxed">
                We build machines that work consistently, efficiently, and reliably. Whether it's a municipal fogging operation, an agricultural spraying requirement, or industrial pest control, our goal is that our customers can depend on their equipment without interruption.
              </p>
              <p className="mt-3 text-gray-700 leading-relaxed">
                We don't just manufacture machines — we build long-term solutions that support India's health, agriculture, and infrastructure needs.
              </p>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="about-sets-apart-heading"
          className="mb-12"
        >
          <div className="text-center mb-10">
            <h2
              id="about-sets-apart-heading"
              className="text-3xl md:text-4xl font-bold text-gray-800 mb-3"
            >
              What Sets 100X Circle Apart
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Field-driven engineering, not catalogue-driven assembly.
            </p>
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 list-none">
            {[
              { icon: Factory, text: "Engineered specifically for Indian field conditions, not adapted from imported designs." },
              { icon: ShieldCheck, text: "In-house manufacturing with strict multi-stage quality testing before dispatch." },
              { icon: Wrench, text: "Strong focus on fuel efficiency and operational cost reduction over the machine's lifetime." },
              { icon: Award, text: "Heavy-duty construction for long service life under demanding field conditions." },
              { icon: Users, text: "Easy-maintenance design so field operators can service equipment without specialised tools." },
              { icon: Truck, text: "Pan-India distribution and service support across 50+ locations." },
            ].map(({ icon: Icon, text }) => (
              <li key={text}>
                <div className="h-full rounded-2xl border border-gray-200 bg-white p-6">
                  <Icon size={22} aria-hidden="true" className="text-brand-700 mb-3" />
                  <p className="text-gray-700 leading-relaxed">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="about-public-health-heading"
          className="bg-brand-50 rounded-2xl border border-brand-100 p-8 md:p-12 mb-12"
        >
          <h2
            id="about-public-health-heading"
            className="text-3xl md:text-4xl font-bold text-gray-800 mb-3"
          >
            Public Health Fogging Solutions — A Core Responsibility
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-6 max-w-3xl">
            Vector-borne diseases such as dengue, malaria, and encephalitis remain a major concern in India. Effective fogging operations play a critical role in controlling these outbreaks — and that mission is at the heart of everything we manufacture.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed mb-6 max-w-3xl">
            Our public health fogging solutions are designed for:
          </p>
          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3 list-none mb-2">
            {[
              "Large-scale municipal operations",
              "Emergency disease control campaigns",
              "Rural and urban fogging drives",
              "Continuous high-output usage during peak seasons",
            ].map((item) => (
              <li key={item} className="flex items-start text-gray-700">
                <CheckCircle size={18} aria-hidden="true" className="mt-1 mr-2.5 shrink-0 text-brand-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-gray-700 leading-relaxed max-w-3xl">
            Our vehicle-mounted and high-capacity fogging machines allow operators to cover large areas quickly and efficiently, reducing response time during critical health situations.
          </p>
        </section>

        <div className="text-center pb-4">
          <Link href="/" className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-500 text-sm transition-colors">
            <ChevronLeft size={16} />
            Back to Home
          </Link>
        </div>
      </div>
      </div>
    </div>
  )
}
