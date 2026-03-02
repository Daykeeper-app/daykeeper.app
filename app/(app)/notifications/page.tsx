"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, UserPlus } from "lucide-react"
import NotificationsList from "@/components/Notifications/NotificationsList"
import { useNotifications } from "@/hooks/useNotifications"
import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"

export default function NotificationsPage() {
  const router = useRouter()
  const [isPrivate, setIsPrivate] = useState(false)
  const {
    items,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    reload,
    markRead,
    totalCount,
    unreadCount,
  } = useNotifications()

  useEffect(() => {
    let alive = true

    async function loadPrivacy() {
      try {
        const res = await apiFetch(`${API_URL}/auth/user`, { method: "GET" })
        if (!res.ok) return
        const json = await res.json().catch(() => null)
        const next = !!json?.user?.private
        if (alive) setIsPrivate(next)
      } catch {}
    }

    loadPrivacy()
    return () => {
      alive = false
    }
  }, [])

  const displayUnreadCount = unreadCount

  const unreadIds = useMemo(
    () => items.filter((it) => !it.read).map((it) => it._id),
    [items]
  )

  useEffect(() => {
    if (!unreadIds.length) return
    markRead(unreadIds)
  }, [markRead, unreadIds])

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
                Notifications
              </div>
              <div className="text-xs text-(--dk-slate)">
                {displayUnreadCount
                  ? `${displayUnreadCount} unread`
                  : "All caught up"} • {totalCount} total
              </div>
            </div>

            {isPrivate ? (
              <button
                type="button"
                onClick={() => router.push("/settings/follow-requests")}
                className="ml-auto inline-flex items-center gap-2 rounded-lg bg-(--dk-mist)/80 px-3 py-2 text-xs font-medium text-(--dk-ink) transition hover:bg-(--dk-sky)/18"
              >
                <UserPlus size={14} />
                Follow requests
              </button>
            ) : null}
          </div>
        </div>

        <NotificationsList
          items={items}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          error={error}
          onLoadMore={loadMore}
          onRetry={reload}
          sessionNewIds={new Set(unreadIds)}
        />
      </div>
    </main>
  )
}
