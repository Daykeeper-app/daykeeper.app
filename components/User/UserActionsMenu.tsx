"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { MoreVertical, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"

import BlockUserModal from "@/components/common/BlockUserModal"
import ReportEntityModal from "@/components/common/ReportEntityModal"

export default function UserActionsMenu({
  name,
  disabled,
  initialInCloseFriends,
  userKey,
  isSelf = false,
}: {
  name: string
  userKey: string
  disabled?: boolean
  initialInCloseFriends: boolean
  isSelf?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selfOpen, setSelfOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const [isInCloseFriends, setIsInCloseFriends] = useState(
    initialInCloseFriends,
  )

  const [reportOpen, setReportOpen] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)

  const ref = useRef<HTMLDivElement | null>(null)

  // sync when profile changes
  useEffect(() => {
    setIsInCloseFriends(initialInCloseFriends)
    setOpen(false)
    setSelfOpen(false)
    setReportOpen(false)
    setBlockOpen(false)
  }, [userKey, initialInCloseFriends])

  // click outside + esc closes the dropdown
  useEffect(() => {
    if (!open) return

    const onMouseDown = (e: MouseEvent) => {
      const el = ref.current
      if (!el) return
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false)
    }

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", onMouseDown)
    document.addEventListener("keydown", onEsc)

    return () => {
      document.removeEventListener("mousedown", onMouseDown)
      document.removeEventListener("keydown", onEsc)
    }
  }, [open])

  const closeFriendsUrl = useMemo(() => {
    if (!name) return ""
    return `${API_URL}/close_friends/${encodeURIComponent(name)}`
  }, [name])

  async function toggleCloseFriends() {
    if (busy || disabled || !closeFriendsUrl) return

    const prev = isInCloseFriends
    const next = !prev

    setIsInCloseFriends(next)

    setBusy(true)
    try {
      const res = await apiFetch(closeFriendsUrl, { method: "POST" })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Request failed (${res.status})`)
      }
      const data = await res.json().catch(() => null)
      console.log("close_friends response", {
        username: name,
        status: res.status,
        data,
      })
    } catch {
      setIsInCloseFriends(prev)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (isSelf) {
            setSelfOpen((v) => !v)
            return
          }
          if (!disabled) setOpen((v) => !v)
        }}
        disabled={disabled && !isSelf}
        aria-label="More actions"
        className="h-10 w-10 inline-flex items-center justify-center rounded-xl bg-(--dk-paper) hover:bg-(--dk-mist)/40 transition disabled:opacity-60 cursor-pointer"
      >
        <MoreVertical size={18} className="text-(--dk-slate)" />
      </button>

      {/* Self modal */}
      {isSelf && selfOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            onClick={() => setSelfOpen(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-56 rounded-2xl border border-(--dk-ink)/10 bg-(--dk-paper) shadow-xl overflow-hidden">
            <button
              type="button"
              onClick={() => { setSelfOpen(false); router.push("/settings") }}
              className="w-full px-4 py-4 text-left text-sm font-medium flex items-center gap-3 hover:bg-(--dk-mist)/60 transition text-(--dk-ink)"
            >
              <Settings size={16} className="text-(--dk-slate)" />
              Settings
            </button>
          </div>
        </>
      )}

      {!isSelf && open ? (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) shadow-lg overflow-hidden z-9999">
          <button
            type="button"
            disabled={busy || disabled}
            onClick={toggleCloseFriends}
            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-(--dk-ink)/5 transition text-(--dk-ink)"
          >
            {isInCloseFriends
              ? "Remove from Close Friends"
              : "Add to Close Friends"}
          </button>

          <div className="h-px bg-(--dk-ink)/10" />

          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setOpen(false)
              setReportOpen(true)
            }}
            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-(--dk-ink)/5 transition text-(--dk-ink)"
          >
            Report user
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setOpen(false)
              setBlockOpen(true)
            }}
            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-(--dk-error)/10 transition text-(--dk-error)"
          >
            Block user
          </button>
        </div>
      ) : null}

      <ReportEntityModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        entityLabel="user"
        entityId={String(name)}
        buildPath={({ id }) => `/user/${encodeURIComponent(id)}/report`}
        reasons={[
          { value: "spam", label: "Spam", hint: "Fake accounts or promotions" },
          {
            value: "impersonation",
            label: "Impersonation",
            hint: "Pretending to be someone else",
          },
          {
            value: "harassment",
            label: "Harassment or bullying",
            hint: "Threats, targeting, insults",
          },
          {
            value: "hate",
            label: "Hate speech",
            hint: "Attacks based on identity",
          },
          {
            value: "inappropriate",
            label: "Inappropriate content",
            hint: "Content that violates guidelines",
          },
          { value: "other", label: "Other", hint: "Doesn’t fit above" },
        ]}
        defaultReason="spam"
      />

      <BlockUserModal
        username={String(name)}
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
      />
    </div>
  )
}
