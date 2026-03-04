// components/common/ReportEntityModal.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { Flag } from "lucide-react"
import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"

type ReportEntityModalProps = {
  open: boolean
  onClose: () => void
  onReported?: () => void

  entityLabel: string // "post" | "comment" | "user" | etc
  titleCase?: boolean
  entityId: string

  // Build API path (no API_URL prefix). Example:
  // ({ id }) => `/post/${encodeURIComponent(id)}/report`
  buildPath: (args: { id: string }) => string

  // Options (radio list)
  reasons?: { value: string; label: string; hint?: string }[]
  defaultReason?: string

  // Copy overrides
  confirmTitle?: string
  confirmBody?: React.ReactNode
  submitButtonText?: string
  successTitle?: string
  successBody?: React.ReactNode

  // optional if server messes up
  parseErrorMessage?: (payload: any) => string | null
}

function toTitleCase(s: string) {
  const t = String(s || "").trim()
  if (!t) return ""
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function safeApiMessage(err: any) {
  try {
    const parsed = JSON.parse(err?.message)
    const msg = parsed?.message

    if (typeof msg === "string") return msg

    if (msg && typeof msg === "object") {
      if (typeof msg.message === "string") return msg.message
      return JSON.stringify(msg)
    }

    return "Something went wrong."
  } catch {
    return err?.message ? String(err.message) : "Something went wrong."
  }
}

const DEFAULT_REASONS = [
  { value: "spam", label: "Spam", hint: "Scams, fake links, repeated ads" },
  {
    value: "harassment",
    label: "Harassment or Bullying",
    hint: "Threats, targeting, insults",
  },
  {
    value: "inappropriate",
    label: "Inappropriate Content",
    hint: "Explicit sexual, ilegal or violent",
  },
  {
    value: "misinfo",
    label: "Misinformation",
    hint: "Deceptive or false claims",
  },
  {
    value: "other",
    label: "Other",
    hint: "Doesn’t fit above categories",
  },
] as const

export default function ReportEntityModal({
  open,
  onClose,
  onReported,

  entityLabel,
  titleCase = true,
  entityId,
  buildPath,

  reasons,
  defaultReason,

  confirmTitle,
  confirmBody,
  submitButtonText,
  successTitle,
  successBody,

  parseErrorMessage,
}: ReportEntityModalProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)

  const opts = useMemo(() => {
    const list =
      Array.isArray(reasons) && reasons.length ? reasons : DEFAULT_REASONS
    return list
  }, [reasons])

  const label = useMemo(() => {
    const base = String(entityLabel || "").trim() || "item"
    return titleCase ? base.toLowerCase() : base
  }, [entityLabel, titleCase])

  const labelTitle = useMemo(
    () => (titleCase ? toTitleCase(label) : label),
    [label, titleCase],
  )

  const [selected, setSelected] = useState<string>(
    defaultReason || opts[0]?.value || "spam",
  )

  useEffect(() => {
    if (!open) return
    setError(null)
    setBusy(false)

    const first = defaultReason || opts[0]?.value || "spam"
    setSelected(first)
  }, [open, defaultReason, opts])

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    if (open) document.addEventListener("keydown", onEsc)
    return () => document.removeEventListener("keydown", onEsc)
  }, [open, onClose])

  async function submitReport() {
    if (busy) return
    setBusy(true)
    setError(null)

    try {
      const path = buildPath({ id: String(entityId) })
      const url = `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`

      const res = await apiFetch(url, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: selected }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)

        const customMsg = parseErrorMessage?.(payload)
        const msg =
          customMsg ||
          payload?.message ||
          payload?.error ||
          `Request failed (${res.status})`

        throw new Error(JSON.stringify({ message: msg }))
      }

      onClose()
      setSuccessOpen(true)
      onReported?.()
    } catch (err: any) {
      setError(String(safeApiMessage(err)))
    } finally {
      setBusy(false)
    }
  }

  if (!open && !successOpen) return null

  const confirmTitleFinal = confirmTitle || `Report ${label}`
  const confirmBodyFinal = confirmBody || (
    <p className="text-sm text-(--dk-slate)">
      Select a reason for reporting this {label}. This helps us review it
      faster.
    </p>
  )

  const submitButtonTextFinal = submitButtonText || "Submit report"

  const successTitleFinal = successTitle || "Report submitted"
  const successBodyFinal = successBody || (
    <p className="text-sm text-(--dk-slate)">
      Report submitted successfully. Thanks for helping keep DayKeeper safe.
    </p>
  )

  return (
    <>
      {/* CONFIRM MODAL */}
      {open ? (
        <div className="fixed inset-0 z-50" onClick={onClose}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 min-h-full flex items-center justify-center p-4">
            <div
              className="w-full max-w-md rounded-2xl bg-(--dk-paper) border border-(--dk-ink)/10 shadow-xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Flag size={18} className="text-(--dk-sky)" />
                  <h2 className="text-(--dk-ink) font-semibold">
                    {confirmTitleFinal}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-2 py-1 rounded-lg hover:bg-(--dk-ink)/5 text-(--dk-slate) hover:text-(--dk-ink) transition"
                >
                  ✕
                </button>
              </div>

              {confirmBodyFinal}

              <div className="mt-3 space-y-2">
                {opts.map((r) => {
                  const active = selected === r.value
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => {
                        if (busy) return
                        setSelected(r.value)
                      }}
                      className={[
                        "w-full text-left rounded-xl border px-3 py-2 transition",
                        active
                          ? "border-(--dk-sky)/35 bg-(--dk-sky)/10"
                          : "border-(--dk-ink)/10 hover:bg-(--dk-ink)/5",
                      ].join(" ")}
                      aria-pressed={active}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-(--dk-ink)">
                            {r.label}
                          </div>
                          {r.hint ? (
                            <div className="text-xs text-(--dk-slate) mt-0.5">
                              {r.hint}
                            </div>
                          ) : null}
                        </div>

                        <div
                          className={[
                            "h-5 w-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                            active
                              ? "border-(--dk-sky) bg-(--dk-sky)/15"
                              : "border-(--dk-ink)/15",
                          ].join(" ")}
                        >
                          {active ? (
                            <div className="h-2.5 w-2.5 rounded-full bg-(--dk-sky)" />
                          ) : null}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {error ? (
                <div className="mt-2 text-sm text-red-600">{error}</div>
              ) : null}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="px-3 py-2 rounded-xl border border-(--dk-ink)/10 hover:bg-(--dk-ink)/5 text-sm transition disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={submitReport}
                  disabled={busy || !selected}
                  className="px-3 py-2 rounded-xl bg-(--dk-sky) text-white text-sm hover:opacity-95 transition disabled:opacity-60"
                >
                  {busy ? "Sending..." : submitButtonTextFinal}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* SUCCESS MODAL */}
      {successOpen ? (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setSuccessOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 min-h-full flex items-center justify-center p-4">
            <div
              className="w-full max-w-sm rounded-2xl bg-(--dk-paper) border border-(--dk-ink)/10 shadow-xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-2">
                <Flag size={18} className="text-(--dk-sky)" />
                <h2 className="text-(--dk-ink) font-semibold">
                  {successTitleFinal}
                </h2>
              </div>

              {successBodyFinal}

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSuccessOpen(false)}
                  className="px-3 py-2 rounded-xl bg-(--dk-sky) text-white text-sm hover:opacity-95 transition"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
