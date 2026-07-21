"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Globe,
  Monitor,
  ShieldCheck,
  Smartphone,
  Tablet,
  Terminal,
  Trash2,
} from "lucide-react"

import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"
import FormAlert from "@/components/Form/FormAlert"
import { useSessions } from "@/hooks/useSessions"
import {
  CenteredSpinner,
  LoadingSpinner,
} from "@/components/common/LoadingIndicator"
import { LoadingRows } from "@/components/common/LoadingSkeleton"

function formatStamp(iso?: string) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function parseUserAgent(ua?: string) {
  const raw = ua || ""
  const lower = raw.toLowerCase()

  let os = ""
  if (lower.includes("iphone") || lower.includes("ipad")) os = "iOS"
  else if (lower.includes("mac os x") || lower.includes("macintosh"))
    os = "macOS"
  else if (lower.includes("windows nt")) os = "Windows"
  else if (lower.includes("android")) os = "Android"
  else if (lower.includes("linux")) os = "Linux"

  let browser = ""
  if (lower.includes("postman")) browser = "Postman"
  else if (lower.includes("edg/")) browser = "Edge"
  else if (lower.includes("chrome/")) browser = "Chrome"
  else if (lower.includes("safari/") && !lower.includes("chrome/"))
    browser = "Safari"
  else if (lower.includes("firefox/")) browser = "Firefox"

  let deviceType: "phone" | "tablet" | "desktop" | "unknown" = "unknown"
  if (
    lower.includes("iphone") ||
    (lower.includes("android") && lower.includes("mobile"))
  ) {
    deviceType = "phone"
  } else if (lower.includes("ipad") || lower.includes("tablet")) {
    deviceType = "tablet"
  } else if (lower) {
    deviceType = "desktop"
  }

  const label =
    browser && os ? `${browser} on ${os}` : browser || os || "Unknown device"

  return { label, deviceType, browser, os }
}

function deviceIcon(deviceType: string, browser: string) {
  if (browser === "Postman") return <Terminal size={16} />
  if (deviceType === "phone") return <Smartphone size={16} />
  if (deviceType === "tablet") return <Tablet size={16} />
  if (deviceType === "desktop") return <Monitor size={16} />
  return <Globe size={16} />
}

type TrustedDevice = {
  id: string
  label?: string
  ip?: string
  userAgent?: string
  lastUsedAt?: string
  expiresAt?: string
}

function TrustedDevicesSection() {
  const [items, setItems] = useState<TrustedDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await apiFetch(`${API_URL}/sessions/trusted`)
      if (!res.ok) throw new Error("Failed to load trusted devices")
      const data = await res.json()
      setItems(Array.isArray(data?.data) ? data.data : [])
      setError(null)
    } catch (e: any) {
      setError(e?.message || "Failed to load trusted devices")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function revoke(id: string) {
    if (busyId) return
    setBusyId(id)
    setError(null)
    try {
      const res = await apiFetch(`${API_URL}/sessions/trusted/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to remove trusted device")
      setItems((prev) => prev.filter((d) => d.id !== id))
    } catch (e: any) {
      setError(e?.message || "Failed to remove trusted device")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="border-t border-(--dk-ink)/10 mt-2">
      <div className="px-4 py-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-(--dk-ink)" />
          <div className="text-sm font-semibold text-(--dk-ink)">
            Trusted devices
          </div>
        </div>
        <div className="text-xs text-(--dk-slate) mt-0.5">
          These devices skip two-factor at login. Remove any you don’t
          recognize — it will be asked for a code next time.
        </div>
      </div>

      {error ? (
        <div className="px-4 pb-3">
          <FormAlert>{error}</FormAlert>
        </div>
      ) : null}

      <div className="border-t border-(--dk-ink)/10">
        {loading ? (
          <LoadingRows rows={3} />
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-sm text-(--dk-slate)">
            No trusted devices.
          </div>
        ) : (
          <div className="divide-y divide-(--dk-ink)/10">
            {items.map((d) => {
              const parsed = parseUserAgent(d.userAgent)
              return (
                <div key={d.id} className="px-4 py-4 flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-(--dk-sky)/15 text-(--dk-ink) flex items-center justify-center">
                    {deviceIcon(parsed.deviceType, parsed.browser)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-(--dk-ink)">
                      {d.label || parsed.label}
                    </div>
                    <div className="text-xs text-(--dk-slate)">
                      {d.ip || "Unknown IP"} • Last used{" "}
                      {formatStamp(d.lastUsedAt)}
                    </div>
                    <div className="text-xs text-(--dk-slate)">
                      Trusted until {formatStamp(d.expiresAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => revoke(d.id)}
                    disabled={busyId === d.id}
                    className="text-xs text-(--dk-sky) hover:text-(--dk-ink) transition disabled:opacity-60"
                  >
                    {busyId === d.id ? <LoadingSpinner size={14} /> : "Remove"}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export default function DevicesPage() {
  const router = useRouter()
  const {
    items,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    reload,
    totalCount,
  } = useSessions()

  const [busyId, setBusyId] = useState<string | null>(null)
  const [revokeAllLoading, setRevokeAllLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        if (hasMore && !loadingMore) loadMore()
      },
      { rootMargin: "600px" }
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loadingMore, loadMore])

  async function revokeSession(id: string) {
    if (busyId || revokeAllLoading) return
    setBusyId(id)
    setActionError(null)

    try {
      const res = await apiFetch(`${API_URL}/sessions/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || "Failed to revoke session")
      }
      reload()
    } catch (e: any) {
      setActionError(e?.message || "Failed to revoke session")
    } finally {
      setBusyId(null)
    }
  }

  async function revokeAll() {
    if (revokeAllLoading || busyId) return
    setRevokeAllLoading(true)
    setActionError(null)

    try {
      const res = await apiFetch(`${API_URL}/sessions`, { method: "DELETE" })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || "Failed to revoke sessions")
      }

      await fetch("/api/auth/logout", { method: "POST" })
      window.location.href = "/login"
    } catch (e: any) {
      setActionError(e?.message || "Failed to revoke sessions")
      setRevokeAllLoading(false)
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
                Devices
              </div>
              <div className="text-xs text-(--dk-slate)">
                {totalCount} active sessions
              </div>
            </div>
          </div>
        </div>

        <div className="pb-8">
          <div className="px-4 pt-6">
            {error ? <FormAlert>{error}</FormAlert> : null}
            {actionError ? <FormAlert>{actionError}</FormAlert> : null}
          </div>

          <section className="border-t border-(--dk-ink)/10">
            <div className="px-4 py-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-(--dk-ink)">
                  Active sessions
                </div>
                <div className="text-xs text-(--dk-slate)">
                  Revoke any session you don’t recognize.
                </div>
              </div>
              <button
                type="button"
                onClick={revokeAll}
                disabled={revokeAllLoading || !!busyId}
                className="inline-flex items-center gap-2 rounded-xl border border-(--dk-error)/30 px-3 py-2 text-xs text-(--dk-error) bg-(--dk-error)/8 hover:bg-(--dk-error)/15 transition disabled:opacity-60"
              >
                <Trash2 size={14} />
                {revokeAllLoading ? <LoadingSpinner size={14} /> : "Revoke all"}
              </button>
            </div>

            <div className="border-t border-(--dk-ink)/10">
              {loading ? (
                <LoadingRows rows={4} />
              ) : items.length === 0 ? (
                <div className="px-4 py-6 text-sm text-(--dk-slate)">
                  No sessions found.
                </div>
              ) : (
                <div className="divide-y divide-(--dk-ink)/10">
                  {items.map((session) => {
                    const parsed = parseUserAgent(session.userAgent)
                    return (
                      <div key={session.id} className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-xl bg-(--dk-sky)/15 text-(--dk-ink) flex items-center justify-center">
                            {deviceIcon(parsed.deviceType, parsed.browser)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-(--dk-ink)">
                              {parsed.label}
                            </div>
                            <div className="text-xs text-(--dk-slate)">
                              {session.ip || "Unknown IP"} • Created{" "}
                              {formatStamp(session.createdAt)}
                            </div>
                            <div className="text-xs text-(--dk-slate)">
                              Expires {formatStamp(session.expiresAt)}
                            </div>
                            {session.userAgent ? (
                              <div className="text-[11px] text-(--dk-slate)/80 mt-1 truncate">
                                {session.userAgent}
                              </div>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => revokeSession(session.id)}
                            disabled={busyId === session.id || revokeAllLoading}
                            className="text-xs text-(--dk-sky) hover:text-(--dk-ink) transition disabled:opacity-60"
                          >
                            {busyId === session.id ? <LoadingSpinner size={14} /> : "Revoke"}
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {loadingMore ? (
                    <CenteredSpinner className="px-4 py-4" />
                  ) : null}
                </div>
              )}
            </div>
          </section>

          {!loading && !loadingMore && !hasMore && items.length > 0 ? (
            <div className="text-xs text-(--dk-slate) text-center">
              You’re all caught up.
            </div>
          ) : null}

          <TrustedDevicesSection />

          <div ref={sentinelRef} className="h-1" />
        </div>
      </div>
    </main>
  )
}
