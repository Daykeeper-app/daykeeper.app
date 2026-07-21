"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import FormShell from "@/components/Form/FormShell"
import FormLogo from "@/components/Form/FormLogo"
import FormCard from "@/components/Form/FormCard"
import FormHeader from "@/components/Form/FormHeader"
import FormField from "@/components/Form/FormField"
import FormButton from "@/components/Form/FormButton"
import FormFooterLinks from "@/components/Form/FormFooterLinks"
import FormLegalLinks from "@/components/Form/FormLegalLinks"
import FormAlert from "@/components/Form/FormAlert"
import { LoadingSpinner } from "@/components/common/LoadingIndicator"

export default function ForgotPasswordPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => email.trim().length > 3, [email])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) return

    setLoading(true)
    try {
      // Always anti-enumeration message
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: cleanEmail }),
      })

      // Move to reset-password with email as query
      router.push(`/reset-password?email=${encodeURIComponent(cleanEmail)}`)
    } catch {
      setError("Network error. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormShell>
      <FormLogo />

      <FormCard>
        <FormHeader
          title="Reset your password"
          subtitle="We’ll email you a 6 digit code."
        />

        <form className="space-y-4" onSubmit={onSubmit}>
          <FormField
            label="Email"
            inputProps={{
              type: "email",
              autoComplete: "email",
              placeholder: "you@example.com",
              value: email,
              onChange: (e: any) => setEmail(e.target.value),
            }}
          />

          <FormButton type="submit" disabled={!canSubmit || loading}>
            {loading ? <LoadingSpinner /> : "Send code"}
          </FormButton>

          {info && <FormAlert>{info}</FormAlert>}
          {error && <FormAlert>{error}</FormAlert>}

          <p className="text-center text-sm text-(--dk-slate)">
            Remembered it?{" "}
            <Link href="/login" className="font-medium underline">
              Log in
            </Link>
          </p>
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
