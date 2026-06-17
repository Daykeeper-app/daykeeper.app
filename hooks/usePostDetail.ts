"use client"

import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/authClient"
import type { FeedPost } from "@/lib/feedTypes"
import { API_URL } from "@/config"
import { isSameUsername } from "@/lib/ownership"

type UserInfo = {
  _id: string
  username: string
  profile_picture?: { url?: string } | null
  timeZone?: string | null
}

type PostDetailResult = {
  post: FeedPost
  user: UserInfo // post owner
  postedAt: string
  isOwner: boolean // NEW
}

async function fetchMe(): Promise<{ _id: string; username: string } | null> {
  try {
    const res = await apiFetch(`${API_URL}/auth/user`, {
      method: "GET",
      cache: "no-store",
    })
    if (!res.ok) return null
    const json = await res.json().catch(() => ({}))
    const me = json?.data || json
    const username = String(me?.username || "")
    if (!username) return null
    return { _id: String(me?._id || ""), username }
  } catch {
    return null
  }
}

async function fetchPostDetail(postId: string): Promise<PostDetailResult> {
  const [me, postRes] = await Promise.all([
    fetchMe(),
    apiFetch(`${API_URL}/post/${encodeURIComponent(postId)}`, {
      method: "GET",
      cache: "no-store",
    }),
  ])

  if (postRes.status === 404) throw new Error("Post not found")

  if (!postRes.ok) {
    const text = await postRes.text().catch(() => "")
    throw new Error(text || `Request failed (${postRes.status})`)
  }

  const json = await postRes.json().catch(() => ({}))
  const raw = json?.data
  if (!raw?._id) throw new Error("Post not found")

  const ui = raw.user_info
  const user: UserInfo = {
    _id: String(ui?._id || ""),
    username: String(ui?.username || ""),
    profile_picture: ui?.profile_picture ?? null,
    timeZone: ui?.timeZone ?? null,
  }

  const post: FeedPost = {
    id: String(raw._id),
    date: raw.date,
    edited_at: raw?.edited_at ?? "",
    time: "",
    content: String(raw.data || ""),
    status: raw.status,
    media: Array.isArray(raw.media) ? raw.media : [],
    privacy: raw.privacy,
    likes: raw.likes ?? 0,
    comments: raw.comments ?? 0,
    userLiked: !!raw.userLiked,
    userCommented: raw.userCommented ?? false,
  }

  const isOwner = isSameUsername(me?.username, user.username)

  return { post, user, postedAt: String(raw.date || ""), isOwner }
}

export function usePostDetail(postId: string | undefined) {
  return useQuery({
    queryKey: ["postDetail", postId],
    enabled: !!postId,
    queryFn: () => fetchPostDetail(String(postId)),
  })
}
