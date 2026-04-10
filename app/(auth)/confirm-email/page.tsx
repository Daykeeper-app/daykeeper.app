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
import FormFooterLinks from "@/components/Form/FormFooterLinks"
import FormLegalLinks from "@/components/Form/FormLegalLinks"
import FormAlert from "@/components/Form/FormAlert"

const RESEND_COOLDOWN = 120 // seconds

function ConfirmEmailForm() {
  const router = useRouter()
  const params = useSearchParams()
  const email = (params.get("email") || "").trim().toLowerCase()

  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // resend timer
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  const canSubmit = useMemo(() => {
    if (!email) return false
    const c = code.replace(/\s/g, "")
    if (!/^\d{6}$/.test(c)) return false
    return true
  }, [email, code])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!canSubmit) return

    setLoading(true)
    try {
      const res = await fetch("/api/auth/confirm-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          verificationCode: code.replace(/\s/g, ""),
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setError(data?.error || "Invalid code")
        return
      }

      router.push(
        `/login?message=email-confirmed&email=${encodeURIComponent(email)}`
      )
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
      const res = await fetch("/api/auth/resend_code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error || "Could not resend code")
        return
      }

      // start cooldown only on success
      setCooldown(RESEND_COOLDOWN)
    } catch {
      setError("Network error. Try again.")
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
          title="Confirm your email"
          subtitle={
            email
              ? `We sent a 6 digit code to ${email}`
              : "We sent a 6 digit code to your email"
          }
        />

        <form className="space-y-4" onSubmit={onSubmit}>
          {!email && (
            <FormAlert>
              Missing email. Please go back to login/register and try again.
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

          <FormButton type="submit" disabled={!canSubmit || loading}>
            {loading ? "Confirming..." : "Confirm email"}
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

      <FormFooterLinks
        text="New here?"
        linkText="Create an account"
        href="/register"
      />
      <FormLegalLinks />
    </FormShell>
  )
}

export default function ConfirmEmailPage() {
  return (
    <Suspense
      fallback={
        <FormShell>
          <FormLogo />
          <FormCard>
            <FormHeader
              title="Confirm your email"
              subtitle="Loading…"
            />
            <div className="text-sm text-(--dk-slate)">Preparing…</div>
          </FormCard>
          <FormLegalLinks />
        </FormShell>
      }
    >
      <ConfirmEmailForm />
    </Suspense>
  )
}
