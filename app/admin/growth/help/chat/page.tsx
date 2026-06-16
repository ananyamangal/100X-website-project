"use client"
import { useState, useRef, useEffect, FormEvent } from "react"
import { MessageSquare, Send, Bot, User, AlertCircle, RefreshCw, BookOpen, Zap } from "lucide-react"
import Link from "next/link"

interface Message {
  role: "user" | "assistant"
  content: string
}

const SUGGESTIONS = [
  "What should I do every morning?",
  "How do I track a dealer through the pipeline?",
  "How are Execution Packs generated?",
  "What is Fogging Intelligence?",
  "Which automations run on Monday?",
  "How do I move an opportunity to Won?",
]

export default function AskGrowthOSPage() {
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState("")
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const bottomRef                 = useRef<HTMLDivElement>(null)
  const inputRef                  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function send(text: string) {
    if (!text.trim() || loading) return
    setError(null)

    const userMsg: Message = { role: "user", content: text.trim() }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/admin/growth/help/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Unknown error")
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }])
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    send(input)
  }

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full p-4 md:p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
            <MessageSquare size={18} className="text-purple-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Ask Growth OS</h1>
            <p className="text-sm text-gray-500">Natural language questions about the platform</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/growth/help" className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 border border-gray-200 rounded px-2 py-1">
            <BookOpen size={11} />
            Knowledge Center
          </Link>
          <Link href="/admin/growth/help/today" className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 border border-blue-200 rounded px-2 py-1">
            <Zap size={11} />
            Today
          </Link>
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden min-h-[500px]">

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mb-4">
                <Bot size={28} className="text-purple-600" />
              </div>
              <h2 className="text-base font-bold text-gray-900 mb-1">Growth OS Assistant</h2>
              <p className="text-sm text-gray-500 text-center max-w-xs">
                Ask me anything about the platform — workflows, modules, what to do next, or how any feature works.
              </p>

              {/* Suggestions */}
              <div className="mt-6 w-full max-w-sm grid grid-cols-1 gap-2">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider text-center mb-1">Try asking</p>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-xs px-3 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-800 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg, i) => (
            <div key={i} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-purple-100 text-purple-600"
              }`}>
                {msg.role === "user" ? <User size={13} /> : <Bot size={13} />}
              </div>

              {/* Bubble */}
              <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-sm"
                  : "bg-gray-100 text-gray-800 rounded-tl-sm"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Bot size={13} className="text-purple-600" />
              </div>
              <div className="bg-gray-100 rounded-xl rounded-tl-sm px-3.5 py-3 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="flex-shrink-0" />
              <div>
                <p className="font-medium">Error</p>
                <p className="text-xs mt-0.5">{error}</p>
                {error.includes("ANTHROPIC_API_KEY") && (
                  <p className="text-xs mt-1 text-red-600">Set ANTHROPIC_API_KEY in Vercel environment variables to enable AI chat.</p>
                )}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 p-3">
          <form onSubmit={onSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask a question about the platform…"
              disabled={loading}
              className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 disabled:opacity-60 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 transition-colors flex-shrink-0"
            >
              {loading
                ? <RefreshCw size={14} className="animate-spin" />
                : <Send size={14} />
              }
            </button>
          </form>

          {/* Reset */}
          {messages.length > 0 && !loading && (
            <button
              onClick={() => { setMessages([]); setError(null) }}
              className="mt-2 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear conversation
            </button>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-gray-400 text-center mt-3">
        Answers are generated from the platform documentation registry. Always verify before acting.
      </p>
    </div>
  )
}
