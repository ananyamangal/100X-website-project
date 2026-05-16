"use client"

import Link from "next/link"
import { Award, ChevronLeft, Eye, Heart, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RichContent } from "@/components/RichContent"

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
    { value: c.manufacturingStat2Value ?? "99.5%", label: c.manufacturingStat2Label ?? "Quality Rate", bg: "bg-green-50", text: "text-green-600" },
    { value: c.manufacturingStat3Value ?? "24/7", label: c.manufacturingStat3Label ?? "Production", bg: "bg-purple-50", text: "text-purple-600" },
    { value: c.manufacturingStat4Value ?? "50+", label: c.manufacturingStat4Label ?? "Products", bg: "bg-orange-50", text: "text-orange-600" },
  ]

  return (
    <div className="pt-32 min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-20">
          <Badge className="mb-6 bg-green-100 text-green-800 hover:bg-green-200 text-lg px-6 py-2">{heroBadge}</Badge>
          <h1 className="text-5xl font-bold text-gray-800 mb-6">{heroTitle}</h1>
        </div>

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
              <div className="text-center p-6 bg-green-50 rounded-xl">
                <div className="text-3xl font-bold text-green-600 mb-2">{journeyStat1Value}</div>
                <div className="text-gray-600">{journeyStat1Label}</div>
              </div>
              <div className="text-center p-6 bg-green-50 rounded-xl">
                <div className="text-3xl font-bold text-green-600 mb-2">{journeyStat2Value}</div>
                <div className="text-gray-600">{journeyStat2Label}</div>
              </div>
            </div>
          </div>
          <div className="relative">
            <img src={journeyImage} alt={heroTitle} className="w-full rounded-2xl shadow-2xl" />
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-green-600 rounded-2xl flex items-center justify-center">
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
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <value.icon className="text-green-600" size={36} />
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
              <img src={manufacturingImage} alt="Manufacturing facility" className="w-full rounded-xl shadow-lg" />
            </div>
          </div>
        </div>

        <div className="text-center">
          <Button size="lg" variant="outline" asChild className="border-gray-600 text-gray-600 hover:bg-gray-50 bg-transparent">
            <Link href="/">
              <ChevronLeft className="mr-2" size={20} />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
