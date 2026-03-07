"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import NotificationsList from "@/components/Notifications/NotificationsList"
import {
  isMediaReviewNotification,
  useNotifications,
} from "@/hooks/useNotifications"

function toStableId(id: unknown): string {
  if (typeof id === "string" || typeof id === "number") return String(id)
  if (id && typeof id === "object") {
    const oid = (id as { $oid?: unknown }).$oid
    if (typeof oid === "string" || typeof oid === "number") return String(oid)
  }
  return ""
}

export default function MediaReviewsNotificationsPage() {
  const router = useRouter()
  const {
    items,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    reload,
    markRead,
  } = useNotifications("media-review")

  const mediaItems = useMemo(
    () => items.filter((it) => isMediaReviewNotification(it)),
    [items]
  )

  const unreadIds = useMemo(
    () =>
      mediaItems
        .filter((it) => !it.read)
        .map((it) => toStableId(it._id))
        .filter(Boolean),
    [mediaItems]
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
              onClick={() => router.push("/notifications")}
              className="rounded-lg p-2 transition hover:bg-(--dk-mist)/75"
              aria-label="Back"
            >
              <ArrowLeft size={18} className="text-(--dk-ink)" />
            </button>

            <div className="leading-tight">
              <div className="text-sm font-semibold text-(--dk-ink)">
                Media reviews
              </div>
              <div className="text-xs text-(--dk-slate)">
                {mediaItems.length} total
              </div>
            </div>
          </div>
        </div>

        <NotificationsList
          items={mediaItems}
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
