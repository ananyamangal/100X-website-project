"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Button }    from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input }     from "@/components/ui/input"
import { Lock, Mail, Shield, Eye, EyeOff } from "lucide-react"

export default function AdminLogin() {
  const [email,     setEmail]     = useState("")
  const [password,  setPassword]  = useState("")
  const [showPw,    setShowPw]    = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const body: Record<string, string> = { password }
      if (email.trim()) body.email = email.trim().toLowerCase()

      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Invalid credentials")
        return
      }

      // Route to Growth OS for all authenticated users
      router.push("/admin/growth/dashboard")
    } catch {
      setError("Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-green-900/40">
            <Shield className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Growth OS</h1>
          <p className="text-gray-400 text-sm mt-1">100X Circle — Secure Access</p>
        </div>

        <Card className="bg-gray-900 border-gray-800 shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg font-semibold text-center">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email — optional for legacy password-only login */}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-9 bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-green-500/20"
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-9 pr-10 bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-green-500/20"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {error && (
                <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 transition-colors"
                disabled={isLoading || !password}
              >
                {isLoading ? "Signing in…" : "Sign In"}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-gray-600">
              Authorized personnel only · Contact admin for access
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
