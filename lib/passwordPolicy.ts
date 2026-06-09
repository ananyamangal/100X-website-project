// Shared password policy — works in both Node.js (API routes) and browser (React).
// Import this anywhere; it has no Node-only deps.

export interface PasswordChecks {
  minLength: boolean     // >= 10 characters
  hasUppercase: boolean  // at least one A-Z
  hasLowercase: boolean  // at least one a-z
  hasNumber: boolean     // at least one 0-9
  hasSpecial: boolean    // at least one non-alphanumeric
}

export interface PasswordStrength {
  score: number          // 0–5 (number of passing checks)
  label: string          // "Very Weak" | "Weak" | "Fair" | "Good" | "Strong"
  color: string          // tailwind color class for the bar
  checks: PasswordChecks
  valid: boolean         // true only when all 5 checks pass
}

const LABELS = ["Very Weak", "Weak", "Fair", "Good", "Strong"]
const COLORS = ["bg-red-500", "bg-red-400", "bg-amber-400", "bg-lime-400", "bg-green-500"]

export function checkPasswordStrength(password: string): PasswordStrength {
  const checks: PasswordChecks = {
    minLength:    password.length >= 10,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber:    /[0-9]/.test(password),
    hasSpecial:   /[^A-Za-z0-9]/.test(password),
  }
  const score = Object.values(checks).filter(Boolean).length
  return {
    score,
    label:  LABELS[score - 1] ?? "Very Weak",
    color:  COLORS[score - 1] ?? "bg-gray-600",
    checks,
    valid:  score === 5,
  }
}

export function validatePassword(password: string): string | null {
  const s = checkPasswordStrength(password)
  if (!s.checks.minLength)    return "Password must be at least 10 characters"
  if (!s.checks.hasUppercase) return "Password must include at least one uppercase letter"
  if (!s.checks.hasLowercase) return "Password must include at least one lowercase letter"
  if (!s.checks.hasNumber)    return "Password must include at least one number"
  if (!s.checks.hasSpecial)   return "Password must include at least one special character"
  return null
}
