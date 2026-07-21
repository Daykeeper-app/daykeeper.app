"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { ChevronDown, ChevronUp, Reply, Trash2 } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import { API_URL } from "@/config"
import type { DayPageComment } from "@/hooks/useDayPageComments"
import { useDayPageReplies } from "@/hooks/useDayPageComments"
import { apiFetch } from "@/lib/authClient"
import { resolveProfilePictureUrl } from "@/lib/media"
import { isSameUsername } from "@/lib/ownership"
import { useMe } from "@/lib/useMe"
import { LoadingSpinner } from "@/components/common/LoadingIndicator"
import RichText from "@/components/common/RichText"
import RichTextarea from "@/components/common/RichTextarea"

const AVATAR_FALLBACK = "/avatar-placeholder.png"

function formatRelative(dateString: string) {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ""
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  if (seconds < 60) return "now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}

async function responseError(res: Response, fallback: string) {
  const json = await res.json().catch(() => null)
  return new Error(json?.message || fallback)
}

type Props = {
  comment: DayPageComment
  pageId: string
  pageOwnerUsername: string
  onDeleted: () => void
}

export default function DayPageCommentItem({
  comment,
  pageId,
  pageOwnerUsername,
  onDeleted,
}: Props) {
  const me = useMe()
  const queryClient = useQueryClient()
  const [replyOpen, setReplyOpen] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const [reply, setReply] = useState("")
  const [replyBusy, setReplyBusy] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [replyCount, setReplyCount] = useState(comment.repliesCount ?? 0)
  const replies = useDayPageReplies(comment._id, showReplies)

  const canDelete =
    isSameUsername(me?.username, comment.user?.username) ||
    isSameUsername(me?.username, pageOwnerUsername)

  async function submitReply() {
    const value = reply.trim()
    if (!value || replyBusy) return
    setReplyBusy(true)
    setError(null)
    try {
      const res = await apiFetch(
        `${API_URL}/day-pages/comment/${encodeURIComponent(comment._id)}/reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment: value, dayPageId: pageId }),
        },
      )
      if (!res.ok) throw await responseError(res, "Could not post your reply.")
      setReply("")
      setReplyOpen(false)
      setShowReplies(true)
      setReplyCount((count) => count + 1)
      await replies.reload()
      void queryClient.invalidateQueries({ queryKey: ["dayPageComments", pageId] })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not post your reply.")
    } finally {
      setReplyBusy(false)
    }
  }

  async function deleteComment() {
    if (!canDelete || deleteBusy) return
    setDeleteBusy(true)
    setError(null)
    try {
      const res = await apiFetch(
        `${API_URL}/day-pages/comment/${encodeURIComponent(comment._id)}`,
        { method: "DELETE" },
      )
      if (!res.ok) throw await responseError(res, "Could not delete this comment.")
      onDeleted()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete this comment.")
      setDeleteBusy(false)
    }
  }

  const displayName =
    comment.user?.displayName || comment.user?.username || "Daykeeper user"

  return (
    <article className="border-b border-(--dk-ink)/10 px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3">
        <Link href={`/${comment.user.username}`} className="shrink-0">
          <Image
            src={resolveProfilePictureUrl(comment.user, AVATAR_FALLBACK)}
            alt={`${displayName}'s profile picture`}
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg object-cover"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <Link
              href={`/${comment.user.username}`}
              className="truncate text-sm font-semibold text-(--dk-ink) hover:underline"
            >
              {displayName}
            </Link>
            <span className="truncate text-xs text-(--dk-slate)">
              @{comment.user.username}
            </span>
            <time
              dateTime={comment.created_at}
              className="shrink-0 text-xs text-(--dk-slate)"
            >
              · {formatRelative(comment.created_at)}
            </time>
          </div>

          <div className="mt-1 text-[15px] leading-relaxed text-(--dk-ink)">
            <RichText text={String(comment.comment || "")} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
            <button
              type="button"
              onClick={() => setReplyOpen((open) => !open)}
              className="inline-flex items-center gap-1 text-(--dk-slate) transition hover:text-(--dk-sky)"
              aria-expanded={replyOpen}
            >
              <Reply size={13} />
              Reply
            </button>

            {replyCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowReplies((show) => !show)}
                className="inline-flex items-center gap-1 text-(--dk-sky) transition hover:text-(--dk-ink)"
                aria-expanded={showReplies}
              >
                {showReplies ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {showReplies
                  ? "Hide replies"
                  : `${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
              </button>
            ) : null}

            {canDelete ? (
              <button
                type="button"
                onClick={deleteComment}
                disabled={deleteBusy}
                className="inline-flex items-center gap-1 text-(--dk-error) opacity-80 transition hover:opacity-100 disabled:opacity-50"
              >
                {deleteBusy ? <LoadingSpinner size={13} /> : <Trash2 size={13} />}
                Delete
              </button>
            ) : null}
          </div>

          {replyOpen ? (
            <div className="mt-3 rounded-xl bg-(--dk-mist)/45 p-3">
              <RichTextarea
                value={reply}
                onChange={setReply}
                rows={2}
                placeholder={`Reply to @${comment.user.username}…`}
                renderPreview={false}
              />
              <div className="mt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setReplyOpen(false)
                    setError(null)
                  }}
                  className="text-xs text-(--dk-slate) hover:text-(--dk-ink)"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitReply}
                  disabled={replyBusy || !reply.trim()}
                  className="inline-flex min-w-16 items-center justify-center rounded-lg bg-(--dk-sky) px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {replyBusy ? <LoadingSpinner size={14} /> : "Reply"}
                </button>
              </div>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="mt-2 text-xs text-(--dk-error)">
              {error}
            </p>
          ) : null}

          {showReplies ? (
            <div className="mt-4 space-y-3 border-l border-(--dk-ink)/10 pl-4">
              {replies.loading ? (
                <LoadingSpinner size={14} className="py-2 text-(--dk-slate)" />
              ) : replies.error ? (
                <button
                  type="button"
                  onClick={() => replies.reload()}
                  className="text-xs text-(--dk-error) underline"
                >
                  Could not load replies. Try again.
                </button>
              ) : replies.items.length === 0 ? (
                <p className="text-xs text-(--dk-slate)">No replies yet.</p>
              ) : (
                replies.items.map((item) => (
                  <DayPageReplyItem
                    key={item._id}
                    reply={item}
                    pageOwnerUsername={pageOwnerUsername}
                    onDeleted={() => void replies.reload()}
                  />
                ))
              )}

              {replies.hasMore ? (
                <button
                  type="button"
                  onClick={replies.loadMore}
                  disabled={replies.loadingMore}
                  className="text-xs font-medium text-(--dk-sky) disabled:opacity-50"
                >
                  {replies.loadingMore ? <LoadingSpinner size={13} /> : "Show more replies"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function DayPageReplyItem({
  reply,
  pageOwnerUsername,
  onDeleted,
}: {
  reply: DayPageComment
  pageOwnerUsername: string
  onDeleted: () => void
}) {
  const me = useMe()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canDelete =
    isSameUsername(me?.username, reply.user?.username) ||
    isSameUsername(me?.username, pageOwnerUsername)
  const displayName = reply.user?.displayName || reply.user?.username || "Daykeeper user"

  async function deleteReply() {
    if (!canDelete || busy) return
    setBusy(true)
    try {
      const res = await apiFetch(
        `${API_URL}/day-pages/comment/${encodeURIComponent(reply._id)}`,
        { method: "DELETE" },
      )
      if (!res.ok) throw await responseError(res, "Could not delete this reply.")
      onDeleted()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete this reply.")
      setBusy(false)
    }
  }

  return (
    <div className="flex items-start gap-2">
      <Link href={`/${reply.user.username}`} className="shrink-0">
        <Image
          src={resolveProfilePictureUrl(reply.user, AVATAR_FALLBACK)}
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 rounded-md object-cover"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <Link
            href={`/${reply.user.username}`}
            className="truncate text-sm font-semibold text-(--dk-ink) hover:underline"
          >
            {displayName}
          </Link>
          <time className="shrink-0 text-xs text-(--dk-slate)" dateTime={reply.created_at}>
            {formatRelative(reply.created_at)}
          </time>
        </div>
        <div className="mt-0.5 text-sm leading-relaxed text-(--dk-ink)">
          <RichText text={String(reply.comment || "")} />
        </div>
        {canDelete ? (
          <button
            type="button"
            onClick={deleteReply}
            disabled={busy}
            className="mt-1 inline-flex items-center gap-1 text-xs text-(--dk-error) opacity-80 disabled:opacity-50"
          >
            {busy ? <LoadingSpinner size={12} /> : <Trash2 size={12} />}
            Delete
          </button>
        ) : null}
        {error ? <p className="mt-1 text-xs text-(--dk-error)">{error}</p> : null}
      </div>
    </div>
  )
}
