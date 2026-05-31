"use client"

import { useEffect, useState } from "react"
import { Ban } from "lucide-react"
import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"

type Props = {
  username: string
  open: boolean
  onClose: () => void
}

function safeApiMessage(err: any) {
  try {
    return JSON.parse(err?.message).message || "Something went wrong."
  } catch {
    return "Something went wrong."
  }
}

export default function BlockUserModal({ username, open, onClose }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)

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

  async function confirmBlock() {
    if (busy) return
    setBusy(true)
    setError(null)

    try {
      const res = await apiFetch(
        `${API_URL}/${encodeURIComponent(username)}/block`,
        {
          method: "POST",
          cache: "no-store",
        }
      )

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(
          text || JSON.stringify({ message: `Request failed (${res.status})` })
        )
      }

      onClose()
      setSuccessOpen(true)
    } catch (err: any) {
      setError(safeApiMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (!open && !successOpen) return null

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
                  <Ban size={18} className="text-(--dk-error)" />
                  <h2 className="text-(--dk-ink) font-semibold">Block user</h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-2 py-1 rounded-lg hover:bg-(--dk-ink)/5 text-(--dk-slate) hover:text-(--dk-ink) transition"
                >
                  ✕
                </button>
              </div>

              <p className="text-sm text-(--dk-slate)">
                Block{" "}
                <span className="font-medium text-(--dk-ink)">@{username}</span>
                ?
                <br />
                You won’t see their posts anymore, and they won’t be able to
                interact with you.
              </p>

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
                  onClick={confirmBlock}
                  disabled={busy}
                  className="px-3 py-2 rounded-xl text-white text-sm hover:opacity-95 transition disabled:opacity-60"
                  style={{ background: "var(--dk-error)" }}
                >
                  {busy ? "Blocking..." : "Block user"}
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
                <Ban size={18} className="text-(--dk-error)" />
                <h2 className="text-(--dk-ink) font-semibold">User blocked</h2>
              </div>

              <p className="text-sm text-(--dk-slate)">
                @{username} was blocked successfully.
              </p>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSuccessOpen(false)}
                  className="px-3 py-2 rounded-xl text-white text-sm hover:opacity-95 transition"
                  style={{ background: "var(--dk-error)" }}
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
