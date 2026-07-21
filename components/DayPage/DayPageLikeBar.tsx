"use client"

import { useState } from "react"
import { Heart, MessageCircle } from "lucide-react"
import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"

type Props = {
  pageId: string
  likesCount: number
  commentsCount: number
  userLiked: boolean
  onCommentClick?: () => void
}

export default function DayPageLikeBar({
  pageId,
  likesCount,
  commentsCount,
  userLiked,
  onCommentClick,
}: Props) {
  const [liked, setLiked] = useState(userLiked)
  const [count, setCount] = useState(likesCount)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggleLike(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return

    const prevLiked = liked
    const prevCount = count
    setLiked(!prevLiked)
    setCount((c) => (prevLiked ? Math.max(0, c - 1) : c + 1))
    setBusy(true)
    setError(null)

    try {
      const res = await apiFetch(`${API_URL}/day-pages/${pageId}/like`, {
        method: "POST",
      })
      if (!res.ok) throw new Error("Could not update your like.")
    } catch {
      setLiked(prevLiked)
      setCount(prevCount)
      setError("Could not update your like. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-12 items-center gap-5 px-4 py-2 sm:px-5">
      <button
        onClick={toggleLike}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition hover:bg-(--dk-mist)/70 hover:text-(--dk-sky) disabled:opacity-60"
        disabled={busy}
        style={{ color: liked ? "var(--dk-sky)" : "var(--dk-slate)" }}
        aria-pressed={liked}
        aria-label={liked ? "Unlike" : "Like"}
        aria-busy={busy}
      >
        <Heart
          size={14}
          strokeWidth={2}
          style={{
            fill: liked ? "var(--dk-sky)" : "none",
            color: liked ? "var(--dk-sky)" : "var(--dk-slate)",
          }}
        />
        <span>{count}</span>
      </button>

      <button
        type="button"
        onClick={onCommentClick}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-(--dk-slate) transition hover:bg-(--dk-mist)/70 hover:text-(--dk-sky)"
        aria-label="Jump to comments"
      >
        <MessageCircle size={14} strokeWidth={2} />
        <span>{commentsCount}</span>
      </button>

      {error ? (
        <span role="status" className="ml-auto text-xs text-(--dk-error)">
          {error}
        </span>
      ) : null}
    </div>
  )
}
