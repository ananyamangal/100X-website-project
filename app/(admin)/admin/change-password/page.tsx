"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Shield, Lock, Eye, EyeOff, CheckCircle, XCircle,
  ArrowLeft, Key,
} from "lucide-react"
import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { checkPasswordStrength, type PasswordStrength } from "@/lib/passwordPolicy"

// ── Strength meter ─────────────────────────────────────────────────────────────

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
        <span className={strength.valid ? "text-green-400" : "text-gray-400"}>{strength.label}</span>
        <div className="flex gap-3 text-gray-500">
          {[
            { ok: strength.checks.minLength,    label: "10+ chars"  },
            { ok: strength.checks.hasUppercase, label: "uppercase"  },
            { ok: strength.checks.hasNumber,    label: "number"     },
            { ok: strength.checks.hasSpecial,   label: "special"    },
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

// ── Password field ─────────────────────────────────────────────────────────────

function PasswordField({
  label, value, onChange, show, onToggleShow, placeholder, autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggleShow: () => void
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
        <Input
          type={show ? "text" : "password"}
          placeholder={placeholder ?? label}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="pl-9 pr-10 bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-green-500"
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          tabIndex={-1}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ChangePasswordPage() {
  const router = useRouter()

  const [currentPw,    setCurrentPw]    = useState("")
  const [newPw,        setNewPw]        = useState("")
  const [confirmPw,    setConfirmPw]    = useState("")
  const [showCurrent,  setShowCurrent]  = useState(false)
  const [showNew,      setShowNew]      = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [isLoading,    setIsLoading]    = useState(false)
  const [error,        setError]        = useState("")
  const [done,         setDone]         = useState(false)

  const strength = checkPasswordStrength(newPw)
  const mismatch = confirmPw.length > 0 && confirmPw !== newPw
  const canSubmit = !isLoading && !!currentPw && strength.valid && newPw === confirmPw && confirmPw.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("/api/admin/auth/change-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          currentPassword: currentPw,
          newPassword:     newPw,
          confirmPassword: confirmPw,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Failed to change password.")
        return
      }
      setDone(true)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <PageShell>
        <Card className="bg-gray-900 border-gray-800 shadow-2xl">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-12 h-12 bg-green-900/40 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="text-green-400" size={24} />
            </div>
            <div>
              <p className="text-white font-semibold">Password Changed</p>
              <p className="text-gray-400 text-sm mt-1">
                Your password has been updated. All other active sessions have been signed out.
                This session remains active.
              </p>
            </div>
            <Button
              className="w-full bg-green-600 hover:bg-green-500 text-white"
              onClick={() => router.push("/admin/growth/security")}
            >
              Back to Security
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <PageShell>
      <Card className="bg-gray-900 border-gray-800 shadow-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => router.back()}
              className="text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={16} />
            </button>
            <CardTitle className="text-white text-lg font-semibold">Change Password</CardTitle>
          </div>
          <p className="text-gray-400 text-sm">
            Enter your current password, then choose a new one.
            All other sessions will be signed out automatically.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">

            {/* Current password */}
            <PasswordField
              label="Current Password"
              value={currentPw}
              onChange={setCurrentPw}
              show={showCurrent}
              onToggleShow={() => setShowCurrent(v => !v)}
              placeholder="Your current password"
              autoComplete="current-password"
            />

            {/* Divider */}
            <div className="border-t border-gray-800 pt-1" />

            {/* New password + strength */}
            <div>
              <PasswordField
                label="New Password"
                value={newPw}
                onChange={setNewPw}
                show={showNew}
                onToggleShow={() => setShowNew(v => !v)}
                placeholder="New password"
                autoComplete="new-password"
              />
              {newPw.length > 0 && (
                <div className="mt-2">
                  <StrengthMeter strength={strength} />
                </div>
              )}
            </div>

            {/* Confirm new password */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <Input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  className={`pl-9 pr-10 bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-green-500 ${
                    mismatch ? "border-red-500" : ""
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
              {mismatch && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Policy reminder */}
            <div className="bg-gray-800/60 rounded-lg px-3 py-2.5 text-[11px] text-gray-400 space-y-1">
              <p className="font-medium text-gray-300">Password requirements</p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
                {[
                  { ok: strength.checks.minLength,    label: "10+ characters"     },
                  { ok: strength.checks.hasUppercase, label: "Uppercase letter"   },
                  { ok: strength.checks.hasLowercase, label: "Lowercase letter"   },
                  { ok: strength.checks.hasNumber,    label: "Number"             },
                  { ok: strength.checks.hasSpecial,   label: "Special character"  },
                ].map(c => (
                  <li key={c.label} className={`flex items-center gap-1 ${c.ok && newPw.length > 0 ? "text-green-400" : ""}`}>
                    {c.ok && newPw.length > 0 ? "✓" : "·"} {c.label}
                  </li>
                ))}
              </ul>
            </div>

            {error && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <XCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 transition-colors disabled:opacity-50"
              disabled={!canSubmit}
            >
              {isLoading ? "Saving…" : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  )
}

// ── Layout shell ───────────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-green-900/40">
            <Key className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Growth OS</h1>
          <p className="text-gray-400 text-sm mt-1">100X Circle — Change Password</p>
        </div>
        {children}
      </div>
    </div>
  )
}
