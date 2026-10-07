"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button }    from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input }     from "@/components/ui/input"
import { Lock, Mail, Shield, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react"
import { Suspense } from "react"
import { getDefaultLandingPage } from "@/lib/rbac/landing"

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured:       "Google login is not configured on this server.",
  google_denied:               "Google sign-in was cancelled.",
  google_invalid_callback:     "Invalid OAuth callback. Please try again.",
  google_state_invalid:        "Security check failed (CSRF). Please try again.",
  google_state_expired:        "Sign-in session expired. Please try again.",
  google_token_exchange_failed:"Google authentication failed. Please try again.",
  google_userinfo_failed:      "Could not retrieve your Google profile. Please try again.",
  google_email_not_verified:   "Your Google account email is not verified.",
  google_access_denied:        "Your Google account is not authorized for this panel. Contact your administrator.",
}

function LoginPageInner() {
  const [email,     setEmail]     = useState("")
  const [password,  setPassword]  = useState("")
  const [showPw,    setShowPw]    = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState("")
  const [googleLoading, setGoogleLoading] = useState(false)
  const router       = useRouter()
  const searchParams = useSearchParams()

  // Forgot-password inline state
  const [view,           setView]           = useState<"login" | "forgot" | "forgot_sent">("login")
  const [forgotEmail,    setForgotEmail]    = useState("")
  const [forgotLoading,  setForgotLoading]  = useState(false)
  const [forgotError,    setForgotError]    = useState("")

  // Show Google OAuth errors returned via ?error= query param
  useEffect(() => {
    const oauthError = searchParams.get("error")
    if (oauthError && GOOGLE_ERROR_MESSAGES[oauthError]) {
      setError(GOOGLE_ERROR_MESSAGES[oauthError])
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Invalid credentials")
        return
      }

      router.push(getDefaultLandingPage(data.role ?? ""))
    } catch {
      setError("Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    setGoogleLoading(true)
    setError("")
    // Full-page navigation — triggers the Google OAuth redirect flow
    window.location.href = "/api/admin/auth/google"
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail.trim()) { setForgotError("Email is required"); return }
    setForgotLoading(true)
    setForgotError("")

    try {
      const res = await fetch("/api/admin/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.code === "email_not_configured" || data.code === "email_send_failed") {
          setForgotError("Email delivery unavailable. Ask your Super Admin to generate a reset link from the User Management panel.")
        } else {
          setForgotError(data.error ?? "Request failed. Please try again.")
        }
        return
      }

      setView("forgot_sent")
    } catch {
      setForgotError("Network error. Please try again.")
    } finally {
      setForgotLoading(false)
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

        {/* ── LOGIN VIEW ─────────────────────────────────────────────────────── */}
        {view === "login" && (
          <Card className="bg-gray-900 border-gray-800 shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-lg font-semibold text-center">Sign In</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Google login */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-2.5 border border-gray-700 bg-gray-800 hover:bg-gray-750 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors mb-4 disabled:opacity-60"
              >
                {googleLoading ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                {googleLoading ? "Redirecting…" : "Continue with Google"}
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-800" />
                <span className="text-gray-600 text-xs">or sign in with password</span>
                <div className="flex-1 h-px bg-gray-800" />
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-9 bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-green-500/20"
                    autoComplete="email"
                    required
                  />
                </div>

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
                  disabled={isLoading || !password || !email.trim()}
                >
                  {isLoading ? "Signing in…" : "Sign In"}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  className="text-sm text-green-400 hover:text-green-300 transition-colors underline"
                  onClick={() => {
                    setForgotEmail(email)
                    setForgotError("")
                    setView("forgot")
                  }}
                >
                  Forgot Password?
                </button>
              </div>

              <p className="mt-4 text-center text-xs text-gray-600">
                Authorized personnel only · Contact admin for access
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── FORGOT PASSWORD VIEW ───────────────────────────────────────────── */}
        {view === "forgot" && (
          <Card className="bg-gray-900 border-gray-800 shadow-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
                <CardTitle className="text-white text-lg font-semibold">Forgot Password</CardTitle>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                Enter your email and we&apos;ll send a reset link (valid for 60 minutes).
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <Input
                    type="email"
                    placeholder="Your admin email address"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    className="pl-9 bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-green-500"
                    autoComplete="email"
                    required
                  />
                </div>

                {forgotError && (
                  <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
                    {forgotError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5"
                  disabled={forgotLoading || !forgotEmail.trim()}
                >
                  {forgotLoading ? "Sending…" : "Send Reset Link"}
                </Button>

                <button
                  type="button"
                  className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors py-1"
                  onClick={() => setView("login")}
                >
                  Back to Sign In
                </button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── FORGOT SENT VIEW ──────────────────────────────────────────────── */}
        {view === "forgot_sent" && (
          <Card className="bg-gray-900 border-gray-800 shadow-2xl">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="w-12 h-12 bg-green-900/40 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="text-green-400" size={24} />
              </div>
              <div>
                <p className="text-white font-semibold">Check Your Email</p>
                <p className="text-gray-400 text-sm mt-1">
                  If an account exists for <strong className="text-gray-300">{forgotEmail}</strong>,
                  you&apos;ll receive a reset link shortly. It expires in 60 minutes.
                </p>
              </div>
              <Button
                className="w-full bg-gray-700 hover:bg-gray-600 text-white"
                onClick={() => setView("login")}
              >
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function AdminLogin() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}
