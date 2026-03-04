import type { SearchType } from "@/hooks/useSearch"
import {
  resolveMainMediaUrl,
  resolveProfilePictureUrl,
  resolveThumbMediaUrl,
} from "@/lib/media"

export const AVATAR_FALLBACK = "/avatar-placeholder.png"

function stableId(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number") {
    const out = String(value).trim()
    return out || null
  }
  if (value && typeof value === "object") {
    const obj = value as { $oid?: unknown; id?: unknown; _id?: unknown }
    if (typeof obj.$oid === "string" || typeof obj.$oid === "number") {
      const out = String(obj.$oid).trim()
      if (out) return out
    }
    if (typeof obj.id === "string" || typeof obj.id === "number") {
      const out = String(obj.id).trim()
      if (out) return out
    }
    if (typeof obj._id === "string" || typeof obj._id === "number") {
      const out = String(obj._id).trim()
      if (out) return out
    }
  }
  return null
}

export function getTitle(item: any, type: SearchType) {
  if (type === "User") return item?.displayName || item?.username || "User"
  if (type === "Post") return item?.data || "Post"
  if (type === "Event") return item?.title || item?.name || "Event"
  if (type === "Task") return item?.title || item?.data || "Task"
  return "Result"
}

export function getSubtitle(item: any, type: SearchType) {
  if (type === "User") {
    const username = item?.username ? `@${item.username}` : ""
    const bio = item?.bio || ""
    return [username, bio].filter(Boolean).join(" • ")
  }

  const ui = item?.user_info
  const display = ui?.displayName || (ui?.username ? `@${ui.username}` : "")
  const privacy = item?.privacy || item?.status || ""
  const created = item?.created_at || item?.date
  const createdText = created ? new Date(created).toLocaleString() : ""
  return [display, privacy, createdText].filter(Boolean).join(" • ")
}

export function getAvatar(item: any, type: SearchType) {
  if (type === "User") return resolveProfilePictureUrl(item, AVATAR_FALLBACK)
  return resolveProfilePictureUrl(item?.user_info, AVATAR_FALLBACK)
}

export function pickThumb(item: any) {
  const arr = Array.isArray(item?.media) ? item.media : []
  const first = arr[0]
  if (!first) return null
  return resolveThumbMediaUrl(first) || resolveMainMediaUrl(first) || null
}

export function getHref(item: any, type: SearchType) {
  if (type === "User") {
    if (item?.username) return `/${encodeURIComponent(item.username)}`
    const id = stableId(item?._id)
    if (id) return `/${encodeURIComponent(id)}`
    return null
  }
  const id = stableId(item?._id)
  if (!id) return null
  if (type === "Post") return `/post/${encodeURIComponent(id)}`
  if (type === "Event") return `/event/${encodeURIComponent(id)}`
  if (type === "Task") return `/task/${encodeURIComponent(id)}`
  return null
}
