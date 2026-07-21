"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from "lucide-react"

import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"
import FormAlert from "@/components/Form/FormAlert"
import FormField from "@/components/Form/FormField"
import FormButton from "@/components/Form/FormButton"
import { LoadingRows } from "@/components/common/LoadingSkeleton"

type Step =
  | { kind: "loading" }
  | { kind: "enabled"; method: string }
  | { kind: "disabled" }
  | { kind: "setup-email"; challengeId: string }
  | { kind: "setup-totp"; qrDataUrl: string; secret: string }
  | { kind: "backup"; codes: string[] }

async function readError(res: Response, fallback: string) {
  const data = await res.json().catch(() => null)
  return (data?.error || data?.message || fallback) as string
}

export default function TwoFactorSettingsPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>({ kind: "loading" })
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadStatus() {
    try {
      const res = await apiFetch(`${API_URL}/auth/user`)
      const data = await res.json().catch(() => null)
      const tf = data?.user?.twoFactor
      setStep(
        tf?.enabled
          ? { kind: "enabled", method: tf.method || "email" }
          : { kind: "disabled" }
      )
    } catch {
      setStep({ kind: "disabled" })
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  async function startSetup(method: "email" | "totp") {
    setError(null)
    setBusy(true)
    try {
      const res = await apiFetch(`${API_URL}/auth/2fa/setup/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      })
      if (!res.ok) {
        setError(await readError(res, "Could not start setup."))
        return
      }
      const data = await res.json()
      setCode("")
      if (method === "email") {
        setStep({ kind: "setup-email", challengeId: data.challengeId })
      } else {
        setStep({ kind: "setup-totp", qrDataUrl: data.qrDataUrl, secret: data.secret })
      }
    } catch {
      setError("Network error. Try again.")
    } finally {
      setBusy(false)
    }
  }

  async function confirmSetup() {
    if (step.kind !== "setup-email" && step.kind !== "setup-totp") return
    setError(null)
    setBusy(true)
    try {
      const body =
        step.kind === "setup-email"
          ? { challengeId: step.challengeId, code: code.trim() }
          : { code: code.trim() }
      const res = await apiFetch(`${API_URL}/auth/2fa/setup/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        setError(await readError(res, "Invalid code."))
        return
      }
      const data = await res.json()
      setStep({ kind: "backup", codes: data.backupCodes || [] })
    } catch {
      setError("Network error. Try again.")
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setError(null)
    setBusy(true)
    try {
      const isTotp = step.kind === "enabled" && step.method === "totp"
      const res = await apiFetch(`${API_URL}/auth/2fa/disable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isTotp ? { code: code.trim() } : { password }
        ),
      })
      if (!res.ok) {
        setError(await readError(res, "Could not disable 2FA."))
        return
      }
      setCode("")
      setPassword("")
      await loadStatus()
    } catch {
      setError("Network error. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="pb-20 lg:pb-0">
      <div className="max-w-2xl mx-auto border-x border-(--dk-ink)/10 bg-(--dk-paper) min-h-screen">
        <div className="sticky top-0 bg-(--dk-paper)/95 backdrop-blur-md z-20">
          <div className="h-1 w-full bg-(--dk-sky)/70" />
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-(--dk-mist) transition"
              aria-label="Back"
            >
              <ArrowLeft size={18} className="text-(--dk-ink)" />
            </button>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-(--dk-ink)">
                Two-factor authentication
              </div>
              <div className="text-xs text-(--dk-slate)">
                Add a second step when you sign in
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 space-y-4">
          {error ? <FormAlert>{error}</FormAlert> : null}

          {step.kind === "loading" ? (
            <LoadingRows rows={3} className="px-0 py-0" />
          ) : null}

          {step.kind === "disabled" ? (
            <>
              <p className="text-sm text-(--dk-slate)">
                Protect your account by requiring a code at login from a new
                device. Choose how you’d like to receive your codes.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => startSetup("email")}
                className="w-full flex items-center gap-3 rounded-xl border border-(--dk-ink)/10 px-4 py-4 hover:bg-(--dk-sky)/8 transition disabled:opacity-60"
              >
                <Mail size={18} className="text-(--dk-ink)" />
                <span className="text-left">
                  <span className="block text-sm font-semibold text-(--dk-ink)">
                    Email code
                  </span>
                  <span className="block text-xs text-(--dk-slate)">
                    We email a 6-digit code at sign-in
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => startSetup("totp")}
                className="w-full flex items-center gap-3 rounded-xl border border-(--dk-ink)/10 px-4 py-4 hover:bg-(--dk-sky)/8 transition disabled:opacity-60"
              >
                <KeyRound size={18} className="text-(--dk-ink)" />
                <span className="text-left">
                  <span className="block text-sm font-semibold text-(--dk-ink)">
                    Authenticator app
                  </span>
                  <span className="block text-xs text-(--dk-slate)">
                    Use Authy, Google Authenticator, etc.
                  </span>
                </span>
              </button>
            </>
          ) : null}

          {step.kind === "setup-email" ? (
            <>
              <p className="text-sm text-(--dk-slate)">
                Enter the 6-digit code we just emailed you to finish enabling
                two-factor authentication.
              </p>
              <FormField
                label="Email code"
                inputProps={{
                  inputMode: "numeric",
                  placeholder: "123456",
                  maxLength: 6,
                  value: code,
                  onChange: (e) => setCode(e.currentTarget.value.replace(/\s+/g, "")),
                }}
              />
              <FormButton onClick={confirmSetup} disabled={busy || code.trim().length < 6}>
                {busy ? "Confirming…" : "Enable"}
              </FormButton>
            </>
          ) : null}

          {step.kind === "setup-totp" ? (
            <>
              <p className="text-sm text-(--dk-slate)">
                Scan this QR code with your authenticator app, then enter the
                6-digit code it shows.
              </p>
              <div className="flex justify-center">
                <Image
                  src={step.qrDataUrl}
                  alt="Authenticator QR code"
                  width={200}
                  height={200}
                  unoptimized
                  className="rounded-xl border border-(--dk-ink)/10"
                />
              </div>
              <div className="text-center text-xs text-(--dk-slate)">
                Can’t scan? Enter this key manually:
                <span className="block mt-1 font-mono text-(--dk-ink) break-all">
                  {step.secret}
                </span>
              </div>
              <FormField
                label="Authenticator code"
                inputProps={{
                  inputMode: "numeric",
                  placeholder: "123456",
                  maxLength: 6,
                  value: code,
                  onChange: (e) => setCode(e.currentTarget.value.replace(/\s+/g, "")),
                }}
              />
              <FormButton onClick={confirmSetup} disabled={busy || code.trim().length < 6}>
                {busy ? "Confirming…" : "Enable"}
              </FormButton>
            </>
          ) : null}

          {step.kind === "backup" ? (
            <>
              <div className="flex items-center gap-2 text-(--dk-ink)">
                <ShieldCheck size={18} />
                <span className="text-sm font-semibold">
                  Two-factor authentication is on
                </span>
              </div>
              <p className="text-sm text-(--dk-slate)">
                Save these one-time backup codes somewhere safe. Each works once
                if you lose access to your code. They won’t be shown again.
              </p>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-(--dk-ink)/10 p-4 font-mono text-sm text-(--dk-ink)">
                {step.codes.map((c) => (
                  <div key={c}>{c}</div>
                ))}
              </div>
              <FormButton onClick={() => loadStatus()}>Done</FormButton>
            </>
          ) : null}

          {step.kind === "enabled" ? (
            <>
              <div className="flex items-center gap-2 text-(--dk-ink)">
                <ShieldCheck size={18} />
                <span className="text-sm font-semibold">
                  Two-factor authentication is on
                </span>
              </div>
              <p className="text-sm text-(--dk-slate)">
                Method:{" "}
                {step.method === "totp" ? "Authenticator app" : "Email code"}.
                To turn it off, confirm below.
              </p>
              {step.method === "totp" ? (
                <FormField
                  label="Authenticator code"
                  inputProps={{
                    inputMode: "numeric",
                    placeholder: "123456",
                    maxLength: 6,
                    value: code,
                    onChange: (e) => setCode(e.currentTarget.value.replace(/\s+/g, "")),
                  }}
                />
              ) : (
                <FormField
                  label="Account password"
                  inputProps={{
                    type: "password",
                    placeholder: "Your password",
                    value: password,
                    onChange: (e) => setPassword(e.currentTarget.value),
                  }}
                />
              )}
              <FormButton
                variant="secondary"
                onClick={disable}
                disabled={
                  busy ||
                  (step.method === "totp"
                    ? code.trim().length < 6
                    : password.length < 1)
                }
              >
                {busy ? "Disabling…" : "Disable two-factor"}
              </FormButton>
            </>
          ) : null}
        </div>
      </div>
    </main>
  )
}
