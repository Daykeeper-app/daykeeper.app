"use client"

import { useEffect, useRef } from "react"
import type { SearchType } from "@/hooks/useSearch"
import SearchResultsSwitch from "@/components/Search/SearchResultsSwitch"
import { CenteredSpinner } from "@/components/common/LoadingIndicator"

export default function SearchResultsList({
  items,
  type,
  loadingMore,
  hasMore,
  onLoadMore,
  onRefreshMedia,
}: {
  items: any[]
  type: SearchType
  loadingMore: boolean
  hasMore: boolean
  onLoadMore: () => void
  onRefreshMedia?: (() => void | Promise<unknown>) | null
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        if (hasMore && !loadingMore) onLoadMore()
      },
      { rootMargin: "700px" },
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loadingMore, onLoadMore])

  return (
    <>
      <SearchResultsSwitch
        type={type}
        items={items}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={onLoadMore}
        onRefreshMedia={onRefreshMedia}
      />

      {loadingMore ? (
        <CenteredSpinner className="px-4 pb-6 sm:px-5" />
      ) : null}

      {!hasMore && items.length ? (
        <div className="px-4 pb-6 text-center text-xs text-(--dk-slate) sm:px-5">
          End of results
        </div>
      ) : null}

      <div ref={sentinelRef} />
    </>
  )
}
