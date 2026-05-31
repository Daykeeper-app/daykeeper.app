"use client"

import Link from "next/link"
import { Search, Bell, ChevronRight, EyeOff, BookOpen } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useNotifications } from "@/hooks/useNotifications"

const FOOTER_LINKS = [
  { label: "About", href: "https://about.daykeeper.app" },
  { label: "Status", href: "https://about.daykeeper.app/status" },
  { label: "Terms", href: "https://about.daykeeper.app/terms" },
  { label: "Privacy", href: "https://about.daykeeper.app/privacy" },
  { label: "License", href: "https://about.daykeeper.app/license" },
  { label: "API Docs", href: "https://docs.daykeeper.app" },
  { label: "Instagram", href: "https://instagram.com/daykeeperapp" },
  { label: "Contact", href: "mailto:contact@daykeeper.app" },
  { label: "API Repo", href: "https://github.com/luciano655dev/daykeeper-api" },
  { label: "App Repo", href: "https://github.com/luciano655dev/daykeeper.app" },
  { label: "About Repo", href: "https://github.com/luciano655dev/about.daykeeper.app" },
  { label: "Docs Repo", href: "https://github.com/luciano655dev/docs.daykeeper.app" },
] as const

type NotificationRouteSource = {
  route?: string
  data?: {
    route?: string
  }
}

function cleanText(v?: string) {
  if (!v) return ""
  return String(v)
    .replace(/â€¯/g, " ")
    .replace(/â€¢/g, "•")
    .replace(/â€"/g, "–")
    .replace(/\s+/g, " ")
    .trim()
}

function stableKey(id: unknown, index: number, extra?: unknown) {
  if (typeof id === "string" || typeof id === "number") return String(id)
  if (id && typeof id === "object") {
    const oid = (id as { $oid?: unknown }).$oid
    if (typeof oid === "string" || typeof oid === "number") return String(oid)
  }
  const ex = typeof extra === "string" || typeof extra === "number" ? String(extra) : "x"
  return `${ex}-${index}`
}

function extractRoute(n: NotificationRouteSource): string {
  const direct = typeof n?.route === "string" ? n.route.trim() : ""
  if (direct) return direct
  const nested = typeof n?.data?.route === "string" ? n.data.route.trim() : ""
  return nested
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
}

export default function RightPanel() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { items: visibleNotifications, loading } = useNotifications("without-media-review")
  const visibleUnreadCount = useMemo(
    () => visibleNotifications.reduce((acc, n) => acc + (n.read ? 0 : 1), 0),
    [visibleNotifications]
  )
  const topNotifications = useMemo(
    () => visibleNotifications.slice(0, 3),
    [visibleNotifications]
  )
  const newNotifications = useMemo(
    () => visibleNotifications.filter((n) => !n.read).slice(0, 3),
    [visibleNotifications]
  )
  const today = useMemo(() => new Date(), [])

  const [hideNotifications, setHideNotifications] = useState(() => {
    if (typeof window === "undefined") return false
    try {
      return localStorage.getItem("dk-hide-notifications") === "1"
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem("dk-hide-notifications", hideNotifications ? "1" : "0")
    } catch {}
  }, [hideNotifications])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (!q) return
    debounceRef.current = setTimeout(() => {
      router.push(`/search?q=${encodeURIComponent(q)}`)
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, router])

  return (
    <aside className="fixed right-0 top-0 hidden h-screen w-80 overflow-y-auto bg-(--dk-paper) p-4 lg:block">
      <div className="space-y-5 pb-6">
        {/* Search */}
        <div className="flex items-center gap-2.5 rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) px-3 py-2.5">
          <Search size={17} className="text-(--dk-sky)" />
          <input
            type="text"
            placeholder="Search Daykeeper"
            className="bg-transparent outline-none text-sm text-(--dk-ink) placeholder:text-(--dk-slate) flex-1"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return
              const q = query.trim()
              if (!q) return
              router.push(`/search?q=${encodeURIComponent(q)}`)
            }}
          />
        </div>

        {/* Today */}
        <div>
          <p className="px-1 mb-2 text-[11px] font-semibold uppercase tracking-widest text-(--dk-slate)/60">
            Today
          </p>
          <p className="px-1 mb-3 text-sm text-(--dk-slate)">{formatDate(today)}</p>
          <div className="space-y-0.5">
            <button
              onClick={() => router.push("/day")}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition hover:bg-(--dk-mist)/40"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-(--dk-mist)/55 text-(--dk-sky)">
                <BookOpen size={14} />
              </span>
              <span className="text-sm font-medium text-(--dk-ink)">Write in your Day</span>
            </button>
          </div>
        </div>

        <div className="h-px bg-(--dk-ink)/8" />

        {/* New notifications */}
        {!hideNotifications && visibleUnreadCount > 0 ? (
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-(--dk-slate)/60">
                New
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push("/notifications")}
                  className="text-xs text-(--dk-sky) hover:text-(--dk-ink) transition"
                >
                  View all
                </button>
                <button
                  type="button"
                  onClick={() => setHideNotifications(true)}
                  className="p-1 rounded-md text-(--dk-slate) hover:text-(--dk-ink) hover:bg-(--dk-mist) transition"
                  aria-label="Hide notifications"
                >
                  <EyeOff size={13} />
                </button>
              </div>
            </div>

            <div className="space-y-0.5">
              {newNotifications.map((n, idx) => (
                <div
                  key={stableKey(n._id, idx, n.created_at)}
                  className={[
                    "flex items-start gap-2.5 rounded-lg px-3 py-2.5",
                    extractRoute(n)
                      ? "cursor-pointer transition hover:bg-(--dk-mist)/40"
                      : "",
                  ].join(" ")}
                  onClick={() => {
                    const route = extractRoute(n)
                    if (!route) return
                    router.push(route)
                  }}
                >
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-(--dk-mist)/55 text-(--dk-sky)">
                    <Bell size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-(--dk-ink)">
                      {cleanText(n.title) || "Notification"}
                    </div>
                    {n.body ? (
                      <div className="line-clamp-2 text-xs text-(--dk-slate)">
                        {cleanText(n.body)}
                      </div>
                    ) : null}
                  </div>
                  {extractRoute(n) ? (
                    <span className="mt-0.5 shrink-0 text-(--dk-slate)/50">
                      <ChevronRight size={13} />
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Recent notifications */}
        {!hideNotifications ? (
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-(--dk-slate)/60">
                Notifications
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push("/notifications")}
                  className="text-xs text-(--dk-sky) hover:text-(--dk-ink) transition"
                >
                  View all
                </button>
                <button
                  type="button"
                  onClick={() => setHideNotifications(true)}
                  className="p-1 rounded-md text-(--dk-slate) hover:text-(--dk-ink) hover:bg-(--dk-mist) transition"
                  aria-label="Hide notifications"
                >
                  <EyeOff size={13} />
                </button>
              </div>
            </div>

            {loading ? (
              <p className="px-3 py-2 text-sm text-(--dk-slate)">Loading…</p>
            ) : topNotifications.length === 0 ? (
              <p className="px-3 py-2 text-sm text-(--dk-slate)">No notifications yet.</p>
            ) : (
              <div className="space-y-0.5">
                {topNotifications.map((n, idx) => (
                  <div
                    key={stableKey(n._id, idx, n.created_at)}
                    className={[
                      "flex items-start gap-2.5 rounded-lg px-3 py-2.5",
                      extractRoute(n)
                        ? "cursor-pointer transition hover:bg-(--dk-mist)/40"
                        : "",
                    ].join(" ")}
                    onClick={() => {
                      const route = extractRoute(n)
                      if (!route) return
                      router.push(route)
                    }}
                  >
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-(--dk-mist)/55 text-(--dk-sky)">
                      <Bell size={13} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-(--dk-ink)">
                        {cleanText(n.title) || "Notification"}
                      </div>
                      {n.body ? (
                        <div className="line-clamp-2 text-xs text-(--dk-slate)">
                          {cleanText(n.body)}
                        </div>
                      ) : null}
                    </div>
                    {extractRoute(n) ? (
                      <span className="mt-0.5 shrink-0 text-(--dk-slate)/50">
                        <ChevronRight size={13} />
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setHideNotifications(false)}
            className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-(--dk-slate) transition hover:bg-(--dk-mist)/40 hover:text-(--dk-ink)"
          >
            Show notifications
          </button>
        )}

        <div className="h-px bg-(--dk-ink)/8" />

        <footer className="px-1 text-xs leading-6 text-(--dk-slate)">
          <div className="flex flex-wrap">
            {FOOTER_LINKS.map((link, index) => (
              <span key={link.href}>
                <Link
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-(--dk-ink)"
                >
                  {link.label}
                </Link>
                {index < FOOTER_LINKS.length - 1 ? (
                  <span className="px-1.5 text-(--dk-slate)/70">·</span>
                ) : null}
              </span>
            ))}
          </div>

          <div className="mt-4 uppercase tracking-[0.16em] text-(--dk-slate)/60">
            © 2026 Daykeeper
          </div>
        </footer>
      </div>
    </aside>
  )
}
