"use client"

import { useState, useMemo } from "react"

export interface StateDeployment {
  count: number
  categories?: string[]
  departments?: string[]
}

interface StateInfo {
  code: string
  name: string
  x: number
  y: number
}

const INDIA_STATES: StateInfo[] = [
  { code: "JK",  name: "J & K",               x: 162, y: 38  },
  { code: "HP",  name: "Himachal Pradesh",     x: 196, y: 75  },
  { code: "PB",  name: "Punjab",               x: 138, y: 88  },
  { code: "UK",  name: "Uttarakhand",          x: 218, y: 100 },
  { code: "HR",  name: "Haryana",              x: 158, y: 112 },
  { code: "DL",  name: "Delhi",                x: 175, y: 125 },
  { code: "UP",  name: "Uttar Pradesh",        x: 232, y: 142 },
  { code: "BR",  name: "Bihar",                x: 288, y: 162 },
  { code: "SK",  name: "Sikkim",               x: 322, y: 118 },
  { code: "AR",  name: "Arunachal Pradesh",    x: 388, y: 90  },
  { code: "AS",  name: "Assam",                x: 362, y: 135 },
  { code: "NL",  name: "Nagaland",             x: 393, y: 152 },
  { code: "MG",  name: "Meghalaya",            x: 348, y: 158 },
  { code: "MN",  name: "Manipur",              x: 393, y: 175 },
  { code: "TR",  name: "Tripura",              x: 362, y: 180 },
  { code: "MZ",  name: "Mizoram",              x: 377, y: 202 },
  { code: "WB",  name: "West Bengal",          x: 312, y: 185 },
  { code: "JH",  name: "Jharkhand",            x: 285, y: 205 },
  { code: "OD",  name: "Odisha",               x: 278, y: 248 },
  { code: "RJ",  name: "Rajasthan",            x: 116, y: 162 },
  { code: "GJ",  name: "Gujarat",              x: 74,  y: 230 },
  { code: "MP",  name: "Madhya Pradesh",       x: 195, y: 215 },
  { code: "CG",  name: "Chhattisgarh",         x: 240, y: 255 },
  { code: "MH",  name: "Maharashtra",          x: 145, y: 278 },
  { code: "GA",  name: "Goa",                  x: 112, y: 338 },
  { code: "TG",  name: "Telangana",            x: 210, y: 312 },
  { code: "AP",  name: "Andhra Pradesh",       x: 222, y: 360 },
  { code: "KA",  name: "Karnataka",            x: 158, y: 370 },
  { code: "TN",  name: "Tamil Nadu",           x: 210, y: 418 },
  { code: "KL",  name: "Kerala",               x: 152, y: 432 },
  { code: "PY",  name: "Puducherry",           x: 228, y: 402 },
  { code: "AN",  name: "Andaman & Nicobar",    x: 400, y: 380 },
  { code: "LD",  name: "Lakshadweep",          x: 68,  y: 402 },
]

interface Props {
  deployments: Record<string, StateDeployment>
  onStateClick?: (stateName: string) => void
  className?: string
}

export default function IndiaDeploymentMap({ deployments, onStateClick, className = "" }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)

  const maxCount = useMemo(
    () => Math.max(...Object.values(deployments).map((d) => d.count), 1),
    [deployments]
  )

  const getR = (count: number, base = 7) =>
    count === 0 ? base : base + Math.sqrt(count / maxCount) * 12

  const deployed = Object.keys(deployments)
  const totalStates = deployed.length
  const totalOrders = Object.values(deployments).reduce((s, d) => s + d.count, 0)

  const hoveredState = hovered ? INDIA_STATES.find((s) => s.code === hovered) : null
  const hoveredData = hovered ? deployments[hovered] : null

  return (
    <div className={`bg-slate-950 rounded-3xl border border-white/[0.06] overflow-hidden shadow-2xl ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 border-b border-white/[0.06]">
        <div>
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-0.5">Geographic Coverage</p>
          <h3 className="text-white text-lg font-bold">India Deployment Map</h3>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-white font-black text-2xl">{totalStates}</p>
            <p className="text-slate-500 text-xs uppercase tracking-wide">States</p>
          </div>
          <div className="text-center">
            <p className="text-white font-black text-2xl">{totalOrders}</p>
            <p className="text-slate-500 text-xs uppercase tracking-wide">Deployments</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* SVG Map */}
        <div className="flex-1 p-4 md:p-6 relative">
          <svg
            viewBox="0 0 430 470"
            className="w-full max-w-sm md:max-w-full mx-auto"
            aria-label="India deployment map"
          >
            <defs>
              <radialGradient id="glow-g" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="glow-b" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
              </radialGradient>
              <filter id="shadow">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10B981" floodOpacity="0.5" />
              </filter>
            </defs>

            {/* Background grid */}
            <rect width="430" height="470" fill="#020617" />
            {Array.from({ length: 22 }).map((_, i) => (
              <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="470" stroke="#1E293B" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 24 }).map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 20} x2="430" y2={i * 20} stroke="#1E293B" strokeWidth="0.5" />
            ))}

            {/* Connection lines between deployed nearby states */}
            {INDIA_STATES.filter((s) => deployments[s.code]).map((s) =>
              INDIA_STATES.filter((t) => {
                if (t.code === s.code || !deployments[t.code]) return false
                const dist = Math.sqrt((t.x - s.x) ** 2 + (t.y - s.y) ** 2)
                return dist < 80
              }).map((t) => (
                <line
                  key={`${s.code}-${t.code}`}
                  x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke="#10B981" strokeWidth="0.5" strokeOpacity="0.2"
                  strokeDasharray="3 4"
                />
              ))
            )}

            {/* State circles */}
            {INDIA_STATES.map((state) => {
              const dep = deployments[state.code]
              const isDeployed = !!dep
              const r = isDeployed ? getR(dep.count) : 5
              const isHovered = hovered === state.code
              const isOther = hovered && !isHovered && isDeployed

              return (
                <g
                  key={state.code}
                  onClick={() => isDeployed && onStateClick?.(state.name)}
                  onMouseEnter={() => setHovered(state.code)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: isDeployed ? "pointer" : "default" }}
                >
                  {/* Glow ring for deployed */}
                  {isDeployed && (
                    <circle
                      cx={state.x} cy={state.y}
                      r={r + 6}
                      fill="none"
                      stroke="#10B981"
                      strokeWidth={isHovered ? 2 : 1}
                      strokeOpacity={isHovered ? 0.6 : 0.2}
                      className="transition-all duration-300"
                    />
                  )}

                  {/* Main circle */}
                  <circle
                    cx={state.x} cy={state.y}
                    r={isHovered ? r + 2 : r}
                    fill={isDeployed ? (isHovered ? "#10B981" : "#059669") : "#1E293B"}
                    stroke={isDeployed ? "#34D399" : "#374151"}
                    strokeWidth={isDeployed ? 1.5 : 0.5}
                    opacity={isOther ? 0.6 : 1}
                    filter={isHovered ? "url(#shadow)" : undefined}
                    className="transition-all duration-200"
                  />

                  {/* Count label inside circle */}
                  {isDeployed && dep.count > 0 && (
                    <text
                      x={state.x} y={state.y + 0.5}
                      textAnchor="middle" dominantBaseline="middle"
                      fill="white" fontSize={r > 12 ? "8" : "6"}
                      fontWeight="800" className="select-none"
                    >
                      {dep.count > 99 ? "99+" : dep.count}
                    </text>
                  )}

                  {/* State code label below */}
                  <text
                    x={state.x} y={state.y + r + 9}
                    textAnchor="middle"
                    fill={isDeployed ? "#94A3B8" : "#334155"}
                    fontSize="6.5"
                    fontWeight={isDeployed ? "700" : "400"}
                    className="select-none"
                  >
                    {state.code}
                  </text>
                </g>
              )
            })}

            {/* India boundary hint (simplified dotted box) */}
            <rect x="60" y="30" width="360" height="430" fill="none" stroke="#1E293B" strokeWidth="1" strokeDasharray="4 8" rx="8" />
          </svg>
        </div>

        {/* Side Panel */}
        <div className="md:w-64 border-t md:border-t-0 md:border-l border-white/[0.06] flex flex-col">
          {/* Hovered state detail */}
          {hoveredState && hoveredData ? (
            <div className="p-5 border-b border-white/[0.06]">
              <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-1">Selected State</p>
              <p className="text-white font-bold text-base">{hoveredState.name}</p>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Deployments</span>
                  <span className="text-white font-bold">{hoveredData.count}</span>
                </div>
                {hoveredData.departments && hoveredData.departments.length > 0 && (
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Departments</p>
                    <div className="flex flex-wrap gap-1">
                      {hoveredData.departments.slice(0, 3).map((d) => (
                        <span key={d} className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400 text-[10px]">
                          {d}
                        </span>
                      ))}
                      {hoveredData.departments.length > 3 && (
                        <span className="text-slate-500 text-[10px]">+{hoveredData.departments.length - 3} more</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5 border-b border-white/[0.06]">
              <p className="text-slate-500 text-sm">Hover a state to see deployment details</p>
            </div>
          )}

          {/* Deployed states list */}
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3">Active States</p>
            <div className="space-y-1.5">
              {INDIA_STATES.filter((s) => deployments[s.code])
                .sort((a, b) => (deployments[b.code]?.count ?? 0) - (deployments[a.code]?.count ?? 0))
                .map((s) => (
                  <button
                    key={s.code}
                    onClick={() => onStateClick?.(s.name)}
                    onMouseEnter={() => setHovered(s.code)}
                    onMouseLeave={() => setHovered(null)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-slate-300 text-sm">{s.name}</span>
                    </div>
                    <span className="text-white font-bold text-sm">{deployments[s.code]?.count}</span>
                  </button>
                ))}
              {totalStates === 0 && (
                <p className="text-slate-600 text-xs text-center py-4">
                  Import procurement records to populate the map
                </p>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="p-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-3 mb-2">
              <circle className="shrink-0" />
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="inline-block w-3 h-3 rounded-full bg-emerald-600 border border-emerald-400" />
                Deployed
                <span className="inline-block w-3 h-3 rounded-full bg-slate-800 border border-slate-600 ml-2" />
                Not yet
              </div>
            </div>
            <p className="text-[10px] text-slate-600">Circle size = deployment count</p>
          </div>
        </div>
      </div>
    </div>
  )
}
