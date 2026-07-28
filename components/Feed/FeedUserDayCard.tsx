"use client"

import { useMemo } from "react"
import { Heart, MessageCircle, FileText } from "lucide-react"
import { useRouter } from "next/navigation"
import { toDayParam } from "@/lib/date"

export default function FeedUserDayCard({
  userDay,
  selectedDate,
}: {
  userDay: any
  selectedDate?: Date
}) {
  const router = useRouter()

  const page = userDay?.page ?? null

  const meta = useMemo(() => {
    if (page) {
      return {
        entriesCount: Array.isArray(page.entries) ? page.entries.length : 0,
        likesCount: page.likesCount ?? 0,
        commentsCount: page.commentsCount ?? 0,
        userLiked: !!page.userLiked,
      }
    }
    // legacy fallback
    return {
      entries: userDay?.postsCount || 0,
      tasksUpdated: userDay?.tasksCount || 0,
      events: userDay?.eventsCount || 0,
      lastUpdateTime: userDay?.lastPostTime || "",
    }
  }, [page, userDay])

  function openDay() {
    const username = userDay?.user_info?.username
    if (!username) return
    const dateParam = selectedDate ? toDayParam(selectedDate) : null
    router.push(dateParam ? `/${username}?date=${dateParam}` : `/${username}`)
  }

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={openDay}
        className="ml-0 sm:ml-7 w-full sm:w-[calc(100%-1.75rem)] cursor-pointer rounded-lg bg-(--dk-mist)/70 px-3 py-2 text-center transition hover:bg-(--dk-sky)/25"
      >
        {page ? (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-(--dk-slate)">
            <span className="font-semibold tracking-[0.08em] text-(--dk-slate)">
              DAY PAGE
            </span>

            <span className="h-1 w-1 rounded-full bg-(--dk-ink)/25" />

            <span className="inline-flex items-center gap-1.5">
              <FileText size={13} />
              <span className="font-semibold text-(--dk-ink)">
                {meta.entriesCount}
              </span>{" "}
              entr{meta.entriesCount === 1 ? "y" : "ies"}
            </span>

            <span className="h-1 w-1 rounded-full bg-(--dk-ink)/25" />

            <span className="inline-flex items-center gap-1.5">
              <Heart
                size={13}
                style={{
                  fill: meta.userLiked ? "var(--dk-sky)" : "none",
                  color: meta.userLiked ? "var(--dk-sky)" : "var(--dk-slate)",
                }}
              />
              <span className="font-semibold text-(--dk-ink)">
                {meta.likesCount}
              </span>
            </span>

            <span className="h-1 w-1 rounded-full bg-(--dk-ink)/25" />

            <span className="inline-flex items-center gap-1.5">
              <MessageCircle size={13} />
              <span className="font-semibold text-(--dk-ink)">
                {meta.commentsCount}
              </span>
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-(--dk-slate)">
            <span className="font-semibold tracking-[0.08em] text-(--dk-slate)">
              DAY
            </span>
            <span className="h-1 w-1 rounded-full bg-(--dk-ink)/25" />
            <span>
              <span className="font-semibold text-(--dk-ink)">
                {(userDay as any)?.postsCount || 0}
              </span>{" "}
              entries
            </span>
          </div>
        )}
      </button>
    </div>
  )
}
