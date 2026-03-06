const MEDIA_EXPIRED_QUERY_KEYS = ["Expires", "Signature", "Key-Pair-Id"] as const

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {}
  return value as Record<string, unknown>
}

function pickString(values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return null
}

function pickProfilePictureCandidate(value: unknown): string | null {
  if (typeof value === "string") {
    const out = value.trim()
    return out || null
  }

  if (!value || typeof value !== "object") return null

  const v = toRecord(value)
  const urls = toRecord(v.urls)

  return pickString([
    // New backend contract
    urls.main,
    v.url,
    // Legacy/computed variants
    urls.thumb,
    urls.preview,
    urls.poster,
    v.avatarUrl,
    v.avatar_url,
    v.picture,
    v.photoURL,
    v.photoUrl,
    v.profilePicture,
    v.profile_picture,
    v.profilePictureUrl,
    v.profile_picture_url,
  ])
}

export function getMainMediaUrl(media: unknown): string | null {
  const m = toRecord(media)
  const urls = toRecord(m.urls)
  return pickString([
    // Contract-preferred order
    urls.main,
    m.url,
    // Backward-compat fallback fields
    m.imageUrl,
    m.videoUrl,
    m.thumbnailUrl,
    m.thumbUrl,
    urls.preview,
    urls.poster,
  ])
}

export function getThumbUrl(media: unknown): string | null {
  const m = toRecord(media)
  const urls = toRecord(m.urls)
  return pickString([
    urls.thumb,
    urls.preview,
    urls.poster,
    m.thumbnailUrl,
    m.thumbUrl,
    getMainMediaUrl(media),
  ])
}

export function getHlsUrl(media: unknown): string | null {
  const m = toRecord(media)
  const urls = toRecord(m.urls)
  return pickString([urls.hls, getMainMediaUrl(media)])
}

export function getProfilePictureUrl(
  userLike: unknown,
  fallback = "/avatar-placeholder.png",
): string {
  const source = toRecord(userLike)
  const fromUser = toRecord(source.user)
  const fromUserInfo = toRecord(source.user_info)
  const fromAuthor = toRecord(source.author)
  const fromOwner = toRecord(source.owner)

  // Accept profile-picture fields from common API payload shapes.
  const candidates: unknown[] = [
    source.profile_picture,
    source.profilePicture,
    source.profile_picture_url,
    source.profilePictureUrl,
    source.avatar,
    source.avatarUrl,
    source.avatar_url,
    source.picture,
    source.photoURL,
    source.photoUrl,
    fromUser.profile_picture,
    fromUser.profilePicture,
    fromUser.profile_picture_url,
    fromUser.profilePictureUrl,
    fromUser.avatarUrl,
    fromUser.avatar_url,
    fromUser.picture,
    fromUser.photoURL,
    fromUser.photoUrl,
    fromUserInfo.profile_picture,
    fromUserInfo.profilePicture,
    fromUserInfo.profile_picture_url,
    fromUserInfo.profilePictureUrl,
    fromUserInfo.avatarUrl,
    fromUserInfo.avatar_url,
    fromAuthor.profile_picture,
    fromAuthor.profilePicture,
    fromOwner.profile_picture,
    fromOwner.profilePicture,
  ]

  for (const c of candidates) {
    const url = pickProfilePictureCandidate(c)
    if (url) return url
  }

  return fallback
}

// Backward-compatible aliases used across the app.
export const resolveMainMediaUrl = getMainMediaUrl
export const resolveThumbMediaUrl = getThumbUrl
export const resolvePlayableVideoUrl = getHlsUrl
export const resolveProfilePictureUrl = getProfilePictureUrl

export function hasCloudFrontSignature(url: string): boolean {
  try {
    const parsed = new URL(url)
    return MEDIA_EXPIRED_QUERY_KEYS.every((key) => parsed.searchParams.has(key))
  } catch {
    return false
  }
}

export function logMediaEvent(
  tag:
    | "media_url_expired_retry"
    | "media_url_retry_success"
    | "media_url_retry_failed",
  payload: Record<string, unknown> = {},
) {
  if (typeof window === "undefined") return
  // Keep logs lightweight but structured for later analytics wiring.
  console.info(tag, payload)
}
