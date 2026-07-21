// components/common/DeleteEntityModal.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { Trash2 } from "lucide-react"
import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"
import { LoadingSpinner } from "@/components/common/LoadingIndicator"

type DeleteEntityModalProps = {
  open: boolean
  onClose: () => void
  onDeleted?: () => void

  entityLabel: string
  titleCase?: boolean // If true, first letter becomes Uppercase
  entityId: string //postId, noteId, commentId...
  buildPath: (args: { id: string }) => string // path to the api

  // Custom copy
  confirmTitle?: string
  confirmBody?: React.ReactNode
  confirmButtonText?: string
  successTitle?: string
  successBody?: React.ReactNode

  // optional if the server mess up
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

export default function DeleteEntityModal({
  open,
  onClose,
  onDeleted,

  entityLabel,
  titleCase = true,
  entityId,
  buildPath,

  confirmTitle,
  confirmBody,
  confirmButtonText,
  successTitle,
  successBody,

  parseErrorMessage,
}: DeleteEntityModalProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)

  const label = useMemo(() => {
    const base = String(entityLabel || "").trim() || "item"
    return titleCase ? base.toLowerCase() : base
  }, [entityLabel, titleCase])

  const labelTitle = useMemo(
    () => (titleCase ? toTitleCase(label) : label),
    [label, titleCase],
  )

  useEffect(() => {
    if (!open) return
    setError(null)
    setBusy(false)
  }, [open])

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    if (open) document.addEventListener("keydown", onEsc)
    return () => document.removeEventListener("keydown", onEsc)
  }, [open, onClose])

  async function confirmDelete() {
    if (busy) return
    setBusy(true)
    setError(null)

    try {
      const path = buildPath({ id: String(entityId) })
      const url = `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`

      const res = await apiFetch(url, {
        method: "DELETE",
        cache: "no-store",
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)

        const customMsg = parseErrorMessage?.(payload)
        const msg =
          customMsg ||
          payload?.message ||
          payload?.error ||
          `Request failed (${res.status})`

        // always throw a string message so React never tries to render an object
        throw new Error(JSON.stringify({ message: msg }))
      }

      onClose()
      setSuccessOpen(true)
      onDeleted?.()
    } catch (err: any) {
      setError(String(safeApiMessage(err)))
    } finally {
      setBusy(false)
    }
  }

  if (!open && !successOpen) return null

  const confirmTitleFinal = confirmTitle || `Delete ${label}`
  const confirmBodyFinal = confirmBody || (
    <p className="text-sm text-(--dk-slate)">
      Delete this {label} permanently?
      <br />
      This can’t be undone.
    </p>
  )

  const confirmButtonTextFinal = confirmButtonText || `Delete ${label}`

  const successTitleFinal = successTitle || `${labelTitle} deleted`
  const successBodyFinal = successBody || (
    <p className="text-sm text-(--dk-slate)">
      Your {label} was deleted successfully.
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
                  <Trash2 size={18} className="text-(--dk-error)" />
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

              {error ? (
                <div className="mt-2 text-sm text-(--dk-error)">{error}</div>
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
                  onClick={confirmDelete}
                  disabled={busy}
                  className="px-3 py-2 rounded-xl bg-(--dk-error) text-white text-sm hover:opacity-95 transition disabled:opacity-60"
                >
                  {busy ? <LoadingSpinner size={16} /> : confirmButtonTextFinal}
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
                <Trash2 size={18} className="text-(--dk-error)" />
                <h2 className="text-(--dk-ink) font-semibold">
                  {successTitleFinal}
                </h2>
              </div>

              {successBodyFinal}

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSuccessOpen(false)}
                  className="px-3 py-2 rounded-xl bg-(--dk-error) text-white text-sm hover:opacity-95 transition"
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
