// =====================================
// FILE: hooks/useUserDay.ts
// =====================================
"use client"

import { useMemo } from "react"
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"

type ApiUserOk = { message?: string; data: any }

export type PaginationMeta = {
  page: number
  pageSize: number
  maxPageSize: number
  totalPages: number
  totalCount: number
}

type PagedData<T> = {
  data: T[]
  page: number
  pageSize: number
  maxPageSize: number
  totalPages: number
  totalCount: number
}

function safeApiMessage(err: any) {
  try {
    return JSON.parse(err?.message).message || "Something went wrong."
  } catch {
    return err?.message || "Something went wrong."
  }
}

async function readJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function fetchUser(username: string) {
  const res = await apiFetch(`${API_URL}/${encodeURIComponent(username)}`, {
    method: "GET",
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(
      text || JSON.stringify({ message: `User failed (${res.status})` })
    )
  }

  const json = await readJsonSafe<ApiUserOk>(res)
  const user = json?.data
  if (!user)
    throw new Error(JSON.stringify({ message: "User payload missing data" }))
  return user
}

function makeDayEndpoint(
  kind: "task" | "event",
  username: string,
  dateParam: string
) {
  return `${API_URL}/day/${kind}/${encodeURIComponent(
    username
  )}/${encodeURIComponent(dateParam)}`
}

// tasks/events paged fetch (meta at top level, list at json.data)
async function fetchPagedKind<T>(
  kind: "task" | "event",
  username: string,
  dateParam: string,
  page: number,
  maxPageSize: number
): Promise<PagedData<T>> {
  const qs = new URLSearchParams({
    page: String(page),
    maxPageSize: String(maxPageSize),
  })

  const res = await apiFetch(
    `${makeDayEndpoint(kind, username, dateParam)}?${qs.toString()}`,
    { method: "GET", cache: "no-store" }
  )

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(
      text || JSON.stringify({ message: `${kind} failed (${res.status})` })
    )
  }

  const json = await readJsonSafe<any>(res)
  const list = Array.isArray(json?.data) ? (json.data as T[]) : []

  return {
    data: list,
    // trust requested page (prevents server "page: 1" bugs from looping)
    page,
    pageSize: Number(json?.pageSize ?? list.length) || list.length,
    maxPageSize: Number(json?.maxPageSize ?? maxPageSize) || maxPageSize,
    totalPages: Number(json?.totalPages ?? 1) || 1,
    totalCount: Number(json?.totalCount ?? list.length) || list.length,
  }
}

// posts paged fetch (meta at top level, list at json.data)
async function fetchPagedPosts(
  username: string,
  dateParam: string,
  page: number,
  maxPageSize: number
): Promise<PagedData<any>> {
  console.log("fetching...")
  const qs = new URLSearchParams({
    page: String(page),
    maxPageSize: String(maxPageSize),
  })

  const res = await apiFetch(
    `${API_URL}/${encodeURIComponent(username)}/posts/${encodeURIComponent(
      dateParam
    )}?${qs.toString()}`,
    { method: "GET", cache: "no-store" }
  )

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(
      text || JSON.stringify({ message: `Posts failed (${res.status})` })
    )
  }

  const json = await readJsonSafe<any>(res)
  const list = Array.isArray(json?.data) ? json.data : []

  return {
    data: list,
    // trust requested page (prevents server "page: 1" bugs from looping)
    page,
    pageSize: Number(json?.pageSize ?? list.length) || list.length,
    maxPageSize: Number(json?.maxPageSize ?? maxPageSize) || maxPageSize,
    totalPages: Number(json?.totalPages ?? 1) || 1,
    totalCount: Number(json?.totalCount ?? list.length) || list.length,
  }
}

function stableId(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    const out = String(value).trim()
    return out && out !== "[object Object]" ? out : ""
  }
  if (value && typeof value === "object") {
    const obj = value as {
      $oid?: unknown
      id?: unknown
      _id?: unknown
      type?: unknown
      data?: unknown
      buffer?: unknown
    }
    if (typeof obj.$oid === "string" || typeof obj.$oid === "number") {
      const out = String(obj.$oid).trim()
      if (out) return out
    }
    if (obj.type === "Buffer" && Array.isArray(obj.data)) {
      const bytes = obj.data.filter((n) => Number.isFinite(n)) as number[]
      if (bytes.length) {
        return bytes
          .map((n) => Number(n).toString(16).padStart(2, "0"))
          .join("")
      }
    }
    if (typeof obj.id === "string" || typeof obj.id === "number") {
      const out = String(obj.id).trim()
      if (out) return out
    }
    if (typeof obj._id === "string" || typeof obj._id === "number") {
      const out = String(obj._id).trim()
      if (out) return out
    }
    return stableId(obj.id) || stableId(obj._id) || stableId(obj.buffer)
  }
  return ""
}

/**
 * IMPORTANT:
 * This prevents duplicates if the same page is fetched twice (IntersectionObserver / fast scroll / dev mode),
 * and it also protects you if the backend overlaps results between pages.
 */
function flattenPagesUniqueById<T extends { _id?: any; id?: any }>(
  pages: PagedData<T>[] | undefined
): T[] {
  if (!pages?.length) return []

  const map = new Map<string, T>()

  for (const p of pages) {
    for (const item of p.data ?? []) {
      const id = stableId(item?._id) || stableId(item?.id)
      if (!id) continue
      map.set(id, item)
    }
  }

  return Array.from(map.values())
}

/**
 * Pagination meta should reflect what we ACTUALLY loaded.
 * Using pages.length makes the UI stable even if server "page" is wrong.
 */
function lastMeta<T>(pages: PagedData<T>[] | undefined): PaginationMeta {
  const last = pages?.[pages.length - 1]
  const loadedPages = pages?.length ?? 0

  if (!last) {
    return {
      page: 1,
      pageSize: 0,
      maxPageSize: 5,
      totalPages: 1,
      totalCount: 0,
    }
  }

  return {
    page: Math.max(1, loadedPages),
    pageSize: last.pageSize,
    maxPageSize: last.maxPageSize,
    totalPages: last.totalPages,
    totalCount: last.totalCount,
  }
}

export function useUserDay(username: string, dateParam: string) {
  const queryClient = useQueryClient()
  const baseKey = useMemo(
    () => ["userDay", username, dateParam],
    [username, dateParam]
  )
  const enabled = !!username && !!dateParam

  const userQ = useQuery({
    queryKey: [...baseKey, "user"],
    queryFn: () => fetchUser(username),
    enabled,
  })

  const user = userQ.data ?? null
  const isPrivate = !!user?.private
  const isFollowing = !!user?.isFollowing
  const followInfo = user?.follow_info ?? null
  const isSelf = followInfo === "same_user"
  const canView = userQ.isSuccess ? !isPrivate || isFollowing || isSelf : false

  const DEFAULT_PAGE_SIZE = 5
  const POSTS_PAGE_SIZE = 5

  const tasksQ: any = useInfiniteQuery({
    queryKey: [...baseKey, "tasks"],
    enabled: enabled && canView,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchPagedKind<any>(
        "task",
        username,
        dateParam,
        Number(pageParam),
        DEFAULT_PAGE_SIZE
      ),
    getNextPageParam: (lastPage, allPages) => {
      const next = allPages.length + 1
      return next <= lastPage.totalPages ? next : undefined
    },
    refetchOnWindowFocus: false,
  })

  const eventsQ: any = useInfiniteQuery({
    queryKey: [...baseKey, "events"],
    enabled: enabled && canView,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchPagedKind<any>(
        "event",
        username,
        dateParam,
        Number(pageParam),
        DEFAULT_PAGE_SIZE
      ),
    getNextPageParam: (lastPage, allPages) => {
      const next = allPages.length + 1
      return next <= lastPage.totalPages ? next : undefined
    },
    refetchOnWindowFocus: false,
  })

  const postsQ: any = useInfiniteQuery({
    queryKey: [...baseKey, "posts"],
    enabled: enabled && canView,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchPagedPosts(username, dateParam, Number(pageParam), POSTS_PAGE_SIZE),
    getNextPageParam: (lastPage, allPages) => {
      const next = allPages.length + 1
      return next <= lastPage.totalPages ? next : undefined
    },
    refetchOnWindowFocus: false,
  })

  const loading =
    userQ.isLoading ||
    (canView &&
      (tasksQ.isLoading ||
        eventsQ.isLoading ||
        postsQ.isLoading))

  const error =
    (userQ.error && safeApiMessage(userQ.error)) ||
    (canView && tasksQ.error && safeApiMessage(tasksQ.error)) ||
    (canView && eventsQ.error && safeApiMessage(eventsQ.error)) ||
    (canView && postsQ.error && safeApiMessage(postsQ.error)) ||
    null

  const tasks = flattenPagesUniqueById(tasksQ.data?.pages)
  const events = flattenPagesUniqueById(eventsQ.data?.pages)
  const posts = flattenPagesUniqueById(postsQ.data?.pages)

  const tasksMeta = lastMeta(tasksQ.data?.pages)
  const eventsMeta = lastMeta(eventsQ.data?.pages)
  const postsMeta = lastMeta(postsQ.data?.pages)

  const stats = {
    tasksCount: tasksMeta.totalCount ?? tasks.length,
    eventsCount: eventsMeta.totalCount ?? events.length,
  }

  return {
    loading,
    error,
    canView,

    user,
    stats,

    tasks,
    events,
    posts,

    tasksMeta,
    eventsMeta,
    postsMeta,

    loadMoreTasks: () => {
      if (tasksQ.isFetchingNextPage) return
      if (!tasksQ.hasNextPage) return
      return tasksQ.fetchNextPage()
    },
    loadMoreEvents: () => {
      if (eventsQ.isFetchingNextPage) return
      if (!eventsQ.hasNextPage) return
      return eventsQ.fetchNextPage()
    },
    loadMorePosts: () => {
      if (postsQ.isFetchingNextPage) return
      if (!postsQ.hasNextPage) return
      return postsQ.fetchNextPage()
    },

    loadingMoreTasks: tasksQ.isFetchingNextPage,
    loadingMoreEvents: eventsQ.isFetchingNextPage,
    loadingMorePosts: postsQ.isFetchingNextPage,

    hasMoreTasks: !!tasksQ.hasNextPage,
    hasMoreEvents: !!eventsQ.hasNextPage,
    hasMorePosts: !!postsQ.hasNextPage,

    collapseTasks: () => {
      queryClient.removeQueries({ queryKey: [...baseKey, "tasks"] })
    },
    collapseEvents: () => {
      queryClient.removeQueries({ queryKey: [...baseKey, "events"] })
    },
    collapsePosts: () => {
      queryClient.removeQueries({ queryKey: [...baseKey, "posts"] })
    },

    reloadAll: () =>
      Promise.all([
        userQ.refetch(),
        tasksQ.refetch(),
        eventsQ.refetch(),
        postsQ.refetch(),
      ]),
  }
}
