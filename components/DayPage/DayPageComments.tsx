"use client"

import { useEffect, useState } from "react"
import { MessageCircle, Send } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import DayPageCommentItem from "@/components/DayPage/DayPageCommentItem"
import { LoadingSpinner } from "@/components/common/LoadingIndicator"
import { LoadingRows } from "@/components/common/LoadingSkeleton"
import RichTextarea from "@/components/common/RichTextarea"
import { API_URL } from "@/config"
import { useDayPageComments } from "@/hooks/useDayPageComments"
import { apiFetch } from "@/lib/authClient"

type Props = {
  pageId: string
  pageOwnerUsername: string
  onCountChange?: (count: number) => void
}

export default function DayPageComments({
  pageId,
  pageOwnerUsername,
  onCountChange,
}: Props) {
  const queryClient = useQueryClient()
  const comments = useDayPageComments(pageId)
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!comments.loading) onCountChange?.(comments.totalCount)
  }, [comments.loading, comments.totalCount, onCountChange])

  async function submitComment() {
    const value = text.trim()
    if (!value || busy) return
    setBusy(true)
    setFormError(null)
    try {
      const res = await apiFetch(
        `${API_URL}/day-pages/${encodeURIComponent(pageId)}/comment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment: value }),
        },
      )
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.message || "Could not post your comment.")
      }
      setText("")
      await comments.reload()
      void queryClient.invalidateQueries({ queryKey: ["dayPage"] })
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : "Could not post your comment.",
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleted() {
    await comments.reload()
    void queryClient.invalidateQueries({ queryKey: ["dayPage"] })
  }

  return (
    <section id="day-page-comments" className="border-t border-(--dk-ink)/10">
      <div className="flex items-center justify-between px-4 pb-2 pt-4 sm:px-5">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-(--dk-ink)">
            <MessageCircle size={16} />
            Comments
          </h2>
          <p className="mt-0.5 text-xs text-(--dk-slate)">
            Share a thought about this day.
          </p>
        </div>
        {comments.error ? (
          <button
            type="button"
            onClick={() => comments.reload()}
            className="text-xs font-medium text-(--dk-sky) hover:underline"
          >
            Retry
          </button>
        ) : null}
      </div>

      <div id="day-page-comments-composer" className="px-4 pb-4 pt-2 sm:px-5">
        <RichTextarea
          value={text}
          onChange={setText}
          rows={2}
          placeholder="Add a comment…"
          renderPreview={false}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            {formError ? (
              <p role="alert" className="text-xs text-(--dk-error)">
                {formError}
              </p>
            ) : (
              <span className="text-xs text-(--dk-slate)">
                {text.length}/500
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={submitComment}
            disabled={busy || !text.trim() || text.length > 500}
            className="inline-flex min-w-20 items-center justify-center gap-1.5 rounded-lg bg-(--dk-sky) px-3 py-2 text-xs font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <LoadingSpinner size={15} /> : <Send size={14} />}
            {busy ? "Posting" : "Post"}
          </button>
        </div>
      </div>

      {comments.loadingFirst ? <LoadingRows rows={3} className="pt-2" /> : null}

      {!comments.loadingFirst && comments.error ? (
        <div className="px-4 py-6 text-center text-sm text-(--dk-error) sm:px-5">
          Comments could not be loaded.
        </div>
      ) : null}

      {!comments.loadingFirst && !comments.error && comments.items.length === 0 ? (
        <div className="mx-4 mb-5 rounded-xl border border-dashed border-(--dk-ink)/15 bg-(--dk-mist)/30 px-4 py-5 text-center sm:mx-5">
          <MessageCircle size={20} className="mx-auto text-(--dk-slate)" />
          <p className="mt-2 text-sm font-medium text-(--dk-ink)">No comments yet</p>
          <p className="mt-0.5 text-xs text-(--dk-slate)">Be the first to leave one.</p>
        </div>
      ) : null}

      {comments.items.map((comment) => (
        <DayPageCommentItem
          key={comment._id}
          comment={comment}
          pageId={pageId}
          pageOwnerUsername={pageOwnerUsername}
          onDeleted={() => void handleDeleted()}
        />
      ))}

      {comments.hasMore ? (
        <div className="px-4 py-4 text-center sm:px-5">
          <button
            type="button"
            onClick={comments.loadMore}
            disabled={comments.loadingMore}
            className="rounded-lg border border-(--dk-ink)/10 px-4 py-2 text-xs font-medium text-(--dk-ink) transition hover:bg-(--dk-mist)/60 disabled:opacity-50"
          >
            {comments.loadingMore ? <LoadingSpinner size={14} /> : "Show more comments"}
          </button>
        </div>
      ) : null}
    </section>
  )
}
