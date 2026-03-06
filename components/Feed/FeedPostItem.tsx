"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import {
  Clock,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Flag,
  Pencil,
  Trash2,
} from "lucide-react"
import FeedPostMediaStrip from "./FeedPostMediaStrip"
import { apiFetch } from "@/lib/authClient"
import { useRouter } from "next/navigation"
import PrivacyChip from "@/components/common/PrivacyChip"
import { API_URL } from "@/config"
import formatDDMMYYYY from "@/utils/formatDate"
import DeleteEntityModal from "@/components/common/DeleteEntityModal"
import ReportEntityModal from "@/components/common/ReportEntityModal"
import { useQueryClient } from "@tanstack/react-query"
import RichText from "@/components/common/RichText"

type Props = {
  post: any
  isLast: boolean
  isOwner?: boolean
  onRefreshMedia?: (() => void | Promise<unknown>) | null
}

export default function FeedPostItem({ post, isLast, onRefreshMedia }: Props) {
  const isOwner = useMemo(() => post?.isOwner, [post?.isOwner])

  const [liked, setLiked] = useState(!!post.userLiked)
  const [likesCount, setLikesCount] = useState<number>(post.likes ?? 0)
  const [likeBusy, setLikeBusy] = useState(false)

  const router = useRouter()
  const qc = useQueryClient()
  const postId = useMemo(() => post.id, [post.id])

  // menu state
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // report modal
  const [reportOpen, setReportOpen] = useState(false)

  // delete modal
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false)
    }

    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onEsc)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onEsc)
    }
  }, [])

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
      const res = await apiFetch(`${API_URL}/post/${postId}/like`, {
        method: "POST",
        cache: "no-store",
      })

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

  return (
    <div className="relative">
      {/* dot */}
      <div
        className="absolute top-5 hidden h-2.5 w-2.5 rounded-full bg-(--dk-sky) sm:block"
        style={{ left: 0, transform: "translateX(-50%)" }}
      />

      {/* connector */}
      {!isLast ? (
        <div
          className="absolute top-6 hidden w-px bg-(--dk-sky)/40 sm:block"
          style={{
            left: 0,
            transform: "translateX(-50%)",
            height: "calc(100% + 0.25rem)",
          }}
        />
      ) : null}

      {/* card */}
      <div
        className="ml-0 sm:ml-7 rounded-xl sm:rounded-lg px-2.5 sm:px-3 py-3 transition cursor-pointer hover:bg-(--dk-mist)/35 active:bg-(--dk-mist)/45"
        onClick={() => router.push(`/post/${post.id}`)}
      >
        {/* top row with menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <Clock size={13} className="text-(--dk-slate)" />
            <span className="font-medium text-(--dk-slate)">
              {post?.time?.toLowerCase() || ""}
            </span>

            {post?.edited_at ? (
              <span className="inline-flex items-center gap-1 font-medium text-(--dk-slate)">
                <Pencil size={12} className="text-(--dk-slate)" />
                <span>{formatDDMMYYYY(post.edited_at)}</span>
              </span>
            ) : null}

            <PrivacyChip privacy={post.privacy} />
          </div>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setMenuOpen((v) => !v)
              }}
              className="rounded-lg p-1.5 text-(--dk-slate) transition hover:bg-(--dk-paper) hover:text-(--dk-ink)"
              aria-label="Options"
            >
              <MoreHorizontal size={16} />
            </button>

            {menuOpen ? (
              <div
                className="absolute right-0 mt-2 w-44 rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) shadow-lg overflow-hidden z-20"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                {isOwner ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        router.push(`/post/${post.id}/edit`)
                      }}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition text-(--dk-ink) hover:bg-(--dk-ink)/5"
                    >
                      <Pencil size={16} />
                      Edit post
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        setDeleteOpen(true)
                      }}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition text-(--dk-error) hover:bg-(--dk-error)/10"
                    >
                      <Trash2 size={16} />
                      Delete post
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      setReportOpen(true)
                    }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition text-(--dk-ink) hover:bg-(--dk-ink)/5"
                  >
                    <Flag size={16} />
                    Report post
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-(--dk-ink)">
          <RichText text={String(post.content || "")} />
        </p>

        <FeedPostMediaStrip
          media={post.media}
          onRefreshMedia={onRefreshMedia}
          entityKey={`feed-post:${post.id}`}
        />

        <div className="mt-3 flex items-center gap-6 text-(--dk-slate)">
          <button
            onClick={toggleLike}
            className="flex items-center gap-1.5 text-xs cursor-pointer transition hover:text-(--dk-sky)"
            style={{ color: liked ? "var(--dk-sky)" : "var(--dk-slate)" }}
            aria-pressed={liked}
            aria-label={liked ? "Unlike" : "Like"}
            aria-busy={likeBusy}
          >
            <Heart
              size={14}
              strokeWidth={2}
              className="transition"
              style={{
                fill: liked ? "var(--dk-sky)" : "none",
                color: liked ? "var(--dk-sky)" : "var(--dk-slate)",
              }}
            />
            <span>{likesCount}</span>
          </button>

          <button
            className="flex items-center gap-1.5 text-xs cursor-pointer transition hover:text-(--dk-sky)"
            style={{
              color: post.userCommented ? "var(--dk-sky)" : "var(--dk-slate)",
            }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              router.push(`/post/${post.id}`)
            }}
          >
            <MessageCircle
              size={14}
              strokeWidth={2}
              className="transition"
              style={{
                fill: post.userCommented ? "var(--dk-sky)" : "none",
                color: post.userCommented ? "var(--dk-sky)" : "var(--dk-slate)",
              }}
            />
            <span>{post.comments ?? 0}</span>
          </button>
        </div>
      </div>

      {/* report modal (generic) */}
      <ReportEntityModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        entityLabel="post"
        entityId={String(postId)}
        buildPath={({ id }) => `/post/${encodeURIComponent(id)}/report`}
        onReported={() => {}}
      />

      {/* delete modal */}
      <DeleteEntityModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => {
          qc.removeQueries({ queryKey: ["postDetail", postId] })
          router.refresh()
        }}
        entityLabel="post"
        entityId={String(postId)}
        buildPath={({ id }) => `/post/${encodeURIComponent(id)}`}
        confirmTitle="Delete post"
        confirmButtonText="Delete post"
        successTitle="Post deleted"
      />
    </div>
  )
}
