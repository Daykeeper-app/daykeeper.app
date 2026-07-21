"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ShieldCheck, ShieldOff } from "lucide-react"

import FormAlert from "@/components/Form/FormAlert"
import FormButton from "@/components/Form/FormButton"
import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"
import { LoadingSpinner } from "@/components/common/LoadingIndicator"

type PrivacyMode = "public" | "private"

type AuthUserResponse = {
  user?: {
    private?: boolean
  }
}

export default function PrivacyPage() {
  const router = useRouter()
  const [mode, setMode] = useState<PrivacyMode>("public")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const res = await apiFetch(`${API_URL}/auth/user`, { method: "GET" })
        if (!res.ok) return
        const json = (await res.json().catch(() => null)) as AuthUserResponse
        const next = json?.user?.private
        if (alive && typeof next === "boolean") {
          setMode(next ? "private" : "public")
        }
      } catch {}
    }

    load()
    return () => {
      alive = false
    }
  }, [])

  const helperText = useMemo(() => {
    return mode === "public"
      ? "Public: anyone can see your profile and posts."
      : "Private: only approved followers can see your posts and activity."
  }, [mode])

  async function onSave() {
    if (loading) return
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const fd = new FormData()
      fd.append("private", String(mode === "private"))

      const res = await apiFetch(`${API_URL}/user`, {
        method: "PUT",
        body: fd,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || "Failed to update privacy")
      }

      setSuccess("Privacy updated successfully.")
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to update privacy"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="pb-20 lg:pb-0">
      <div className="mx-auto min-h-screen max-w-3xl bg-(--dk-paper) lg:border-x lg:border-(--dk-ink)/10">
        <div className="sticky top-0 z-20 border-b border-(--dk-ink)/10 bg-(--dk-paper)/96 backdrop-blur-md">
          <div className="h-0.5 w-full bg-(--dk-sky)/65" />
          <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <button
              onClick={() => router.back()}
              className="rounded-lg p-2 transition hover:bg-(--dk-mist)/75"
              aria-label="Back"
            >
              <ArrowLeft size={18} className="text-(--dk-ink)" />
            </button>

            <div className="leading-tight">
              <div className="text-sm font-semibold text-(--dk-ink)">
                Privacy
              </div>
              <div className="text-xs text-(--dk-slate)">
                Choose who can see your activity.
              </div>
            </div>
          </div>
        </div>

        <div className="pb-8">
          <div className="px-4 pt-6 sm:px-5">
            {error ? <FormAlert>{error}</FormAlert> : null}
            {success ? <FormAlert type="success">{success}</FormAlert> : null}
          </div>

          <section className="px-4 pt-4 sm:px-5">
            <div className="flex items-start gap-3 rounded-xl bg-(--dk-mist)/45 px-4 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-(--dk-sky)/15 text-(--dk-ink)">
                {mode === "public" ? (
                  <ShieldCheck size={18} />
                ) : (
                  <ShieldOff size={18} />
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-(--dk-ink)">
                  Account visibility
                </div>
                <div className="text-xs text-(--dk-slate)">{helperText}</div>
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-(--dk-mist)/40 p-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <label
                  className={[
                    "cursor-pointer rounded-lg px-3 py-3 transition",
                    mode === "public"
                      ? "bg-(--dk-sky)/18 ring-1 ring-(--dk-sky)/30"
                      : "hover:bg-(--dk-mist)/70",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="privacy"
                    value="public"
                    checked={mode === "public"}
                    onChange={() => setMode("public")}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        "h-2.5 w-2.5 rounded-full transition",
                        mode === "public"
                          ? "bg-(--dk-sky)"
                          : "bg-(--dk-ink)/25",
                      ].join(" ")}
                    />
                    <div className="text-sm font-semibold text-(--dk-ink)">
                      Public
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-(--dk-slate)">
                    Anyone can see your posts and profile.
                  </div>
                </label>

                <label
                  className={[
                    "cursor-pointer rounded-lg px-3 py-3 transition",
                    mode === "private"
                      ? "bg-(--dk-sky)/18 ring-1 ring-(--dk-sky)/30"
                      : "hover:bg-(--dk-mist)/70",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="privacy"
                    value="private"
                    checked={mode === "private"}
                    onChange={() => setMode("private")}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        "h-2.5 w-2.5 rounded-full transition",
                        mode === "private"
                          ? "bg-(--dk-sky)"
                          : "bg-(--dk-ink)/25",
                      ].join(" ")}
                    />
                    <div className="text-sm font-semibold text-(--dk-ink)">
                      Private
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-(--dk-slate)">
                    Only approved followers can see your posts.
                  </div>
                </label>
              </div>
            </div>
          </section>

          <div className="px-4 pt-4 text-xs text-(--dk-slate) sm:px-5">
            Changing this setting will affect how others can view your profile
            and future posts.
          </div>

          <div className="px-4 pt-4 sm:px-5">
            <FormButton type="button" onClick={onSave} disabled={loading}>
            {loading ? <LoadingSpinner /> : "Save privacy"}
            </FormButton>
          </div>
        </div>
      </div>
    </main>
  )
}
