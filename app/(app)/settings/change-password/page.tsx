"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import FormField from "@/components/Form/FormField"
import FormButton from "@/components/Form/FormButton"
import FormAlert from "@/components/Form/FormAlert"
import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"
import { LoadingSpinner } from "@/components/common/LoadingIndicator"

export default function ChangePasswordPage() {
  const router = useRouter()
  const [lastPassword, setLastPassword] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    if (!lastPassword) return false
    if (!password) return false
    if (password !== confirmPassword) return false
    return true
  }, [lastPassword, password, confirmPassword])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || loading) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const fd = new FormData()
      fd.append("lastPassword", lastPassword)
      fd.append("password", password)

      const res = await apiFetch(`${API_URL}/user`, {
        method: "PUT",
        body: fd,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || "Failed to change password")
      }

      setSuccess("Password updated successfully.")
      setLastPassword("")
      setPassword("")
      setConfirmPassword("")
    } catch (e: any) {
      setError(e?.message || "Failed to change password")
    } finally {
      setLoading(false)
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
                Change password
              </div>
              <div className="text-xs text-(--dk-slate)">
                Keep your account secure.
              </div>
            </div>
          </div>
        </div>

        <div className="pb-8">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="px-4 pt-6">
              {error ? <FormAlert>{error}</FormAlert> : null}
              {success ? <FormAlert type="success">{success}</FormAlert> : null}
            </div>

            <div className="border-t border-(--dk-ink)/10">
              <div className="px-4 py-4">
                <FormField
                  label="Current password"
                  inputProps={{
                    type: "password",
                    autoComplete: "current-password",
                    placeholder: "Enter your current password",
                    value: lastPassword,
                    onChange: (e: any) => setLastPassword(e.target.value),
                  }}
                />
              </div>
            </div>

            <div className="border-t border-(--dk-ink)/10">
              <div className="px-4 py-4">
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
              </div>
            </div>

            <div className="border-t border-(--dk-ink)/10">
              <div className="px-4 py-4">
                <FormField
                  label="Confirm new password"
                  inputProps={{
                    type: "password",
                    autoComplete: "new-password",
                    placeholder: "Repeat new password",
                    value: confirmPassword,
                    onChange: (e: any) => setConfirmPassword(e.target.value),
                  }}
                />
              </div>
            </div>

            <div className="px-4 pt-2">
              <FormButton type="submit" disabled={!canSubmit || loading}>
                {loading ? <LoadingSpinner /> : "Update password"}
              </FormButton>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
