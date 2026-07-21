"use client"

import { useEffect, useMemo, useRef, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  ChevronRight,
  Heart,
  MessageCircle,
  UserCheck,
  UserPlus,
} from "lucide-react"
import { useDelayedRender } from "@/hooks/useDelayedRender"
import type { NotificationItem } from "@/hooks/useNotifications"
import { CenteredSpinner } from "@/components/common/LoadingIndicator"

const ICONS: Record<string, ReactNode> = {
  new_follower: <UserPlus size={16} />,
  follow_request: <UserPlus size={16} />,
  follow_request_accepted: <UserCheck size={16} />,
  post_liked: <Heart size={16} />,
  comment: <MessageCircle size={16} />,
}

function stableKey(id: unknown, index: number, extra?: unknown) {
  if (typeof id === "string" || typeof id === "number") return String(id)
  if (id && typeof id === "object") {
    const oid = (id as { $oid?: unknown }).$oid
    if (typeof oid === "string" || typeof oid === "number") return String(oid)
  }
  const ex = typeof extra === "string" || typeof extra === "number" ? String(extra) : "n"
  return `${ex}-${index}`
}

function stableId(id: unknown): string {
  if (typeof id === "string" || typeof id === "number") return String(id)
  if (id && typeof id === "object") {
    const oid = (id as { $oid?: unknown }).$oid
    if (typeof oid === "string" || typeof oid === "number") return String(oid)
  }
  return ""
}

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

function NotificationRow({
  item,
  isNew,
}: {
  item: NotificationItem
  isNew: boolean
}) {
  const router = useRouter()
  const icon =
    item.type && ICONS[item.type] ? ICONS[item.type] : <Bell size={16} />
  const stamp = formatStamp(item.created_at)
  const route =
    typeof item.route === "string" && item.route.trim()
      ? item.route.trim()
      : typeof item.data?.route === "string" && item.data.route.trim()
        ? item.data.route.trim()
        : ""
  const isClickable = !!route

  const content = (
    <>
      <div
        className={[
          "relative mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg text-(--dk-ink)",
          isNew
            ? "bg-(--dk-sky)/20"
            : "bg-(--dk-mist)/70",
        ].join(" ")}
      >
        {icon}
        {isNew ? (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-(--dk-sky)" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-(--dk-ink) truncate">
            {item.title || "Notification"}
          </p>
          <span className="text-[11px] text-(--dk-slate) whitespace-nowrap">
            {stamp}
          </span>
        </div>

        {item.body ? (
          <p className="mt-1 text-sm text-(--dk-slate)">{item.body}</p>
        ) : null}

        {isNew ? (
          <div className="mt-2 inline-flex items-center gap-2 text-[11px] text-(--dk-ink)">
            <span className="rounded-full bg-(--dk-sky)/18 px-2 py-0.5 text-(--dk-ink)">
              New
            </span>
          </div>
        ) : null}
      </div>

      {isClickable ? (
        <span className="mt-1 text-(--dk-slate)/65 transition group-hover:text-(--dk-sky) group-active:text-(--dk-sky)">
          <ChevronRight size={16} />
        </span>
      ) : null}
    </>
  )

  const baseClass = [
    "group flex w-full gap-3 border-b border-(--dk-ink)/10 px-4 py-4 text-left sm:px-5",
    isNew ? "bg-(--dk-sky)/10" : "bg-(--dk-paper)",
    isClickable
      ? "cursor-pointer transition hover:bg-(--dk-mist)/35 active:bg-(--dk-mist)/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--dk-sky)/60"
      : "cursor-default text-(--dk-ink)/88",
  ].join(" ")

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={() => router.push(route)}
        className={baseClass}
      >
        {content}
      </button>
    )
  }

  return <div className={baseClass}>{content}</div>
}

export default function NotificationsList({
  items,
  loading,
  loadingMore,
  hasMore,
  error,
  onLoadMore,
  onRetry,
  sessionNewIds,
}: {
  items: NotificationItem[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  error?: string | null
  onLoadMore: () => void
  onRetry?: () => void
  sessionNewIds: Set<string>
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const readyToShowSkeleton = useDelayedRender(200)
  const showSkeleton = loading && readyToShowSkeleton

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        if (hasMore && !loadingMore) onLoadMore()
      },
      { rootMargin: "600px" }
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loadingMore, onLoadMore])

  const emptyState = useMemo(() => !loading && !error && items.length === 0, [
    loading,
    error,
    items.length,
  ])

  return (
    <section>
      {showSkeleton ? (
        <div className="animate-pulse space-y-3 px-4 py-6 sm:px-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="h-16 rounded-lg bg-(--dk-mist)/60"
            />
          ))}
        </div>
      ) : null}

      {error && onRetry ? (
        <div className="px-4 py-4 sm:px-5">
          <button
            onClick={onRetry}
            className="text-xs underline text-(--dk-slate) hover:text-(--dk-ink)"
          >
            Failed to load notifications. Click to retry.
          </button>
        </div>
      ) : null}

      {emptyState ? (
        <div className="px-4 py-6 sm:px-5">
          <div className="rounded-xl bg-(--dk-mist)/45 p-5 text-sm text-(--dk-slate)">
            You have no notifications yet.
          </div>
        </div>
      ) : null}

      {items.map((item, idx) => (
        <NotificationRow
          key={stableKey(item._id, idx, item.created_at)}
          item={item}
          isNew={sessionNewIds.has(stableId(item._id))}
        />
      ))}

      {loadingMore ? (
        <CenteredSpinner className="px-4 py-4 sm:px-5" />
      ) : null}

      {!loading && !loadingMore && !hasMore && items.length > 0 ? (
        <div className="px-4 py-6 text-center text-xs text-(--dk-slate)/80 sm:px-5">
          You’re all caught up.
        </div>
      ) : null}

      <div ref={sentinelRef} className="h-1" />
    </section>
  )
}
