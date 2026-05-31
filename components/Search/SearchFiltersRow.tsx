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
    <div className="flex shrink-0 items-center gap-1.5">
      <div className="h-4 w-px bg-(--dk-ink)/15 shrink-0" />

      <label className="group relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-(--dk-slate) hover:bg-(--dk-mist)/70 hover:text-(--dk-ink) focus-within:bg-(--dk-mist)/70 cursor-pointer whitespace-nowrap transition">
        <span className="font-medium">{orderLabel}</span>
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

      <label className="group relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-(--dk-slate) hover:bg-(--dk-mist)/70 hover:text-(--dk-ink) focus-within:bg-(--dk-mist)/70 cursor-pointer whitespace-nowrap transition">
        <span className="font-medium">{followingLabel}</span>
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
