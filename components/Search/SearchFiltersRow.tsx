"use client"

import type { FollowingScope, SearchOrder } from "@/hooks/useSearch"

export default function SearchFiltersRow({
  order,
  onOrderChange,
  following,
  onFollowingChange,
}: {
  order: SearchOrder
  onOrderChange: (v: SearchOrder) => void
  following?: FollowingScope
  onFollowingChange: (v?: FollowingScope) => void
}) {
  const orderLabel = order === "relevant" ? "Most relevant" : "Most recent"
  const followingLabel =
    following === "friends"
      ? "Friends"
      : following === "following"
      ? "Following"
      : following === "followers"
      ? "Followers"
      : "All users"

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <label className="group relative flex items-center rounded-lg bg-(--dk-paper)/70 px-3 py-2 text-sm text-(--dk-ink) hover:bg-(--dk-sky)/14 focus-within:bg-(--dk-sky)/14">
        <span className="mr-2 shrink-0 font-medium text-(--dk-slate)">Sort:</span>
        <span className="min-w-0 flex-1 truncate pr-6">{orderLabel}</span>
        <select
          aria-label="Sort results"
          value={order}
          onChange={(e) => onOrderChange(e.target.value as SearchOrder)}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-lg opacity-0"
        >
          <option value="recent">Most recent</option>
          <option value="relevant">Most relevant</option>
        </select>
      </label>

      <label className="group relative flex items-center rounded-lg bg-(--dk-paper)/70 px-3 py-2 text-sm text-(--dk-ink) hover:bg-(--dk-sky)/14 focus-within:bg-(--dk-sky)/14">
        <span className="mr-2 shrink-0 font-medium text-(--dk-slate)">Filter:</span>
        <span className="min-w-0 flex-1 truncate pr-6">{followingLabel}</span>
        <select
          aria-label="Filter results"
          value={following || "default"}
          onChange={(e) => {
            const v = e.target.value as any
            onFollowingChange(
              v === "default" ? undefined : (v as FollowingScope)
            )
          }}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-lg opacity-0"
        >
          <option value="default">All users</option>
          <option value="friends">Friends</option>
          <option value="following">Following</option>
          <option value="followers">Followers</option>
        </select>
      </label>
    </div>
  )
}
