"use client"

import Link from "next/link"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import FormShell from "@/components/Form/FormShell"
import FormLogo from "@/components/Form/FormLogo"
import FormCard from "@/components/Form/FormCard"
import FormHeader from "@/components/Form/FormHeader"
import FormField from "@/components/Form/FormField"
import FormButton from "@/components/Form/FormButton"
import FormLegalLinks from "@/components/Form/FormLegalLinks"
import FormAlert from "@/components/Form/FormAlert"
import AuthLoading from "@/components/Auth/AuthLoading"
import { LoadingSpinner } from "@/components/common/LoadingIndicator"

const RESEND_COOLDOWN = 120 // seconds

function ResetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()

  const email = (params.get("email") || "").trim().toLowerCase()

  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // resend timer state
  const [cooldown, setCooldown] = useState(0)

  // countdown effect
  useEffect(() => {
    if (cooldown <= 0) return

    const id = setInterval(() => {
      setCooldown((c) => c - 1)
    }, 1000)

    return () => clearInterval(id)
  }, [cooldown])

  const canSubmit = useMemo(() => {
    if (!email) return false
    const c = code.replace(/\s/g, "")
    if (!/^\d{6}$/.test(c)) return false
    if (!password) return false
    if (password !== confirmPassword) return false
    return true
  }, [email, code, password, confirmPassword])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!canSubmit) return

    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          code: code.replace(/\s/g, ""),
          newPassword: password,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setError(data?.error || "Invalid code or expired.")
        return
      }

      router.push("/login?message=password-reset")
    } catch {
      setError("Network error. Try again.")
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    if (cooldown > 0 || !email) return

    setError(null)
    setLoading(true)

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      }).catch(() => null)

      // start cooldown
      setCooldown(RESEND_COOLDOWN)
    } finally {
      setLoading(false)
    }
  }

  const minutes = Math.floor(cooldown / 60)
  const seconds = cooldown % 60
  const timerText =
    cooldown > 0
      ? `Resend code (${minutes}:${seconds.toString().padStart(2, "0")})`
      : "Resend code"

  return (
    <FormShell>
      <FormLogo />

      <FormCard>
        <FormHeader
          title="Create a new password"
          subtitle={email ? `Enter the code sent to ${email}` : "Missing email"}
        />

        <form className="space-y-4" onSubmit={onSubmit}>
          {!email && (
            <FormAlert>
              Missing email. Please start from{" "}
              <Link href="/forgot-password" className="underline">
                Forgot password
              </Link>
              .
            </FormAlert>
          )}

          <FormField
            label="6 digit code"
            inputProps={{
              type: "text",
              inputMode: "numeric",
              autoComplete: "one-time-code",
              placeholder: "123456",
              value: code,
              onChange: (e: any) =>
                setCode(e.target.value.replace(/[^\d\s]/g, "")),
            }}
          />

          <FormField
            label="New password"
            inputProps={{
              type: "password",
              autoComplete: "new-password",
              placeholder: "Create a new password",
              value: password,
              onChange: (e: any) => setPassword(e.target.value),
            }}
          />

          <FormField
            label="Confirm new password"
            inputProps={{
              type: "password",
              autoComplete: "new-password",
              placeholder: "Repeat your new password",
              value: confirmPassword,
              onChange: (e: any) => setConfirmPassword(e.target.value),
            }}
          />

          <FormButton type="submit" disabled={!canSubmit || loading}>
            {loading ? <LoadingSpinner /> : "Update password"}
          </FormButton>

          {error && <FormAlert>{error}</FormAlert>}

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={resend}
              className="underline disabled:opacity-50"
              disabled={loading || !email || cooldown > 0}
            >
              {timerText}
            </button>

            <Link href="/login" className="font-medium underline">
              Back to login
            </Link>
          </div>
        </form>
      </FormCard>

      <FormLegalLinks />
    </FormShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={<AuthLoading />}
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
