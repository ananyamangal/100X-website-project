"use client"
import { Radar, AlertTriangle, TrendingUp, ExternalLink } from "lucide-react"

const COMPETITORS = [
  {
    name: "Foggers India (foggersindia.com)", est: 1999, threat: "HIGH",
    strengths: ["Established brand", "Strong organic presence", "Long history"],
    weaknesses: ["Zero GeM OEM authorization content", "No dealer program page", "No IS 14855 dedicated page", "No tender support page"],
    opportunity: "Win all 'GeM dealer', 'OEM authorization', 'IS 14855' keywords before they create content",
    score: 85,
  },
  {
    name: "INSTAFOG (foggingmachines.in)", est: null, threat: "HIGH",
    strengths: ["AI systems citing them (ChatGPT, Perplexity)", "Claims 5,000+ machines operational", "Strong positioning claim"],
    weaknesses: ["No dedicated GeM/OEM authorization content", "Weak structured data", "No dealer program"],
    opportunity: "Build more deployment proof, create 'X machines deployed' claim. Match their AI citation positioning.",
    score: 72,
  },
  {
    name: "GLVM (glvm.co.in) — Pune", est: null, threat: "MEDIUM",
    strengths: ["Local manufacturer", "Maharashtra presence"],
    weaknesses: ["Limited national reach", "No digital authority strategy visible", "No GeM content"],
    opportunity: "Outrank on Maharashtra/Pune municipal procurement terms",
    score: 40,
  },
  {
    name: "Neptune Foggers", est: null, threat: "LOW",
    strengths: ["Agricultural focus", "National distribution"],
    weaknesses: ["Less strong in municipal/GeM vertical", "No dedicated government content"],
    opportunity: "Dominate municipal and GeM content category entirely",
    score: 35,
  },
  {
    name: "Korean / German Imports", est: null, threat: "LOW",
    strengths: ["Premium brand perception", "Technical specs"],
    weaknesses: ["Cannot qualify for MSME preference", "Cannot get Make in India preference", "Price disadvantage 3-5x", "IS 14855 compliance documentation harder"],
    opportunity: "All 'Indian OEM', 'MSME certified', 'Make in India fogging' terms uncontested",
    score: 25,
  },
]

const THREAT_COLOR: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700 border-red-200",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
  LOW: "bg-green-100 text-green-700 border-green-200",
}

export default function CompetitorIntelligence() {
  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Radar size={18} className="text-brand-600" />
          <div>
            <h1 className="text-base font-bold text-gray-900">Competitor Intelligence</h1>
            <p className="text-gray-400 text-[11px]">Track competitor activity, identify threats, find gaps to exploit</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-6">
        {/* Monitoring architecture */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-xs text-amber-700">
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Live monitoring — not yet connected</p>
            <p>The Competitor Monitor Agent in Automation Center will auto-detect new pages, keywords, and content changes when activated. Below is the current manual intelligence from the last review (2026-06-04).</p>
          </div>
        </div>

        {/* Competitive landscape */}
        <div className="space-y-4">
          {COMPETITORS.map(comp => (
            <div key={comp.name} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-800">{comp.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${THREAT_COLOR[comp.threat]}`}>
                      Threat: {comp.threat}
                    </span>
                    {comp.est && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Est. {comp.est}</span>}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Strengths</p>
                      <ul className="space-y-0.5">
                        {comp.strengths.map(s => <li key={s} className="text-xs text-gray-600 flex gap-1"><span className="text-green-500">+</span>{s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Weaknesses</p>
                      <ul className="space-y-0.5">
                        {comp.weaknesses.map(w => <li key={w} className="text-xs text-gray-600 flex gap-1"><span className="text-red-400">−</span>{w}</li>)}
                      </ul>
                    </div>
                  </div>

                  <div className="bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-brand-500 uppercase tracking-wide mb-0.5">Opportunity</p>
                    <p className="text-xs text-brand-700">{comp.opportunity}</p>
                  </div>
                </div>

                <div className="text-center shrink-0">
                  <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center ${comp.score > 60 ? "border-red-300 bg-red-50" : comp.score > 40 ? "border-amber-300 bg-amber-50" : "border-green-300 bg-green-50"}`}>
                    <span className="text-sm font-bold text-gray-700">{comp.score}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Threat<br/>Score</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Monitor setup guide */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-brand-600" />
            Activate Live Monitoring
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 text-xs text-gray-600">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-semibold text-gray-700 mb-2">Competitor Monitor Agent</p>
              <p>Go to Automation Center → Competitor Monitor Agent → Resume</p>
              <p className="text-gray-400 mt-1">Runs daily, checks for new pages and content changes</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-semibold text-gray-700 mb-2">Manual monitoring (free)</p>
              <ul className="space-y-0.5 text-gray-500">
                <li>• Google Alerts for competitor names</li>
                <li>• Ahrefs/Semrush for keyword tracking</li>
                <li>• SimilarWeb for traffic estimates</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
