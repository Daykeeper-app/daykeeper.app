"use client"

import { useCallback, useMemo } from "react"
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"

export type NotificationItem = {
  _id: string
  user?: string
  type?: string
  title?: string
  body?: string
  route?: string
  data?: Record<string, unknown>
  read?: boolean
  seen?: boolean
  created_at?: string
}

export function isMediaReviewNotification(item: NotificationItem): boolean {
  const t = String(item?.type || "").toLowerCase()
  if (t.includes("media_review") || t.includes("media-review")) return true
  const title = String(item?.title || "").toLowerCase()
  return title.includes("media review")
}

type NotificationsResponse = {
  message?: string
  data?: NotificationItem[]
  page?: number
  pageSize?: number
  maxPageSize?: number
  totalPages?: number
  totalCount?: number
}

type NotificationsQueryData = {
  pages?: NotificationsResponse[]
  pageParams?: unknown[]
}

const PAGE_SIZE = 20

export type NotificationsScope = "all" | "without-media-review" | "media-review"

function toStableId(id: unknown): string {
  if (typeof id === "string" || typeof id === "number") return String(id)
  if (id && typeof id === "object") {
    const oid = (id as { $oid?: unknown }).$oid
    if (typeof oid === "string" || typeof oid === "number") return String(oid)
  }
  return ""
}

async function fetchNotificationsPage(
  page: number,
  scope: NotificationsScope
): Promise<NotificationsResponse> {
  const qs = new URLSearchParams({
    page: String(page),
    maxPageSize: String(PAGE_SIZE),
  })

  const basePath =
    scope === "media-review"
      ? "notifications/media-review"
      : scope === "without-media-review"
        ? "notifications/without-media-review"
        : "notifications"

  const res = await apiFetch(`${API_URL}/${basePath}?${qs.toString()}`, {
    method: "GET",
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `Request failed (${res.status})`)
  }

  return (await res.json().catch(() => ({}))) as NotificationsResponse
}

async function patchRead(ids: string[]) {
  if (!ids.length) return
  await apiFetch(`${API_URL}/notifications/read`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, notificationIds: ids }),
  })
}

export function useNotifications(scope: NotificationsScope = "without-media-review") {
  const queryClient = useQueryClient()
  const q = useInfiniteQuery({
    queryKey: ["notifications", scope],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchNotificationsPage(Number(pageParam), scope),
    getNextPageParam: (lastPage) => {
      const page = lastPage?.page ?? 1
      const totalPages = lastPage?.totalPages
      const count = Array.isArray(lastPage?.data) ? lastPage!.data!.length : 0

      if (typeof totalPages === "number") {
        return page < totalPages ? page + 1 : undefined
      }

      return count < PAGE_SIZE ? undefined : page + 1
    },
  })

  const items = useMemo(() => {
    const pages = q.data?.pages ?? []
    return pages.flatMap((p) => (Array.isArray(p?.data) ? p.data : []))
  }, [q.data])

  const markRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return
    const set = new Set(ids.map(String).filter(Boolean))

    // Optimistic local update so "unread" changes immediately in UI.
    queryClient.setQueriesData(
      { queryKey: ["notifications"] },
      (prev: NotificationsQueryData | undefined) => {
        if (!prev?.pages) return prev
        return {
          ...prev,
          pages: prev.pages.map((page) => ({
            ...page,
            data: Array.isArray(page?.data)
              ? page.data.map((it: NotificationItem) =>
                  set.has(toStableId(it?._id))
                    ? { ...it, read: true, seen: true }
                    : it
                )
              : page?.data,
          })),
        }
      }
    )

    try {
      await patchRead(ids)
    } catch {
      // If API call fails, resync from server.
      q.refetch()
    }
  }, [q, queryClient])

  const loadMore = useCallback(() => {
    if (!q.hasNextPage) return
    if (q.isFetching || q.isFetchingNextPage) return
    q.fetchNextPage()
  }, [q])

  const reload = useCallback(() => {
    q.refetch()
  }, [q])

  const totalCount = q.data?.pages?.[0]?.totalCount ?? 0
  const unreadCount = items.reduce(
    (acc, item) => {
      const id = toStableId(item?._id)
      if (!id) return acc
      const isRead = item.read ?? item.seen ?? false
      return acc + (isRead ? 0 : 1)
    },
    0
  )

  return {
    items,
    loading: q.isLoading,
    loadingMore: q.isFetchingNextPage,
    error: q.error instanceof Error ? q.error.message : null,
    hasMore: !!q.hasNextPage,
    loadMore,
    reload,
    markRead,
    totalCount,
    unreadCount,
  }
}
