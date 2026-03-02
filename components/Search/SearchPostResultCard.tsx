"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Heart, MessageCircle } from "lucide-react"

import ContentHeader from "@/components/common/ContentHeader"
import FeedPostMediaStrip from "@/components/Feed/FeedPostMediaStrip"
import RichText from "@/components/common/RichText"

import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"
import formatDDMMYYYY from "@/utils/formatDate"

function formatPostedAt(s?: string) {
  if (!s) return ""
  const d = new Date(s)
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  return `${time} · ${dd}/${mm}/${yyyy}`
}

export default function SearchPostResultCard({
  post,
  onRefreshMedia,
}: {
  post: any
  onRefreshMedia?: (() => void | Promise<unknown>) | null
}) {
  const router = useRouter()

  const postId = useMemo(() => post?.id || post?._id, [post])
  const user = post?.user_info || post?.user || null

  const createdAt = post?.created_at || post?.createdAt || post?.date
  const editedAt = post?.edited_at || post?.editedAt

  const stamp = useMemo(() => formatPostedAt(createdAt), [createdAt])
  const editedDate = useMemo(
    () => (editedAt ? formatDDMMYYYY(editedAt) : ""),
    [editedAt],
  )

  const privacy = post?.privacy || post?.status

  const [liked, setLiked] = useState(!!post?.userLiked)
  const [likesCount, setLikesCount] = useState<number>(Number(post?.likes ?? 0))
  const [likeBusy, setLikeBusy] = useState(false)
  const likeColor = liked ? "var(--dk-sky)" : "var(--dk-slate)"

  async function toggleLike(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (likeBusy) return

    const prevLiked = liked
    const prevCount = likesCount

    const nextLiked = !prevLiked
    setLiked(nextLiked)
    setLikesCount((c) => {
      const base = Number.isFinite(c) ? c : 0
      return nextLiked ? base + 1 : Math.max(0, base - 1)
    })

    setLikeBusy(true)
    try {
      const res = await apiFetch(
        `${API_URL}/post/${encodeURIComponent(String(postId))}/like`,
        { method: "POST", cache: "no-store" },
      )
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Request failed (${res.status})`)
      }
    } catch {
      setLiked(prevLiked)
      setLikesCount(prevCount)
    } finally {
      setLikeBusy(false)
    }
  }

  const content = post?.content ?? post?.data ?? ""
  const comments = Number(post?.comments ?? 0)
  const userCommented = !!post?.userCommented
  const commentColor = userCommented ? "var(--dk-sky)" : "var(--dk-slate)"

  return (
    <div
      className={[
        "cursor-pointer rounded-lg px-3 py-3 transition",
        "hover:bg-(--dk-mist)/35",
      ].join(" ")}
      onClick={() => router.push(`/post/${encodeURIComponent(String(postId))}`)}
    >
      {/* header (avatar, username, @handle, time, edited, privacy chip) */}
      <ContentHeader
        user={user}
        stamp={stamp}
        editedDate={editedDate || undefined}
        privacy={privacy}
        onUserClick={() => {
          const username = user?.username
          if (username) router.push(`/${encodeURIComponent(String(username))}`)
        }}
        // search results: no menu here (you can add later if you want)
        menuItems={[]}
      />

      <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-(--dk-ink)">
        <RichText text={String(content || "")} />
      </p>

      <FeedPostMediaStrip
        media={post?.media || []}
        onRefreshMedia={onRefreshMedia}
        entityKey={`search-post:${postId}`}
      />

      {/* like/comment row (same behavior as your FeedPostItem) */}
      <div className="mt-3 flex items-center gap-6 text-(--dk-slate)">
        <button
          onClick={toggleLike}
          className="flex items-center gap-1.5 text-xs cursor-pointer transition hover:text-(--dk-sky)"
          style={{ color: likeColor }}
          aria-pressed={liked}
          aria-label={liked ? "Unlike" : "Like"}
          aria-busy={likeBusy}
        >
          <Heart
            size={14}
            strokeWidth={2}
            className="transition"
            fill={liked ? "currentColor" : "none"}
          />
          <span>{likesCount}</span>
        </button>

        <button
          className="flex items-center gap-1.5 text-xs cursor-pointer transition hover:text-(--dk-sky)"
          style={{ color: commentColor }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            router.push(`/post/${encodeURIComponent(String(postId))}`)
          }}
        >
          <MessageCircle
            size={14}
            strokeWidth={2}
            className="transition"
            fill={userCommented ? "currentColor" : "none"}
          />
          <span>{comments}</span>
        </button>
      </div>
    </div>
  )
}
