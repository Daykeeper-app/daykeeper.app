// =====================================
// FILE: hooks/useSearch.ts
// =====================================
"use client"

import { useMemo, useCallback } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"

export type SearchType = "Post" | "User" | "Event" | "Task"
export type SearchOrder = "recent" | "relevant"
export type FollowingScope = "friends" | "following" | "followers"

export type SearchResponse = {
  data: any[]
  page: number
  pageSize: number
  maxPageSize: number
  totalPages: number
  totalCount: number
}

function stableId(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number") {
    const out = String(value).trim()
    return out || null
  }
  if (value && typeof value === "object") {
    const obj = value as { $oid?: unknown; id?: unknown; _id?: unknown }
    if (typeof obj.$oid === "string" || typeof obj.$oid === "number") {
      const out = String(obj.$oid).trim()
      if (out) return out
    }
    if (typeof obj.id === "string" || typeof obj.id === "number") {
      const out = String(obj.id).trim()
      if (out) return out
    }
    if (typeof obj._id === "string" || typeof obj._id === "number") {
      const out = String(obj._id).trim()
      if (out) return out
    }
  }
  return null
}

function readJsonSafe<T>(res: Response): Promise<T | null> {
  return res.json().catch(() => null)
}

function safeApiMessage(err: any) {
  try {
    return JSON.parse(err?.message).message || "Something went wrong."
  } catch {
    return err?.message || "Something went wrong."
  }
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue
    const s = String(v).trim()
    if (!s) continue
    sp.set(k, s)
  }
  return sp.toString()
}

async function fetchSearchPage(args: {
  q: string
  type: SearchType
  order: SearchOrder
  page: number
  maxPageSize: number
  following?: FollowingScope // omit for default
}): Promise<SearchResponse> {
  const qs = buildQuery({
    q: args.q,
    type: args.type,
    order: args.order,
    page: args.page,
    maxPageSize: args.maxPageSize,
    ...(args.following ? { following: args.following } : {}),
  })

  const res = await apiFetch(`${API_URL}/search?${qs}`, {
    method: "GET",
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(
      text || JSON.stringify({ message: `Search failed (${res.status})` }),
    )
  }

  const json = await readJsonSafe<any>(res)

  const list = Array.isArray(json?.data) ? json.data : []
  const totalPages = Number(json?.totalPages ?? 1) || 1
  const totalCount = Number(json?.totalCount ?? list.length) || list.length

  return {
    data: list,
    // trust requested page (protects from backend returning page: 1 always)
    page: args.page,
    pageSize: Number(json?.pageSize ?? list.length) || list.length,
    maxPageSize:
      Number(json?.maxPageSize ?? args.maxPageSize) || args.maxPageSize,
    totalPages,
    totalCount,
  }
}

function flattenPagesUniqueById<T extends { _id?: unknown; id?: unknown }>(
  pages: SearchResponse[] | undefined,
): T[] {
  if (!pages?.length) return []

  const map = new Map<string, T>()
  let fallbackIndex = 0
  for (const p of pages) {
    for (const it of p.data ?? []) {
      const id = stableId(it?._id) || stableId(it?.id) || `fallback-${fallbackIndex++}`
      map.set(id, it)
    }
  }
  return Array.from(map.values())
}

export function useSearch(params: {
  q: string
  type: SearchType
  order: SearchOrder
  following?: FollowingScope
  pageSize?: number
}) {
  const PAGE_SIZE = params.pageSize ?? 10

  const key = useMemo(
    () => [
      "search",
      params.q,
      params.type,
      params.order,
      params.following || "all",
      PAGE_SIZE,
    ],
    [params.q, params.type, params.order, params.following, PAGE_SIZE],
  )

  const enabled = useMemo(() => {
    // you can require q if you want; I’m allowing empty q as "browse"
    return !!params.type && !!params.order
  }, [params.type, params.order])

  const q = useInfiniteQuery({
    queryKey: key,
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchSearchPage({
        q: params.q,
        type: params.type,
        order: params.order,
        page: Number(pageParam),
        maxPageSize: PAGE_SIZE,
        following: params.following,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const next = allPages.length + 1
      return next <= (lastPage?.totalPages ?? 1) ? next : undefined
    },
    refetchOnWindowFocus: false,
  })

  const items = useMemo(() => {
    const pages = q.data?.pages ?? []
    return flattenPagesUniqueById<any>(pages)
  }, [q.data])

  const last = q.data?.pages?.[q.data.pages.length - 1]
  const page = last?.page ?? 1
  const totalPages = last?.totalPages ?? 1
  const totalCount = last?.totalCount ?? 0

  const loadMore = useCallback(() => {
    if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage()
  }, [q])

  return {
    data: items,

    loading: q.isLoading,
    loadingFirst: q.isLoading,
    loadingMore: q.isFetchingNextPage,
    error: q.error ? safeApiMessage(q.error) : null,

    loadMore,
    hasMore: !!q.hasNextPage,

    page,
    totalPages,
    totalCount,

    refetch: () => q.refetch(),
  }
}
