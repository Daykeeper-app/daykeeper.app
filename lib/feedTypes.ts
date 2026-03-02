export type FeedItemType = "post" | "note" | "task" | "event"

export type FeedUserDayItem = {
  id: string
  type: FeedItemType
  time?: string
  date?: string
  privacy?: string

  // post fields
  content?: string
  media?: FeedMedia[]
  likes?: number
  comments?: number
  userLiked?: boolean
  userCommented?: any
  edited_at?: any
  isOwner?: boolean

  // note fields
  text?: string

  // task fields
  title?: string
  completed?: boolean

  // event fields
  description?: string
  location?: string
  dateStart?: string
  dateEnd?: string
}

export type FeedUserDay = {
  userId: string
  username: string
  userHandle: string
  profile_picture?: { url?: string } | null
  user_info?: any
  postsCount?: number
  notesCount?: number
  tasksCount?: number
  eventsCount?: number
  lastPostTime?: string
  data: FeedUserDayItem[]
}

export type FeedMedia = {
  _id: string
  type: "image" | "video" | string
  url?: string
  urls?: {
    main?: string
    thumb?: string
    preview?: string
    poster?: string
    hls?: string
  } | null
  thumbnailUrl?: string
  thumbUrl?: string
  imageUrl?: string
  videoUrl?: string
  title?: string
}

export type FeedPost = {
  id: string
  time?: string
  date?: string
  content: string
  privacy: String

  media?: FeedMedia[]

  likes?: number
  comments?: number
  userLiked?: boolean
  userCommented?: any
  edited_at: any
}

export function normalizeFeedPayload(json: any): FeedUserDay[] {
  const list =
    json?.data?.response?.data ?? json?.response?.data ?? json?.data ?? []

  if (!Array.isArray(list)) return []

  return list.map((u: any) => {
    const items: FeedUserDayItem[] = Array.isArray(u.data)
      ? u.data
          .map((p: any) => {
            const type = String(p?.type || "post").toLowerCase() as FeedItemType
            if (!["post", "note", "task", "event"].includes(type)) return null

            const id = String(p?.id ?? p?._id ?? "")
            const base = {
              id,
              type,
              time: p?.time,
              date: p?.date,
              privacy: p?.privacy,
            }

            if (type === "post") {
              return {
                ...base,
                content: String(p?.content ?? p?.data ?? ""),
                media: Array.isArray(p?.media)
                  ? p.media.map((m: any) => ({
                      _id: String(m._id ?? ""),
                      type: m.type,
                      url: m.url,
                      urls: m.urls ?? null,
                      thumbnailUrl: m.thumbnailUrl,
                      thumbUrl: m.thumbUrl,
                      imageUrl: m.imageUrl,
                      videoUrl: m.videoUrl,
                      title: m.title,
                    }))
                  : [],
                likes: p?.likes,
                comments: p?.comments,
                userLiked: p?.userLiked,
                userCommented: p?.userCommented,
                edited_at: p?.edited_at,
                isOwner: p?.isOwner,
              } as FeedUserDayItem
            }

            if (type === "note") {
              return {
                ...base,
                text: String(p?.text ?? p?.content ?? p?.data ?? ""),
              } as FeedUserDayItem
            }

            if (type === "task") {
              return {
                ...base,
                title: p?.title ?? p?.name ?? "",
                completed: !!p?.completed,
              } as FeedUserDayItem
            }

            return {
              ...base,
              title: p?.title ?? p?.name ?? "",
              description: p?.description ?? p?.details ?? p?.body ?? "",
              location: p?.location ?? "",
              dateStart: p?.dateStart ?? p?.dateStartLocal,
              dateEnd: p?.dateEnd ?? p?.dateEndLocal,
            } as FeedUserDayItem
          })
          .filter(Boolean)
      : []

    return {
      user_info: u.user_info,
      postsCount: u.postsCount,
      eventsCount: u.eventsCount,
      notesCount: u.notesCount,
      tasksCount: u.tasksCount,
      lastPostTime: u.lastPostTime,
      userId: String(u.userId ?? u._id ?? ""),
      username: String(u.username ?? u.user?.username ?? u.username ?? ""),
      userHandle: String(
        u.userHandle ?? u.handle ?? u.username ?? u.username ?? "",
      ),
      profile_picture: u.profile_picture ?? u.user?.profile_picture ?? null,
      data: items,
    }
  })
}
