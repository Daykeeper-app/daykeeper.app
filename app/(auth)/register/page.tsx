"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useState } from "react"
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

export default function RegisterPage() {
  const router = useRouter()

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [agree, setAgree] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    if (!username.trim()) return false
    if (!email.trim()) return false
    if (!password) return false
    if (password !== confirmPassword) return false
    if (!agree) return false
    return true
  }, [username, email, password, confirmPassword, agree])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!canSubmit) return

    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setError(data?.error || "Could not create account")
        return
      }

      // go confirm email and pass email as query param
      router.push(`/confirm-email?email=${encodeURIComponent(email.trim())}`)
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

  return (
    <FormShell>
      <FormLogo />

      <FormCard>
        <FormHeader
          title="Create your account"
          subtitle="Start your DayKeeper journey"
        />

        <form className="space-y-3.5" onSubmit={onSubmit}>
          <FormField
            label="Username"
            inputProps={{
              type: "text",
              autoComplete: "name",
              placeholder: "Your @username",
              value: username,
              onChange: (e: any) => setUsername(e.target.value),
            }}
          />

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

          <FormField
            label="Password"
            inputProps={{
              type: "password",
              autoComplete: "new-password",
              placeholder: "Create a password",
              value: password,
              onChange: (e: any) => setPassword(e.target.value),
            }}
          />

          <FormField
            label="Confirm password"
            inputProps={{
              type: "password",
              autoComplete: "new-password",
              placeholder: "Repeat your password",
              value: confirmPassword,
              onChange: (e: any) => setConfirmPassword(e.target.value),
            }}
          />

          <div className="pt-1">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border border-(--dk-ink)/20 bg-(--dk-paper)"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
          </div>

          <FormButton type="submit" disabled={!canSubmit || loading}>
            {loading ? "Creating..." : "Create account"}
          </FormButton>

          {error && <FormAlert>{error}</FormAlert>}

          <FormDivider />

          <GoogleSignInButton
            text="signup_with"
            onCredential={onGoogleCredential}
            onError={setError}
          />
        </form>
      </FormCard>

      <FormFooterLinks
        text="Already have an account?"
        linkText="Log in"
        href="/login"
      />
      <FormLegalLinks />
    </FormShell>
  )
}
