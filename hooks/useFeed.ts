"use client"

import { useMemo, useCallback } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/authClient"
import {
  normalizeFeedPayload,
  stableFeedId,
  type FeedUserDay,
} from "@/lib/feedTypes"
import { toDDMMYYYY } from "@/lib/date"
import { API_URL } from "@/config"

const PAGE_SIZE = 20

type FeedResponse = {
  data: any[]
  page: number
  pageSize: number
  maxPageSize: number
  totalPages: number
  totalCount: number
}

async function fetchFeedPage(
  dateParam: string,
  page: number,
): Promise<FeedResponse> {
  const qs = new URLSearchParams({
    date: dateParam,
    page: String(page),
    maxPageSize: String(PAGE_SIZE),
  })

  const res = await apiFetch(`${API_URL}/?${qs.toString()}`, {
    method: "GET",
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `Request failed (${res.status})`)
  }

  return (await res.json().catch(() => ({}))) as FeedResponse
}

export function useFeed(selectedDate: Date) {
  const dateParam = useMemo(() => toDDMMYYYY(selectedDate), [selectedDate])

  const q = useInfiniteQuery({
    queryKey: ["feed", dateParam],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchFeedPage(dateParam, Number(pageParam)),
    getNextPageParam: (lastPage) => {
      const r = (lastPage as any)?.data?.response ?? lastPage
      const page = r?.page ?? 1
      const totalPages = r?.totalPages ?? 1
      return page < totalPages ? page + 1 : undefined
    },
    enabled: !!dateParam,
  })

  // flatten + normalize + de-dupe
  const items: FeedUserDay[] = useMemo(() => {
    const pages = q.data?.pages ?? []
    const all = pages.flatMap(
      (p) => (normalizeFeedPayload(p) as FeedUserDay[]) ?? [],
    )
    // keep de-dupe (useful if server shifts paging), but only on stable ids
    const map = new Map<string, FeedUserDay>()
    let fallback = 0
    for (const it of all) {
      const key =
        stableFeedId(it.userId) ||
        stableFeedId(it?.user_info?._id) ||
        (it.username ? `u:${it.username}` : "") ||
        `fallback:${fallback++}`
      map.set(key, it)
    }
    return Array.from(map.values())
  }, [q.data])

  const last = q.data?.pages?.[q.data.pages.length - 1]
  const lastR = (last as any)?.data?.response ?? last
  const page = lastR?.page ?? 1
  const totalPages = lastR?.totalPages ?? 1
  const totalCount = lastR?.totalCount ?? 0

  const loadMore = useCallback(() => {
    if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage()
  }, [q])

  const reload = useCallback(() => {
    q.refetch()
  }, [q])

  return {
    data: items,

    // keep your prop names
    loading: q.isLoading,
    loadingFirst: q.isLoading,
    loadingMore: q.isFetchingNextPage,
    error: q.error ? (q.error as any).message : null,

    reload,
    loadMore,
    hasMore: !!q.hasNextPage,

    page,
    totalPages,
    totalCount,
    usersCount: totalCount,
    dateParam,
  }
}
