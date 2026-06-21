"use client"

import { Suspense, useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { completeAuthLogin } from "@/lib/completeAuth"

import FormShell from "@/components/Form/FormShell"
import FormLogo from "@/components/Form/FormLogo"
import FormCard from "@/components/Form/FormCard"
import FormHeader from "@/components/Form/FormHeader"
import FormField from "@/components/Form/FormField"
import FormButton from "@/components/Form/FormButton"
import FormDivider from "@/components/Form/FormDivider"
import GoogleSignInButton from "@/components/Form/GoogleSignInButton"
import FormFooterLinks from "@/components/Form/FormFooterLinks"
import FormLegalLinks from "@/components/Form/FormLegalLinks"
import FormAlert from "@/components/Form/FormAlert"

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const message = params.get("message")
  const initialEmail = (params.get("email") || "").trim().toLowerCase()

  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.trim().length >= 1 && !loading
  }, [email, password, loading])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const cleanEmail = email.trim().toLowerCase()

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: cleanEmail, password }),
      })

      const data = await res.json().catch(() => null)

      // better: use a code, but keeping your current check
      if (data?.error?.includes("Email not verified")) {
        router.push(`/confirm-email?email=${encodeURIComponent(cleanEmail)}`)
        return
      }

      if (!res.ok) {
        setError(data?.error || "Invalid email or password")
        return
      }

      const token = data?.accessToken as string | undefined
      if (!token) {
        setError("Login succeeded but no access token was returned.")
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

  const onGoogleCredential = useCallback(
    async (idToken: string) => {
      setError(null)
      setLoading(true)
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ idToken }),
        })

        const data = await res.json().catch(() => null)

        if (!res.ok) {
          setError(data?.error || "Google sign-in failed")
          return
        }

        const token = data?.accessToken as string | undefined
        if (!token) {
          setError("Google sign-in returned no access token.")
          return
        }

        await completeAuthLogin(token)
        router.push("/")
      } catch {
        setError("Network error. Try again.")
      } finally {
        setLoading(false)
      }
    },
    [router]
  )

  const successText =
    message === "email-confirmed"
      ? "Email confirmed successfully. You can log in now."
      : message === "account-created"
      ? "Account created successfully. Check your email for the code."
      : message === "password-reset"
      ? "Password updated successfully. You can log in now."
      : null

  return (
    <FormShell>
      <FormLogo />

      <FormCard>
        <FormHeader title="Welcome back" subtitle="Log in to your account" />

        <form className="space-y-3.5" onSubmit={onSubmit}>
          {successText ? (
            <FormAlert type="success">{successText}</FormAlert>
          ) : null}

          <FormField
            label="Email or Username"
            inputProps={{
              type: "text",
              autoComplete: "email",
              placeholder: "you@example.com",
              value: email,
              onChange: (e) => setEmail(e.currentTarget.value),
            }}
          />

          <FormField
            label="Password"
            rightSlot={
              <Link
                href="/forgot-password"
                className="text-xs hover:underline text-(--dk-slate)"
              >
                Forgot?
              </Link>
            }
            inputProps={{
              type: "password",
              autoComplete: "current-password",
              placeholder: "Your password",
              value: password,
              onChange: (e) => setPassword(e.currentTarget.value),
            }}
          />

          {error ? <FormAlert>{error}</FormAlert> : null}

          <FormButton type="submit" disabled={!canSubmit}>
            {loading ? "Logging in..." : "Log in"}
          </FormButton>

          <FormDivider />

          <GoogleSignInButton
            text="continue_with"
            onCredential={onGoogleCredential}
            onError={setError}
          />
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <FormShell>
          <FormLogo />
          <FormCard>
            <FormHeader title="Welcome back" subtitle="Loading…" />
            <div className="text-sm text-(--dk-slate)">Preparing…</div>
          </FormCard>
          <FormLegalLinks />
        </FormShell>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
