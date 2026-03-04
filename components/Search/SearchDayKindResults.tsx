// =====================================
// FILE: components/search/SearchDayKindResults.tsx
// UPDATED: now uses SearchDayKindRow (each item shows user header)
// =====================================
"use client"

import { useMemo, useState } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import ActionPill from "@/components/common/ActionPill"
import SearchDayKindRow from "@/components/Search/SearchDayKindRow"

function stableKey(id: unknown, index: number) {
  if (typeof id === "string" || typeof id === "number") return String(id)
  if (id && typeof id === "object") {
    const oid = (id as { $oid?: unknown }).$oid
    if (typeof oid === "string" || typeof oid === "number") return String(oid)
  }
  return `day-kind-${index}`
}

export default function SearchDayKindResults({
  type,
  items,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  type: "Event" | "Task"
  items: any[]
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
}) {
  const list = useMemo(() => (Array.isArray(items) ? items : []), [items])

  const PREVIEW_COUNT = 8
  const [collapsed, setCollapsed] = useState(false)

  const visible = collapsed ? list.slice(0, PREVIEW_COUNT) : list
  const canCollapse = list.length > PREVIEW_COUNT && !collapsed
  const canExpand = list.length > PREVIEW_COUNT && collapsed

  // mutual exclusion
  const showLoadMore = !!hasMore
  const showShowAll = !showLoadMore && canExpand

  return (
    <div className="space-y-1">
      {canCollapse ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-(--dk-slate) hover:text-(--dk-ink)"
          >
            <ChevronUp size={14} />
            Collapse
          </button>
        </div>
      ) : null}

      <div className="space-y-1">
        {visible.map((it: any, idx: number) => (
          <SearchDayKindRow key={stableKey(it?._id, idx)} type={type} item={it} />
        ))}
      </div>

      {showShowAll ? (
        <ActionPill onClick={() => setCollapsed(false)}>
          <ChevronDown size={16} />
          Show all
        </ActionPill>
      ) : null}

      {showLoadMore ? (
        <ActionPill
          onClick={() => {
            if (loadingMore) return
            setCollapsed(false)
            onLoadMore()
          }}
          disabled={loadingMore}
        >
          <ChevronDown size={16} />
          {loadingMore ? "Loading…" : "Show more"}
        </ActionPill>
      ) : null}
    </div>
  )
}
