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

export function resolveMainMediaUrl(media: unknown): string | null {
  const m = toRecord(media)
  const urls = toRecord(m.urls)
  return pickString([
    urls.main,
    m.url,
    m.imageUrl,
    m.videoUrl,
    m.thumbnailUrl,
    m.thumbUrl,
    urls.preview,
    urls.poster,
  ])
}

export function resolveThumbMediaUrl(media: unknown): string | null {
  const m = toRecord(media)
  const urls = toRecord(m.urls)
  return pickString([
    urls.thumb,
    urls.preview,
    urls.poster,
    m.thumbnailUrl,
    m.thumbUrl,
    resolveMainMediaUrl(media),
  ])
}

export function resolvePlayableVideoUrl(media: unknown): string | null {
  const m = toRecord(media)
  const urls = toRecord(m.urls)
  return pickString([urls.hls, resolveMainMediaUrl(media)])
}

export function resolveProfilePictureUrl(
  userLike: unknown,
  fallback = "/avatar-placeholder.png",
): string {
  const source = toRecord(userLike)
  const pic = toRecord(source.profile_picture ?? source.profilePicture)
  const url = pickString([
    toRecord(pic.urls).main,
    pic.url,
    source.avatarUrl,
    source.imageUrl,
  ])
  return url || fallback
}

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
