"use client"

import { useEffect, useRef } from "react"
import FeedPostItem from "@/components/Feed/FeedPostItem"
import FeedTimelineEnd from "../Feed/FeedTimelineEnd"
import { Loader2 } from "lucide-react"
import type { PaginationMeta } from "@/hooks/useUserDay"
import formatDDMMYYYY from "@/utils/formatDate"

export default function UserDayPosts({
  posts,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  pagination,
  onCollapse,
  onRefreshMedia,
}: {
  posts: any[]
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  pagination?: PaginationMeta
  onCollapse?: () => void
  onRefreshMedia?: (() => void | Promise<unknown>) | null
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // prevents multiple rapid calls before loadingMore flips true
  const loadLockRef = useRef(false)

  // unlock whenever loading finishes or page changes
  useEffect(() => {
    if (!loadingMore) loadLockRef.current = false
  }, [loadingMore, pagination?.page])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    if (!hasMore) return
    if (!onLoadMore) return

    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (!first?.isIntersecting) return
        if (!hasMore) return
        if (loadingMore) return
        if (loadLockRef.current) return

        loadLockRef.current = true
        onLoadMore()
      },
      { root: null, rootMargin: "250px", threshold: 0 },
    )

    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, loadingMore, onLoadMore])

  if (!posts?.length) {
    return <div className="text-sm text-(--dk-slate)">No posts.</div>
  }

  const totalCount = pagination?.totalCount ?? posts.length
  const remaining = Math.max(0, totalCount - posts.length)

  return (
    <div className="space-y-4">
      {posts.map((p: any, idx: number) => (
        <FeedPostItem
          key={p._id}
          post={{
            id: p._id,
            time: formatDDMMYYYY(p.date),
            content: p.data,
            media: p.media,
            likes: p.likes,
            privacy: p.privacy,
            userLiked: p.userLiked,
            comments: p.comments,
            userCommented: !!p.userCommented && p.userCommented !== false,
          }}
          isLast={idx === posts.length - 1}
          onRefreshMedia={onRefreshMedia}
        />
      ))}

      <div ref={sentinelRef} className="h-1" />

      <div className="pt-2 flex justify-center">
        {loadingMore ? (
          <div className="px-4 py-2 rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) text-sm font-medium text-(--dk-sky) inline-flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Loading more…
          </div>
        ) : hasMore ? (
          <div className="px-4 py-2 rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) text-sm font-medium text-(--dk-slate)">
            Scroll to load more{remaining ? ` (${remaining} left)` : ""}
          </div>
        ) : (
          <FeedTimelineEnd />
        )}
      </div>
    </div>
  )
}
