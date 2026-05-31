"use client"

import type { SearchType } from "@/hooks/useSearch"
import SearchUserResultRow from "@/components/Search/SearchUserResultRow"
import SearchDayPageResultCard from "@/components/Search/SearchDayPageResultCard"

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
}: {
  type: SearchType
  items: any[]
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  onRefreshMedia?: (() => void | Promise<unknown>) | null
}) {
  if (type === "User") {
    return (
      <div className="px-4 pb-6 sm:px-5">
        {items.map((u: any, idx: number) => (
          <div key={stableKey(u?._id || u?.username, idx)}>
            <SearchUserResultRow user={u} />
            {idx < items.length - 1 && (
              <div className="mx-2 h-px bg-(--dk-ink)/8" />
            )}
          </div>
        ))}
      </div>
    )
  }

  // DayPage (default)
  return (
    <div className="px-2 pb-6 sm:px-3">
      {items.map((page: any, idx: number) => (
        <div key={stableKey(page?._id || page?.id, idx)}>
          <SearchDayPageResultCard page={page} />
          {idx < items.length - 1 && (
            <div className="mx-4 h-px bg-(--dk-ink)/8" />
          )}
        </div>
      ))}
    </div>
  )
}
