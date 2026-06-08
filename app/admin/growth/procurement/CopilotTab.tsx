"use client"
import { useState } from "react"
import {
  Sparkles, ChevronRight, RefreshCw, BookOpen,
  TrendingUp, Users, Package, MapPin, AlertCircle, X,
} from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface Question {
  id: string
  label: string
  question: string
  icon: React.ElementType
  category: "dealer" | "dept" | "product" | "market" | "state"
  description: string
}

const QUESTIONS: Question[] = [
  // Dealer Discovery
  {
    id: "top-dealers-uncontacted",
    label: "Top dealers not in our network",
    question: "List the top 15 dealers by number of government contract wins who are NOT currently 100X authorized dealers. Include their win count, states, and top departments. Format as a prioritized outreach list.",
    icon: Users,
    category: "dealer",
    description: "Find high-value dealers we haven't acquired yet",
  },
  {
    id: "dealers-by-state",
    label: "Best dealer targets by state",
    question: "For each major state (Maharashtra, UP, Rajasthan, Gujarat, MP, Karnataka, Tamil Nadu, West Bengal), who are the top 2 dealers by L1 wins that are NOT 100X authorized? Show state, dealer name, win count.",
    icon: MapPin,
    category: "state",
    description: "Geographic dealer gap analysis by state",
  },
  {
    id: "dealer-volume-analysis",
    label: "Which dealers are winning the most?",
    question: "Show me the top 20 dealers ranked by total contract value (GMV) from gem_contracts. Include their total_contracts count, contract_value sum, and states covered. Which 5 should we prioritize for OEM authorization?",
    icon: TrendingUp,
    category: "dealer",
    description: "Volume-weighted dealer ranking",
  },
  {
    id: "dealer-repeat-buyers",
    label: "Dealers serving repeat government buyers",
    question: "Which dealers appear in contracts from the same department more than 3 times? These are dealers with strong government relationships that we should acquire. List dealer name, department, contract count.",
    icon: Users,
    category: "dealer",
    description: "Relationship-depth dealer identification",
  },

  // Department & Buyer Intelligence
  {
    id: "active-dept-buyers",
    label: "Departments buying fogging machines now",
    question: "List all departments in gem_contracts that have purchased thermal fogging or ULV fogging equipment in the last 12 months. Include department name, contract count, total value, and which state/ministry. Sort by value descending.",
    icon: BookOpen,
    category: "dept",
    description: "Active fogging procurement departments",
  },
  {
    id: "municipal-fogging-demand",
    label: "Municipal corporations buying fogging",
    question: "Show all contracts where the buyer is a municipal corporation, nagar palika, nagar panchayat, or urban local body. Group by state and show total spend. Which states have the highest municipal demand?",
    icon: MapPin,
    category: "dept",
    description: "Municipal / ULB demand mapping",
  },
  {
    id: "ministry-spend-analysis",
    label: "Which ministries are spending on fogging?",
    question: "Group gem_contracts by ministry field. For each ministry, show total contract count, total GMV, and the departments under it. Which ministries have budget for thermal fogging equipment?",
    icon: BookOpen,
    category: "dept",
    description: "Ministry-level budget analysis",
  },
  {
    id: "defence-opportunities",
    label: "Defence & paramilitary opportunities",
    question: "List all contracts from defence departments, army, CRPF, BSF, state police, and paramilitary forces. Show department, state, contract value, and winning dealer. Where are our biggest gaps?",
    icon: AlertCircle,
    category: "dept",
    description: "Defence segment opportunity map",
  },

  // Product Intelligence
  {
    id: "competing-products",
    label: "What products are they actually buying?",
    question: "From gem_contracts product_name field, what are the most common product names / descriptions for fogging machines? List all distinct product names with their frequency. What specifications are most specified?",
    icon: Package,
    category: "product",
    description: "Real-world product specification demand",
  },
  {
    id: "price-intelligence",
    label: "What are government buyers paying per unit?",
    question: "From gem_contracts with contract_value_num > 0 and product_name containing 'fog', calculate average contract value. What is the typical price range for government fogging machine procurement? Show min, max, median, P75 values.",
    icon: TrendingUp,
    category: "product",
    description: "Competitive pricing intelligence",
  },
  {
    id: "high-value-contracts",
    label: "Largest contracts in the last 6 months",
    question: "List the 20 largest contracts by contract_value_num from the last 6 months. Show department, state, product description, dealer name, and value. Which are above ₹10 lakh?",
    icon: TrendingUp,
    category: "market",
    description: "Large order opportunity tracking",
  },

  // Market Intelligence
  {
    id: "seasonal-demand",
    label: "When do government buyers procure?",
    question: "Analyze the contract_date or first_seen field in gem_contracts. Show monthly distribution of procurement — which months see the most contracts? Is there a seasonal pattern in government fogging procurement?",
    icon: TrendingUp,
    category: "market",
    description: "Procurement seasonality analysis",
  },
  {
    id: "upcoming-repeat-buyers",
    label: "Which buyers are likely to re-order soon?",
    question: "Find departments that bought fogging machines 12-18 months ago (check first_seen date). These are likely due for re-procurement. List the department, last contract date, value, and state. Prioritize by value.",
    icon: RefreshCw,
    category: "market",
    description: "Re-order prediction from historical cycles",
  },
  {
    id: "states-low-penetration",
    label: "States with high demand but no 100X presence",
    question: "Identify states where gem_contracts show many fogging machine purchases but where the winning dealers are not 100X authorized dealers. These are white-space markets. Show state, total contracts, total value, top dealers.",
    icon: MapPin,
    category: "state",
    description: "White-space market identification",
  },
]

const CATEGORY_COLORS: Record<string, string> = {
  dealer:  "bg-blue-100 text-blue-700",
  dept:    "bg-purple-100 text-purple-700",
  product: "bg-green-100 text-green-700",
  market:  "bg-amber-100 text-amber-700",
  state:   "bg-rose-100 text-rose-700",
}

const CATEGORY_LABELS: Record<string, string> = {
  dealer: "Dealer", dept: "Dept", product: "Product", market: "Market", state: "State",
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n")
  return (
    <div className="space-y-1.5 text-xs text-gray-700 leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />
        if (line.startsWith("### ")) return <h4 key={i} className="text-sm font-bold text-gray-900 mt-3">{line.slice(4)}</h4>
        if (line.startsWith("## "))  return <h3 key={i} className="text-sm font-bold text-gray-900 mt-3">{line.slice(3)}</h3>
        if (line.startsWith("# "))   return <h2 key={i} className="text-base font-bold text-gray-900 mt-3">{line.slice(2)}</h2>
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-bold text-gray-800">{line.slice(2, -2)}</p>
        if (line.match(/^[-•*]\s/)) return <div key={i} className="flex gap-2"><span className="text-gray-400 flex-shrink-0">•</span><span>{line.replace(/^[-•*]\s/, "")}</span></div>
        if (line.match(/^\d+\.\s/)) return <div key={i} className="flex gap-2"><span className="text-brand-600 font-bold flex-shrink-0 w-5">{line.match(/^(\d+)/)?.[1]}.</span><span>{line.replace(/^\d+\.\s/, "")}</span></div>
        return <p key={i}>{line}</p>
      })}
    </div>
  )
}

export function CopilotTab({ onDealerClick }: { onDealerClick: (name: string) => void }) {
  const [messages, setMessages]   = useState<Message[]>([])
  const [loading, setLoading]     = useState(false)
  const [category, setCategory]   = useState<string>("all")
  const [customQuery, setCustomQuery] = useState("")
  const [mode, setMode]           = useState<"questions" | "custom">("questions")
  const [error, setError]         = useState<string | null>(null)

  const ask = async (question: string) => {
    if (!question.trim() || loading) return
    setError(null)
    setLoading(true)

    const userMsg: Message = { role: "user", content: question }
    setMessages(prev => [...prev, userMsg])

    try {
      const res = await fetch("/api/admin/procurement/ai-analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "API error")
      setMessages(prev => [...prev, { role: "assistant", content: data.response || data.message || JSON.stringify(data) }])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get response")
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  const askQuestion = (q: Question) => ask(q.question)

  const askCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customQuery.trim()) return
    const q = customQuery
    setCustomQuery("")
    ask(q)
  }

  const filtered = category === "all" ? QUESTIONS : QUESTIONS.filter(q => q.category === category)

  return (
    <div className="space-y-4">
      {/* Header + mode toggle */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} className="text-brand-600" />
              <h2 className="text-sm font-bold text-gray-900">Procurement Copilot</h2>
            </div>
            <p className="text-xs text-gray-500">
              Pre-built intelligence queries for 100X sales team. Click any question to run it instantly against your procurement database.
            </p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 flex-shrink-0">
            <button onClick={() => setMode("questions")}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${mode === "questions" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              Questions
            </button>
            <button onClick={() => setMode("custom")}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${mode === "custom" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              Custom
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        {/* Left: Question library or custom input */}
        <div className="lg:col-span-2 space-y-3">
          {mode === "questions" && (
            <>
              {/* Category filter */}
              <div className="flex flex-wrap gap-1.5">
                {["all", "dealer", "dept", "product", "market", "state"].map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)}
                    className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors capitalize ${
                      category === cat
                        ? "bg-brand-600 text-white"
                        : cat === "all"
                        ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        : `${CATEGORY_COLORS[cat]} opacity-80 hover:opacity-100`
                    }`}>
                    {cat === "all" ? "All Topics" : CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>

              {/* Question cards */}
              <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-0.5">
                {filtered.map(q => (
                  <button
                    key={q.id}
                    onClick={() => askQuestion(q)}
                    disabled={loading}
                    className="w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-brand-300 hover:shadow-sm transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start gap-2.5">
                      <q.icon size={13} className="text-brand-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-semibold text-gray-800 leading-snug">{q.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${CATEGORY_COLORS[q.category]}`}>
                            {CATEGORY_LABELS[q.category]}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-snug">{q.description}</p>
                      </div>
                      <ChevronRight size={12} className="text-gray-300 group-hover:text-brand-500 flex-shrink-0 mt-1 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {mode === "custom" && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Custom Query</h3>
              <p className="text-[11px] text-gray-400 mb-3">
                Ask anything about your procurement data. The AI has access to gem_contracts, gem_dealers, and knowledge graph.
              </p>
              <form onSubmit={askCustom} className="space-y-2">
                <textarea
                  value={customQuery}
                  onChange={e => setCustomQuery(e.target.value)}
                  placeholder="e.g. Which districts in Uttar Pradesh had the most fogging contracts in 2025?"
                  rows={5}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
                <button
                  type="submit"
                  disabled={loading || !customQuery.trim()}
                  className="w-full text-xs bg-brand-600 text-white py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? "Thinking…" : "Ask Copilot"}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right: Conversation area */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm min-h-[400px] flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">
                {messages.length === 0 ? "Results will appear here" : `${Math.ceil(messages.length / 2)} ${messages.length === 2 ? "query" : "queries"}`}
              </span>
              {messages.length > 0 && (
                <button onClick={() => { setMessages([]); setError(null) }}
                  className="text-[11px] text-gray-400 hover:text-gray-700 flex items-center gap-1">
                  <X size={11} />Clear
                </button>
              )}
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[560px]">
              {messages.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Sparkles size={28} className="text-gray-200 mb-3" />
                  <p className="text-sm font-medium text-gray-400">Select a question from the left</p>
                  <p className="text-xs text-gray-300 mt-1">Results will stream here in real-time</p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={msg.role === "user" ? "flex justify-end" : ""}>
                  {msg.role === "user" ? (
                    <div className="max-w-[85%] bg-brand-600 text-white rounded-xl rounded-tr-sm px-4 py-2.5">
                      <p className="text-xs leading-relaxed line-clamp-3">{msg.content.slice(0, 120)}{msg.content.length > 120 ? "…" : ""}</p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-100 rounded-xl rounded-tl-sm px-4 py-3">
                      <MarkdownText text={msg.content} />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">Querying procurement database…</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
                  <AlertCircle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
