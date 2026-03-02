import type { SearchType } from "@/hooks/useSearch"
import {
  resolveMainMediaUrl,
  resolveProfilePictureUrl,
  resolveThumbMediaUrl,
} from "@/lib/media"

export const AVATAR_FALLBACK = "/avatar-placeholder.png"

export function getTitle(item: any, type: SearchType) {
  if (type === "User") return item?.displayName || item?.username || "User"
  if (type === "Post") return item?.data || "Post"
  if (type === "Event") return item?.title || item?.name || "Event"
  if (type === "Note") return item?.title || item?.data || "Note"
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
    if (item?._id) return `/${encodeURIComponent(String(item._id))}`
    return null
  }
  if (type === "Post")
    return item?._id ? `/post/${encodeURIComponent(String(item._id))}` : null
  if (type === "Event")
    return item?._id ? `/event/${encodeURIComponent(String(item._id))}` : null
  if (type === "Note")
    return item?._id ? `/note/${encodeURIComponent(String(item._id))}` : null
  if (type === "Task")
    return item?._id ? `/task/${encodeURIComponent(String(item._id))}` : null
  return null
}
