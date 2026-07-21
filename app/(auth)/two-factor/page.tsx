"use client"

import { Suspense, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { completeAuthLogin } from "@/lib/completeAuth"

import FormShell from "@/components/Form/FormShell"
import FormLogo from "@/components/Form/FormLogo"
import FormCard from "@/components/Form/FormCard"
import FormHeader from "@/components/Form/FormHeader"
import FormField from "@/components/Form/FormField"
import FormButton from "@/components/Form/FormButton"
import FormFooterLinks from "@/components/Form/FormFooterLinks"
import FormLegalLinks from "@/components/Form/FormLegalLinks"
import FormAlert from "@/components/Form/FormAlert"
import AuthLoading from "@/components/Auth/AuthLoading"
import { LoadingSpinner } from "@/components/common/LoadingIndicator"

function TwoFactorForm() {
  const router = useRouter()
  const params = useSearchParams()
  const challengeId = params.get("challengeId") || ""
  const method = params.get("method") === "totp" ? "totp" : "email"
  const email = params.get("email") || ""

  const [code, setCode] = useState("")
  const [trustDevice, setTrustDevice] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const canSubmit = useMemo(
    () => challengeId.length > 0 && code.trim().length >= 6 && !loading,
    [challengeId, code, loading]
  )

  const subtitle =
    method === "totp"
      ? "Enter the 6-digit code from your authenticator app."
      : `Enter the 6-digit code we sent${email ? ` to ${email}` : " to your email"}.`

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setNotice(null)
    setLoading(true)

    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ challengeId, code: code.trim(), trustDevice }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setError(data?.error || "Invalid or expired code.")
        return
      }

      const token = data?.accessToken as string | undefined
      if (!token) {
        setError("Verification succeeded but no access token was returned.")
        return
      }

      await completeAuthLogin(token)
      router.push("/")
    } catch {
      setError("Network error. Try again.")
    } finally {
      setLoading(false)
    }
  }

  async function onResend() {
    if (resending || method !== "email") return
    setError(null)
    setNotice(null)
    setResending(true)
    try {
      const res = await fetch("/api/auth/2fa/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error || "Could not resend the code.")
        return
      }
      setNotice("A new code is on its way.")
    } catch {
      setError("Network error. Try again.")
    } finally {
      setResending(false)
    }
  }

  return (
    <FormShell>
      <FormLogo />

      <FormCard>
        <FormHeader title="Two-step verification" subtitle={subtitle} />

        <form className="space-y-3.5" onSubmit={onSubmit}>
          {notice ? <FormAlert type="success">{notice}</FormAlert> : null}

          <FormField
            label="Verification code"
            inputProps={{
              type: "text",
              inputMode: "numeric",
              autoComplete: "one-time-code",
              placeholder: "123456",
              maxLength: 8,
              value: code,
              onChange: (e) =>
                setCode(e.currentTarget.value.replace(/\s+/g, "")),
            }}
          />

          <label className="flex items-center gap-2 text-sm text-(--dk-ink) select-none">
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.currentTarget.checked)}
              className="h-4 w-4 rounded border-(--dk-ink)/30 accent-(--dk-sky)"
            />
            Trust this device for 30 days
          </label>

          {error ? <FormAlert>{error}</FormAlert> : null}

          <FormButton type="submit" disabled={!canSubmit}>
            {loading ? <LoadingSpinner /> : "Verify"}
          </FormButton>

          {method === "email" ? (
            <button
              type="button"
              onClick={onResend}
              disabled={resending}
              className="w-full text-xs text-(--dk-slate) hover:underline disabled:opacity-60"
            >
              {resending ? <LoadingSpinner size={15} /> : "Didn’t get a code? Resend"}
            </button>
          ) : null}
        </form>
      </FormCard>

      <FormFooterLinks text="Back to" linkText="Log in" href="/login" />
      <FormLegalLinks />
    </FormShell>
  )
}

export default function TwoFactorPage() {
  return (
    <Suspense
      fallback={<AuthLoading />}
    >
      <TwoFactorForm />
    </Suspense>
  )
}
