"use client"

import { Search, Bell, Plus, CalendarDays, CheckSquare2, EyeOff } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useNotifications } from "@/hooks/useNotifications"

const QUICK_ACTIONS = [
  { label: "Post", icon: Plus, href: "/post/create" },
  { label: "Event", icon: CalendarDays, href: "/day/events/create" },
  { label: "Task", icon: CheckSquare2, href: "/day/tasks/create" },
] as const

function cleanText(v?: string) {
  if (!v) return ""
  return String(v)
    .replace(/â€¯/g, " ")
    .replace(/â€¢/g, "•")
    .replace(/â€“/g, "–")
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

export default function RightPanel() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const debounceRef = useRef<any>(null)
  const { items, loading, unreadCount } = useNotifications()

  const topNotifications = useMemo(() => items.slice(0, 3), [items])
  const newNotifications = useMemo(
    () => items.filter((n) => !n.read).slice(0, 3),
    [items]
  )
  const todayParam = useMemo(() => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  }, [])
  const [hideNotifications, setHideNotifications] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("dk-hide-notifications")
      if (raw === "1") setHideNotifications(true)
    } catch {}
  }, [])

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
      <div className="space-y-3 pb-6">
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

        {/* Quick create */}
        <div className="overflow-hidden rounded-xl bg-(--dk-paper)">
          <div className="border-b border-(--dk-ink)/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-(--dk-ink)">Quick create</h2>
          </div>

          <div className="space-y-1 p-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon
              const href =
                action.href === "/post/create"
                  ? action.href
                  : `${action.href}?date=${todayParam}`
              return (
                <button
                  key={action.label}
                  onClick={() => router.push(href)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition hover:bg-(--dk-mist)/40"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-(--dk-mist)/55 text-(--dk-sky)">
                    <Icon size={14} />
                  </span>
                  <span className="text-sm font-medium text-(--dk-ink)">
                    {action.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* New notifications */}
        {!hideNotifications && unreadCount > 0 ? (
          <div className="overflow-hidden rounded-xl bg-(--dk-paper)">
            <div className="flex items-center justify-between border-b border-(--dk-ink)/10 px-4 py-3">
              <h2 className="text-sm font-semibold text-(--dk-ink)">New</h2>
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
                  <EyeOff size={14} />
                </button>
              </div>
            </div>

            <div className="divide-y divide-(--dk-ink)/10">
              {newNotifications.map((n, idx) => (
                <div key={stableKey(n._id, idx, n.created_at)} className="px-4 py-3 transition hover:bg-(--dk-mist)/28">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-(--dk-mist)/65 text-(--dk-sky)">
                      <Bell size={14} />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-(--dk-ink)">
                        {cleanText(n.title) || "Notification"}
                      </div>
                      {n.body ? (
                        <div className="line-clamp-2 text-xs text-(--dk-slate)">
                          {cleanText(n.body)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Recent notifications */}
        {!hideNotifications ? (
          <div className="overflow-hidden rounded-xl bg-(--dk-paper)">
            <div className="flex items-center justify-between border-b border-(--dk-ink)/10 px-4 py-3">
              <h2 className="text-sm font-semibold text-(--dk-ink)">
                Notifications
              </h2>
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
                  <EyeOff size={14} />
                </button>
              </div>
            </div>

          {loading ? (
            <div className="px-4 py-4 text-sm text-(--dk-slate)">
              Loading notifications...
            </div>
          ) : topNotifications.length === 0 ? (
            <div className="px-4 py-4 text-sm text-(--dk-slate)">
              No notifications yet.
            </div>
          ) : (
            <div className="divide-y divide-(--dk-ink)/10">
              {topNotifications.map((n, idx) => (
                <div key={stableKey(n._id, idx, n.created_at)} className="px-4 py-3 transition hover:bg-(--dk-mist)/28">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-(--dk-mist)/70 text-(--dk-sky)">
                      <Bell size={14} className="flex-none" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-(--dk-ink) truncate">
                        {cleanText(n.title) || "Notification"}
                      </div>
                      {n.body ? (
                        <div className="line-clamp-2 text-xs text-(--dk-slate)">
                          {cleanText(n.body)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        ) : (
          <button
            type="button"
            onClick={() => setHideNotifications(false)}
            className="w-full rounded-xl bg-(--dk-paper) px-4 py-3 text-left text-sm text-(--dk-slate) transition hover:bg-(--dk-mist)/28 hover:text-(--dk-ink)"
          >
            Show notifications
          </button>
        )}
      </div>
    </aside>
  )
}
