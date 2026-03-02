"use client"

import { useParams, useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { ArrowLeft, Pencil, Trash2, Flag, Ban } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import PostDetailCard from "@/components/Post/PostDetailCard"
import PostDetailSkeleton from "@/components/Post/PostDetailSkeleton"
import CommentsSkeleton from "@/components/Post/CommentsSkeleton"
import CommentsSection from "@/components/Post/CommentsSection"
import ContentHeader from "@/components/common/ContentHeader"
import DeleteEntityModal from "@/components/common/DeleteEntityModal"

import { usePostDetail } from "@/hooks/usePostDetail"
import { useMe } from "@/lib/useMe"
import formatDDMMYYYY from "@/utils/formatDate"

function formatPostedAt(s?: string) {
  if (!s) return ""
  const d = new Date(s)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export default function PostPage() {
  const { postId } = useParams<{ postId: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const q: any = usePostDetail(postId)
  const me = useMe()

  const loading = q.isLoading
  const error = q.error ? (q.error as any).message : null

  const post = q.data?.post ?? null
  const user = q.data?.user ?? null
  const postedAt = q.data?.postedAt ?? ""

  const isOwner =
    !!me?._id && !!user?._id && String(me._id) === String(user._id)

  const stamp = useMemo(() => formatPostedAt(postedAt), [postedAt])
  const edited = useMemo(
    () => formatDDMMYYYY(q.data?.post?.edited_at ?? ""),
    [postedAt],
  )

  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <main className="pb-20 lg:pb-0">
      <div className="max-w-2xl mx-auto border-x border-(--dk-ink)/10 bg-(--dk-paper) min-h-screen">
        <div className="sticky top-0 bg-(--dk-paper)/95 backdrop-blur-md">
          <div className="h-1 w-full bg-(--dk-sky)/70" />
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-(--dk-mist) transition"
              aria-label="Back"
            >
              <ArrowLeft size={18} className="text-(--dk-ink)" />
            </button>

            <div className="leading-tight">
              <div className="text-sm font-semibold text-(--dk-ink)">Post</div>
              <div className="text-xs text-(--dk-slate)">Details</div>
            </div>
          </div>
        </div>

        {loading && (
          <>
            <PostDetailSkeleton />
            <CommentsSkeleton />
          </>
        )}

        {!loading && error && (
          <div className="px-4 py-6 text-sm text-red-500">{error}</div>
        )}

        {!loading && !error && post && user && (
          <>
            {/* Header row now lives here */}
            <div className="px-4 pt-4">
              <ContentHeader
                user={user}
                stamp={stamp}
                editedDate={edited}
                privacy={post.privacy}
                menuItems={
                  isOwner
                    ? [
                        {
                          key: "edit",
                          label: "Edit post",
                          icon: <Pencil size={16} />,
                          onClick: () => router.push(`/post/${post.id}/edit`),
                        },
                        {
                          key: "delete",
                          label: "Delete post",
                          icon: <Trash2 size={16} />,
                          variant: "danger",
                          onClick: () => setDeleteOpen(true),
                        },
                      ]
                    : [
                        {
                          key: "report",
                          label: "Report post",
                          icon: <Flag size={16} />,
                          onClick: () =>
                            router.push(
                              `/report?user=${encodeURIComponent(
                                String(user?._id || ""),
                              )}&post=${encodeURIComponent(String(post.id))}`,
                            ),
                        },
                        {
                          key: "block",
                          label: "Block user",
                          icon: <Ban size={16} />,
                          variant: "danger",
                          onClick: () =>
                            router.push(
                              `/block?user=${encodeURIComponent(
                                String(user?._id || ""),
                              )}`,
                            ),
                        },
                      ]
                }
              />
            </div>

            {/* content-only card */}
            <PostDetailCard post={post} onRefreshMedia={q.refetch} />

            <CommentsSection postId={post.id} />

            <DeleteEntityModal
              open={deleteOpen}
              onClose={() => setDeleteOpen(false)}
              onDeleted={() => {
                qc.removeQueries({ queryKey: ["postDetail", postId] })
                router.back()
              }}
              entityLabel="post"
              entityId={String(post.id)}
              buildPath={({ id }) => `/post/${encodeURIComponent(id)}`}
              confirmTitle="Delete post"
              confirmButtonText="Delete post"
              successTitle="Post deleted"
            />
          </>
        )}
      </div>
    </main>
  )
}
