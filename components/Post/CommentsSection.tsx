"use client"

import { useEffect, useRef, useState } from "react"
import CommentItem from "./CommentItem"
import { usePostComments } from "@/hooks/usePostComments"
import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"
import RichTextarea from "@/components/common/RichTextarea"
import { CenteredSpinner, LoadingSpinner } from "@/components/common/LoadingIndicator"
import { LoadingRows } from "@/components/common/LoadingSkeleton"

export default function CommentsSection({ postId }: { postId: string }) {
  const {
    items,
    loading,
    loadingFirst,
    loadingMore,
    error,
    hasMore,
    loadMore,
    reload,
  } = usePostComments(postId)
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // refs to avoid recreating observer all the time
  const hasMoreRef = useRef(hasMore)
  const loadingRef = useRef(loading)
  const loadingMoreRef = useRef(loadingMore)

  useEffect(() => {
    hasMoreRef.current = hasMore
    loadingRef.current = loading
    loadingMoreRef.current = loadingMore
  }, [hasMore, loading, loadingMore])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (!first?.isIntersecting) return

        if (!hasMoreRef.current) return
        if (loadingRef.current) return
        if (loadingMoreRef.current) return

        loadMore()
      },
      { root: null, rootMargin: "600px", threshold: 0 }
    )

    io.observe(el)
    return () => io.disconnect()
  }, [loadMore])

  async function submitComment() {
    if (busy) return
    if (!text.trim()) return

    setBusy(true)
    setFormError(null)

    try {
      const res = await apiFetch(`${API_URL}/post/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: text.trim() }),
      })
      if (!res.ok) {
        const t = await res.text().catch(() => "")
        throw new Error(t || `Request failed (${res.status})`)
      }
      setText("")
      reload()
    } catch (e: any) {
      setFormError(e?.message || "Failed to add comment")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="border-t border-(--dk-ink)/10">
      <div className="px-4 py-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-(--dk-ink)">Comments</h2>

        {error ? (
          <button
            onClick={reload}
            className="text-xs underline text-(--dk-slate) hover:text-(--dk-ink)"
          >
            Retry
          </button>
        ) : null}
      </div>

      <div className="px-4 pb-4">
        {formError ? (
          <div className="mb-2 text-xs text-(--dk-error)">{formError}</div>
        ) : null}
        <RichTextarea
          value={text}
          onChange={setText}
          rows={2}
          placeholder="Add a comment…"
          renderPreview={false}
        />
        <div className="mt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setText("")}
            className="text-xs text-(--dk-slate) hover:text-(--dk-ink) transition"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={submitComment}
            disabled={busy || !text.trim()}
            className="px-3 py-1.5 rounded-xl bg-(--dk-sky) text-white text-xs font-medium disabled:opacity-60"
          >
            {busy ? <LoadingSpinner size={15} /> : "Post"}
          </button>
        </div>
      </div>

      {loadingFirst && (
        <LoadingRows rows={3} className="pt-2" />
      )}

      {!loadingFirst && items.length === 0 && !error && (
        <div className="px-4 pb-6 text-sm text-(--dk-slate)">
          No comments yet.
        </div>
      )}

      {items.map((c, idx) => (
        <CommentItem
          key={`${c.user?._id || "u"}-${c.created_at}-${idx}`}
          c={c}
        />
      ))}

      {/* sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-px w-full" />

      {loadingMore && (
        <CenteredSpinner className="px-4 py-4" />
      )}

      {!loading && !loadingMore && !hasMore && items.length > 0 && (
        <div className="px-4 py-6 text-xs text-(--dk-slate)/80 text-center">
          You’re all caught up.
        </div>
      )}
    </section>
  )
}
