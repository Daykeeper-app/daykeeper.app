// =====================================
// FILE: components/search/SearchResultsSwitch.tsx
// UPDATED: pass narrowed union to SearchDayKindResults
// =====================================
"use client"

import type { SearchType } from "@/hooks/useSearch"
import SearchPostResultCard from "@/components/Search/SearchPostResultCard"
import SearchUserResultRow from "@/components/Search/SearchUserResultRow"
import SearchDayKindResults from "@/components/Search/SearchDayKindResults"

function stableKey(id: unknown, index: number) {
  if (typeof id === "string" || typeof id === "number") return String(id)
  if (id && typeof id === "object") {
    const oid = (id as { $oid?: unknown }).$oid
    if (typeof oid === "string" || typeof oid === "number") return String(oid)
  }
  return `row-${index}`
}

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
        {items.map((p: any, idx: number) => (
          <SearchPostResultCard
            key={stableKey(p?._id || p?.id, idx)}
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
        {items.map((u: any, idx: number) => (
          <SearchUserResultRow key={stableKey(u?._id || u?.username, idx)} user={u} />
        ))}
      </div>
    )
  }

  if (type === "Event" || type === "Task") {
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
