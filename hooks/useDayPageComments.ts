"use client"

import { useCallback, useMemo } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"

import { API_URL } from "@/config"
import { apiFetch } from "@/lib/authClient"

export type DayPageComment = {
  _id: string
  dayPageId?: string
  parentCommentId?: string | null
  comment: string
  created_at: string
  repliesCount?: number
  user: {
    _id: string
    username: string
    displayName?: string
    profile_picture?: { url?: string } | null
  }
}

type CommentsResponse = {
  data?: DayPageComment[]
  page?: number
  totalPages?: number
  totalCount?: number
}

const PAGE_SIZE = 10

async function fetchCommentsPage(
  path: string,
  page: number,
): Promise<CommentsResponse> {
  const query = new URLSearchParams({
    page: String(page),
    maxPageSize: String(PAGE_SIZE),
  })
  const res = await apiFetch(`${API_URL}${path}?${query.toString()}`, {
    method: "GET",
    cache: "no-store",
  })

  if (!res.ok) {
    const json = await res.json().catch(() => null)
    throw new Error(json?.message || `Could not load comments (${res.status})`)
  }

  return (await res.json().catch(() => ({}))) as CommentsResponse
}

function usePaginatedDayPageComments({
  queryKey,
  path,
  enabled,
}: {
  queryKey: readonly unknown[]
  path: string
  enabled: boolean
}) {
  const query = useInfiniteQuery({
    queryKey,
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchCommentsPage(path, Number(pageParam)),
    getNextPageParam: (lastPage) => {
      const page = lastPage.page ?? 1
      if (typeof lastPage.totalPages === "number") {
        return page < lastPage.totalPages ? page + 1 : undefined
      }
      return (lastPage.data?.length ?? 0) < PAGE_SIZE ? undefined : page + 1
    },
    refetchOnWindowFocus: false,
  })

  const items = useMemo(
    () =>
      (query.data?.pages ?? []).flatMap((page) =>
        Array.isArray(page.data) ? page.data : [],
      ),
    [query.data],
  )
  const totalCount = query.data?.pages[0]?.totalCount ?? items.length

  const loadMore = useCallback(() => {
    if (!query.hasNextPage || query.isFetchingNextPage) return
    void query.fetchNextPage()
  }, [query])

  const reload = useCallback(() => query.refetch(), [query])

  return {
    items,
    totalCount,
    loading: query.isLoading,
    loadingFirst: query.isLoading || (query.isFetching && items.length === 0),
    loadingMore: query.isFetchingNextPage,
    error: query.error instanceof Error ? query.error.message : null,
    hasMore: !!query.hasNextPage,
    loadMore,
    reload,
  }
}

export function useDayPageComments(pageId: string | undefined) {
  return usePaginatedDayPageComments({
    queryKey: ["dayPageComments", pageId],
    path: `/day-pages/${encodeURIComponent(String(pageId))}/comments`,
    enabled: !!pageId,
  })
}

export function useDayPageReplies(
  commentId: string | undefined,
  enabled = true,
) {
  return usePaginatedDayPageComments({
    queryKey: ["dayPageCommentReplies", commentId],
    path: `/day-pages/comment/${encodeURIComponent(String(commentId))}/replies`,
    enabled: !!commentId && enabled,
  })
}
