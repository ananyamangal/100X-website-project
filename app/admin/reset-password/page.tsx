"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Shield, Lock, Eye, EyeOff, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { checkPasswordStrength, type PasswordStrength } from "@/lib/passwordPolicy"

// ── Strength meter ────────────────────────────────────────────────────────────

function StrengthMeter({ strength }: { strength: PasswordStrength }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-200 ${
              i <= strength.score ? strength.color : "bg-gray-700"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className={strength.valid ? "text-green-400" : "text-gray-400"}>
          {strength.label}
        </span>
        <div className="flex gap-3 text-gray-500">
          {[
            { ok: strength.checks.minLength,    label: "10+ chars" },
            { ok: strength.checks.hasUppercase, label: "uppercase" },
            { ok: strength.checks.hasNumber,    label: "number" },
            { ok: strength.checks.hasSpecial,   label: "special" },
          ].map(c => (
            <span key={c.label} className={c.ok ? "text-green-400" : "text-gray-500"}>
              {c.ok ? "✓" : "·"} {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Inner component — reads search params ─────────────────────────────────────

function ResetPasswordForm() {
  const router         = useRouter()
  const searchParams   = useSearchParams()
  const token          = searchParams.get("token") ?? ""

  const [password,    setPassword]    = useState("")
  const [confirm,     setConfirm]     = useState("")
  const [showPw,      setShowPw]      = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading,   setIsLoading]   = useState(false)
  const [error,       setError]       = useState("")
  const [done,        setDone]        = useState(false)
  const [tokenError,  setTokenError]  = useState("")

  const strength = checkPasswordStrength(password)

  useEffect(() => {
    if (!token) setTokenError("No reset token found. Please use the link from your email.")
    else setTokenError("")
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!strength.valid) { setError("Please meet all password requirements"); return }
    if (password !== confirm) { setError("Passwords do not match"); return }
    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("/api/admin/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword: confirm }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 400 && data.error?.includes("expired")) {
          setTokenError(data.error)
        } else if (res.status === 400 && (data.error?.includes("already been used") || data.error?.includes("Invalid"))) {
          setTokenError(data.error)
        } else {
          setError(data.error ?? "Reset failed. Please try again.")
        }
        return
      }
      setDone(true)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // ── Token error state ───────────────────────────────────────────────────────
  if (tokenError) {
    return (
      <Card className="bg-gray-900 border-gray-800 shadow-2xl">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="w-12 h-12 bg-amber-900/40 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="text-amber-400" size={24} />
          </div>
          <div>
            <p className="text-white font-semibold">Link Invalid or Expired</p>
            <p className="text-gray-400 text-sm mt-1">{tokenError}</p>
          </div>
          <Button
            className="w-full bg-green-600 hover:bg-green-500 text-white"
            onClick={() => router.push("/admin/login")}
          >
            Back to Login
          </Button>
          <p className="text-xs text-gray-500">
            Need a new link?{" "}
            <button
              className="text-green-400 hover:underline"
              onClick={() => router.push("/admin/login")}
            >
              Request password reset
            </button>
          </p>
        </CardContent>
      </Card>
    )
  }

  // ── Success state ───────────────────────────────────────────────────────────
  if (done) {
    return (
      <Card className="bg-gray-900 border-gray-800 shadow-2xl">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="w-12 h-12 bg-green-900/40 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="text-green-400" size={24} />
          </div>
          <div>
            <p className="text-white font-semibold">Password Changed</p>
            <p className="text-gray-400 text-sm mt-1">
              Your password has been updated and all active sessions have been revoked.
              Please log in with your new password.
            </p>
          </div>
          <Button
            className="w-full bg-green-600 hover:bg-green-500 text-white"
            onClick={() => router.push("/admin/login")}
          >
            Go to Login
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ── Reset form ──────────────────────────────────────────────────────────────
  return (
    <Card className="bg-gray-900 border-gray-800 shadow-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-white text-lg font-semibold text-center">
          Set New Password
        </CardTitle>
        <p className="text-gray-400 text-sm text-center mt-1">
          Choose a strong password for your admin account.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New password */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <Input
                type={showPw ? "text" : "password"}
                placeholder="New password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pl-9 pr-10 bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-green-500"
                autoComplete="new-password"
                required
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
            {password.length > 0 && (
              <div className="mt-2">
                <StrengthMeter strength={strength} />
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className={`pl-9 pr-10 bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-green-500 ${
                  confirm.length > 0 && confirm !== password ? "border-red-500" : ""
                }`}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {confirm.length > 0 && confirm !== password && (
              <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
            )}
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <XCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 transition-colors"
            disabled={isLoading || !strength.valid || password !== confirm}
          >
            {isLoading ? "Saving…" : "Reset Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ── Page wrapper (Suspense required for useSearchParams) ──────────────────────

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-green-900/40">
            <Shield className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Growth OS</h1>
          <p className="text-gray-400 text-sm mt-1">100X Circle — Password Reset</p>
        </div>

        <Suspense
          fallback={
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-12 text-center text-gray-400">Loading…</CardContent>
            </Card>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
