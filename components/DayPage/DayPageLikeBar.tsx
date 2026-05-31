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
}

export default function DayPageLikeBar({
  pageId,
  likesCount,
  commentsCount,
  userLiked,
}: Props) {
  const [liked, setLiked] = useState(userLiked)
  const [count, setCount] = useState(likesCount)
  const [busy, setBusy] = useState(false)

  async function toggleLike(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return

    const prevLiked = liked
    const prevCount = count
    setLiked(!prevLiked)
    setCount((c) => (prevLiked ? Math.max(0, c - 1) : c + 1))
    setBusy(true)

    try {
      const res = await apiFetch(`${API_URL}/day-pages/${pageId}/like`, {
        method: "POST",
      })
      if (!res.ok) throw new Error()
    } catch {
      setLiked(prevLiked)
      setCount(prevCount)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-5 px-3 py-2">
      <button
        onClick={toggleLike}
        className="flex items-center gap-1.5 text-xs transition hover:text-(--dk-sky)"
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

      <span className="flex items-center gap-1.5 text-xs text-(--dk-slate)">
        <MessageCircle size={14} strokeWidth={2} />
        <span>{commentsCount}</span>
      </span>
    </div>
  )
}
