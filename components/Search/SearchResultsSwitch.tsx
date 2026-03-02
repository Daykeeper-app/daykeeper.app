// =====================================
// FILE: components/search/SearchResultsSwitch.tsx
// UPDATED: pass narrowed union to SearchDayKindResults
// =====================================
"use client"

import type { SearchType } from "@/hooks/useSearch"
import SearchPostResultCard from "@/components/Search/SearchPostResultCard"
import SearchUserResultRow from "@/components/Search/SearchUserResultRow"
import SearchDayKindResults from "@/components/Search/SearchDayKindResults"

export default function SearchResultsSwitch({
  type,
  items,
  hasMore,
  loadingMore,
  onLoadMore,
  onRefreshMedia,
}: {
  type: SearchType
  items: any[]
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  onRefreshMedia?: (() => void | Promise<unknown>) | null
}) {
  if (type === "Post") {
    return (
      <div className="space-y-1 px-4 pb-6 sm:px-5">
        {items.map((p: any) => (
          <SearchPostResultCard
            key={String(p?._id || p?.id)}
            post={p}
            onRefreshMedia={onRefreshMedia}
          />
        ))}
      </div>
    )
  }

  if (type === "User") {
    return (
      <div className="space-y-1 px-4 pb-6 sm:px-5">
        {items.map((u: any) => (
          <SearchUserResultRow key={String(u?._id)} user={u} />
        ))}
      </div>
    )
  }

  if (type === "Note" || type === "Event" || type === "Task") {
    return (
      <div className="px-4 pb-6 sm:px-5">
        <SearchDayKindResults
          type={type}
          items={items}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={onLoadMore}
        />
      </div>
    )
  }

  return null
}
