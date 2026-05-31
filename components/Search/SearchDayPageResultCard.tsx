"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { Heart, MessageCircle } from "lucide-react"
import DayPageBlocksView from "@/components/DayPage/DayPageBlocksView"
import { resolveProfilePictureUrl } from "@/lib/media"

const AVATAR_FALLBACK = "/avatar-placeholder.png"

function formatDateKey(dateKey?: string) {
  if (!dateKey) return ""
  // dateKey is YYYY-MM-DD
  const d = new Date(dateKey + "T00:00:00")
  if (Number.isNaN(d.getTime())) return dateKey
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function SearchDayPageResultCard({ page }: { page: any }) {
  const router = useRouter()
  const userInfo = page.user_info ?? {}
  const username = userInfo.username ?? ""
  const displayName = userInfo.displayName ?? username
  const avatarSrc = resolveProfilePictureUrl(userInfo, AVATAR_FALLBACK)
  const dateLabel = formatDateKey(page.dateKey)

  function open() {
    if (!username) return
    const dateKey: string = page.dateKey ?? ""
    // Convert YYYY-MM-DD to DD-MM-YYYY for the URL
    const [y, m, d] = dateKey.split("-")
    const ddmmyyyy = d && m && y ? `${d}-${m}-${y}` : ""
    router.push(ddmmyyyy ? `/${username}/day?date=${ddmmyyyy}` : `/${username}/day`)
  }

  return (
    <button
      type="button"
      onClick={open}
      className="w-full rounded-xl px-2 py-3 text-left transition hover:bg-(--dk-mist)/30 focus-visible:outline-none"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-2 mb-1">
        <Image
          src={avatarSrc}
          alt={username}
          width={34}
          height={34}
          className="h-[34px] w-[34px] rounded-sm object-cover ring-1 ring-(--dk-ink)/10 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-semibold text-(--dk-ink) truncate">{displayName}</span>
            <span className="text-xs text-(--dk-slate) truncate">@{username}</span>
          </div>
          {dateLabel && (
            <div className="text-[11px] text-(--dk-slate)/70 mt-0.5">{dateLabel}</div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 text-xs text-(--dk-slate)">
          <span className="flex items-center gap-1">
            <Heart
              size={12}
              style={{ fill: page.userLiked ? "var(--dk-sky)" : "none", color: page.userLiked ? "var(--dk-sky)" : "currentColor" }}
            />
            {page.likesCount ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle size={12} />
            {page.commentsCount ?? 0}
          </span>
        </div>
      </div>

      {/* Preview blocks */}
      {Array.isArray(page.blocks) && page.blocks.length > 0 ? (
        <DayPageBlocksView blocks={page.blocks} maxBlocks={2} />
      ) : (
        <div className="text-xs italic text-(--dk-slate) px-4 py-1">No content</div>
      )}
    </button>
  )
}
