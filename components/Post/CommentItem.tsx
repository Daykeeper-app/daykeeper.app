"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"
import { Heart, Trash2 } from "lucide-react"
import type { PostComment } from "@/hooks/usePostComments"
import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"
import { useMe } from "@/lib/useMe"
import { useCommentReplies } from "@/hooks/useCommentReplies"
import RichText from "@/components/common/RichText"
import RichTextarea from "@/components/common/RichTextarea"
import { resolveProfilePictureUrl } from "@/lib/media"

const AVATAR_FALLBACK = "/avatar-placeholder.png"

function formatRelative(dateStr: string) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ""
  const diff = Date.now() - d.getTime()

  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  return `${day}d`
}

export default function CommentItem({ c }: { c: PostComment }) {
  const avatar = resolveProfilePictureUrl(c.user, AVATAR_FALLBACK)
  const handle = c.user?.username ? `@${c.user.username}` : ""
  const me = useMe()
  const isOwner = !!me?._id && me._id === c.user?._id

  const [liked, setLiked] = useState(!!c.userLiked)
  const [likeCount, setLikeCount] = useState<number>(
    Number.isFinite(c.likesCount) ? (c.likesCount as number) : 0
  )
  const [replyCount, setReplyCount] = useState<number>(
    Number.isFinite(c.repliesCount) ? (c.repliesCount as number) : 0
  )
  const [likeBusy, setLikeBusy] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [reply, setReply] = useState("")
  const [replyBusy, setReplyBusy] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const [localDeleted, setLocalDeleted] = useState(false)

  const replies = useCommentReplies(c._id, showReplies)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !showReplies) return

    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        if (replies.hasMore && !replies.loadingMore) replies.loadMore()
      },
      { rootMargin: "400px" }
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [showReplies, replies])

  useEffect(() => {
    setLiked(!!c.userLiked)
    setLikeCount(
      Number.isFinite(c.likesCount) ? (c.likesCount as number) : 0
    )
    setReplyCount(
      Number.isFinite(c.repliesCount) ? (c.repliesCount as number) : 0
    )
  }, [c.userLiked, c.likesCount, c.repliesCount])

  async function toggleLike() {
    if (likeBusy) return
    setLikeBusy(true)
    const prevLiked = liked
    const prevCount = likeCount

    const nextLiked = !prevLiked
    setLiked(nextLiked)
    setLikeCount((v) => {
      const base = Number.isFinite(v) ? v : 0
      return nextLiked ? base + 1 : Math.max(0, base - 1)
    })

    try {
      const res = await apiFetch(
        `${API_URL}/post/comment/${encodeURIComponent(c._id)}/like`,
        { method: "POST" }
      )
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Request failed (${res.status})`)
      }
    } catch {
      setLiked(prevLiked)
      setLikeCount(prevCount)
    } finally {
      setLikeBusy(false)
    }
  }

  async function submitReply() {
    if (!reply.trim() || replyBusy) return
    setReplyBusy(true)

    try {
      const res = await apiFetch(
        `${API_URL}/post/comment/${encodeURIComponent(c._id)}/reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment: reply.trim() }),
        }
      )
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Request failed (${res.status})`)
      }
      setReply("")
      setReplyOpen(false)
      setShowReplies(true)
      setReplyCount((v) => v + 1)
      replies.reload()
    } catch {
    } finally {
      setReplyBusy(false)
    }
  }

  async function deleteComment() {
    if (!isOwner || likeBusy) return
    setLikeBusy(true)
    try {
      const res = await apiFetch(
        `${API_URL}/post/comment/${encodeURIComponent(c._id)}`,
        { method: "DELETE" }
      )
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Request failed (${res.status})`)
      }
      setLocalDeleted(true)
    } catch {
    } finally {
      setLikeBusy(false)
    }
  }

  const relative = useMemo(() => formatRelative(c.created_at), [c.created_at])

  if (localDeleted) {
    return (
      <div className="px-4 py-4 border-b border-(--dk-ink)/10 text-sm text-(--dk-slate)">
        Comment deleted.
      </div>
    )
  }

  return (
    <div className="px-4 py-4 border-b border-(--dk-ink)/10">
      <div className="flex items-start gap-3">
        <Image
          src={avatar}
          alt={c.user?.username || "User"}
          width={36}
          height={36}
          className="h-9 w-9 rounded-md object-cover"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-(--dk-ink) truncate">
              {c.user?.username}
            </span>
            <span className="text-sm text-(--dk-slate) truncate">{handle}</span>
            <span className="text-sm text-(--dk-slate)">·</span>
            <span className="text-sm text-(--dk-slate)">{relative}</span>
          </div>

          <p className="mt-1 text-(--dk-ink) text-[15px] leading-relaxed whitespace-pre-wrap">
            <RichText text={String(c.comment || "")} />
          </p>

          <div className="mt-2 flex items-center gap-4 text-xs text-(--dk-slate)">
            <button
              type="button"
              onClick={toggleLike}
              className={[
                "inline-flex items-center gap-1 transition hover:text-(--dk-sky)",
                likeBusy ? "opacity-60" : "",
              ].join(" ")}
              style={{ color: liked ? "var(--dk-sky)" : "var(--dk-slate)" }}
              aria-busy={likeBusy}
            >
              <Heart
                size={14}
                className="transition"
                style={{
                  fill: liked ? "var(--dk-sky)" : "none",
                  color: liked ? "var(--dk-sky)" : "var(--dk-slate)",
                }}
              />
              <span>{likeCount}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setReplyOpen((v) => !v)
              }}
              className="text-xs hover:text-(--dk-sky) transition"
              style={{ color: "var(--dk-slate)" }}
            >
              Reply
            </button>

            {replyCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowReplies((v) => !v)}
                className="hover:text-(--dk-sky) transition"
                style={{ color: "var(--dk-slate)" }}
              >
                {showReplies
                  ? "Hide replies"
                  : `Show replies (${replyCount})`}
              </button>
            ) : null}

            {isOwner ? (
              <button
                type="button"
                onClick={deleteComment}
                className="inline-flex items-center gap-1 text-red-500 hover:text-red-600 transition"
              >
                <Trash2 size={14} />
                Delete
              </button>
            ) : null}
          </div>

          {replyOpen ? (
            <div className="mt-3">
              <RichTextarea
                value={reply}
                onChange={setReply}
                rows={2}
                placeholder="Write a reply…"
                renderPreview={false}
              />
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReplyOpen(false)}
                  className="text-xs text-(--dk-slate) hover:text-(--dk-ink) transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitReply}
                  disabled={replyBusy || !reply.trim()}
                  className="px-3 py-1.5 rounded-xl bg-(--dk-sky) text-white text-xs font-medium disabled:opacity-60"
                >
                  {replyBusy ? "Posting..." : "Reply"}
                </button>
              </div>
            </div>
          ) : null}

          {showReplies ? (
            <div className="mt-4 border-l border-(--dk-ink)/10 pl-4 space-y-3">
              {replies.loading ? (
                <div className="text-xs text-(--dk-slate)">Loading replies…</div>
              ) : replies.items.length === 0 ? (
                <div className="text-xs text-(--dk-slate)">No replies yet.</div>
              ) : (
                replies.items.map((r) => (
                  <ReplyItem key={r._id} reply={r} />
                ))
              )}

              {replies.loadingMore ? (
                <div className="text-xs text-(--dk-slate)">Loading more…</div>
              ) : null}

              {!replies.loading &&
              !replies.loadingMore &&
              replies.hasMore ? (
                <button
                  type="button"
                  onClick={() => replies.loadMore()}
                  className="text-xs text-(--dk-sky) hover:text-(--dk-ink) transition"
                >
                  Show more replies
                </button>
              ) : null}

              <div ref={sentinelRef} className="h-1" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ReplyItem({ reply }: { reply: PostComment }) {
  const [liked, setLiked] = useState(!!reply.userLiked)
  const [likeCount, setLikeCount] = useState<number>(
    Number.isFinite(reply.likesCount) ? (reply.likesCount as number) : 0
  )
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setLiked(!!reply.userLiked)
    setLikeCount(
      Number.isFinite(reply.likesCount) ? (reply.likesCount as number) : 0
    )
  }, [reply.userLiked, reply.likesCount])

  async function toggleLike() {
    if (busy) return
    setBusy(true)
    const prevLiked = liked
    const prevCount = likeCount
    const nextLiked = !prevLiked
    setLiked(nextLiked)
    setLikeCount((v) => {
      const base = Number.isFinite(v) ? v : 0
      return nextLiked ? base + 1 : Math.max(0, base - 1)
    })

    try {
      const res = await apiFetch(
        `${API_URL}/post/comment/${encodeURIComponent(reply._id)}/like`,
        { method: "POST" }
      )
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Request failed (${res.status})`)
      }
    } catch {
      setLiked(prevLiked)
      setLikeCount(prevCount)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-start gap-2">
      <Image
        src={resolveProfilePictureUrl(reply.user, AVATAR_FALLBACK)}
        alt={reply.user?.username || "User"}
        width={28}
        height={28}
        className="h-7 w-7 rounded-md object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-(--dk-ink) text-sm truncate">
            {reply.user?.username}
          </span>
          <span className="text-xs text-(--dk-slate)">
            {formatRelative(reply.created_at)}
          </span>
        </div>
        <p className="mt-0.5 text-(--dk-ink) text-sm leading-relaxed whitespace-pre-wrap">
          <RichText text={String(reply.comment || "")} />
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-(--dk-slate)">
            <button
              type="button"
              onClick={toggleLike}
              className={[
                "inline-flex items-center gap-1 transition hover:text-(--dk-sky)",
                busy ? "opacity-60" : "",
              ].join(" ")}
              style={{ color: liked ? "var(--dk-sky)" : "var(--dk-slate)" }}
              aria-busy={busy}
            >
            <Heart
              size={12}
              className="transition"
              style={{
                fill: liked ? "var(--dk-sky)" : "none",
                color: liked ? "var(--dk-sky)" : "var(--dk-slate)",
              }}
            />
            <span>{likeCount}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
