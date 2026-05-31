import type { SearchType } from "@/hooks/useSearch"
import {
  resolveMainMediaUrl,
  resolveProfilePictureUrl,
  resolveThumbMediaUrl,
} from "@/lib/media"

export const AVATAR_FALLBACK = "/avatar-placeholder.png"

export function stableSearchId(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number") {
    const out = String(value).trim()
    return out && out !== "[object Object]" ? out : null
  }
  if (value && typeof value === "object") {
    const obj = value as {
      $oid?: unknown
      id?: unknown
      _id?: unknown
      type?: unknown
      data?: unknown
      buffer?: unknown
    }
    if (typeof obj.$oid === "string" || typeof obj.$oid === "number") {
      const out = String(obj.$oid).trim()
      if (out) return out
    }
    if (obj.type === "Buffer" && Array.isArray(obj.data)) {
      const bytes = obj.data.filter((n) => Number.isFinite(n)) as number[]
      if (bytes.length) {
        return bytes
          .map((n) => Number(n).toString(16).padStart(2, "0"))
          .join("")
      }
    }
    if (typeof obj.id === "string" || typeof obj.id === "number") {
      const out = String(obj.id).trim()
      if (out) return out
    }
    if (typeof obj._id === "string" || typeof obj._id === "number") {
      const out = String(obj._id).trim()
      if (out) return out
    }
    const nested =
      stableSearchId(obj.id) ||
      stableSearchId(obj._id) ||
      stableSearchId(obj.buffer)
    if (nested) return nested
  }
  return null
}

export function getTitle(item: any, type: SearchType) {
  if (type === "User") return item?.displayName || item?.username || "User"
  return item?.dateKey || "Day Page"
}

export function getSubtitle(item: any, type: SearchType) {
  if (type === "User") {
    const username = item?.username ? `@${item.username}` : ""
    const bio = item?.bio || ""
    return [username, bio].filter(Boolean).join(" • ")
  }

  const ui = item?.user_info
  const display = ui?.displayName || (ui?.username ? `@${ui.username}` : "")
  const privacy = item?.privacy || ""
  return [display, privacy].filter(Boolean).join(" • ")
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
    const id = stableSearchId(item?._id) || stableSearchId(item?.id)
    if (id) return `/${encodeURIComponent(id)}`
    return null
  }
  // DayPage
  const username = item?.user_info?.username
  const dateKey: string = item?.dateKey ?? ""
  if (!username || !dateKey) return null
  const [y, m, d] = dateKey.split("-")
  const ddmmyyyy = d && m && y ? `${d}-${m}-${y}` : ""
  return ddmmyyyy ? `/${encodeURIComponent(username)}/day?date=${ddmmyyyy}` : `/${encodeURIComponent(username)}/day`
}
