"use client"

import { useMemo } from "react"
import { CheckSquare, Calendar, Clock } from "lucide-react"
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
  // dummy day meta (replace with API fields later)
  const dayMeta = useMemo(() => {
    const obj = {
      entries: userDay?.postsCount || 0,
      tasksUpdated: userDay?.tasksCount || 0,
      events: userDay?.eventsCount || 0,
      lastUpdateTime: userDay?.lastPostTime || "12:00",
    }
    return obj
  }, [
    userDay?.postsCount,
    userDay?.tasksCount,
    userDay?.eventsCount,
    userDay?.lastPostTime,
  ])

  function openDay() {
    // you can decide your route format later
    // example: /day/2026-01-07?user=USER_ID
    const username = userDay?.user_info?.username
    if (!username) return

    const dateParam = selectedDate ? toDayParam(selectedDate) : null
    router.push(
      dateParam ? `/${username}?date=${dateParam}` : `/${username}`,
    )
  }
  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={openDay}
        className="ml-0 sm:ml-7 w-full sm:w-[calc(100%-1.75rem)] cursor-pointer rounded-lg bg-(--dk-mist)/70 px-3 py-2 text-center transition hover:bg-(--dk-sky)/25"
      >
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-(--dk-slate)">
          <span className="font-semibold tracking-[0.08em] text-(--dk-slate)">
            DAY
          </span>

          <span className="h-1 w-1 rounded-full bg-(--dk-ink)/25" />

          <span>
            <span className="font-semibold text-(--dk-ink)">
              {dayMeta.entries}
            </span>{" "}
            entries
          </span>

          <span className="h-1 w-1 rounded-full bg-(--dk-ink)/25" />

          <span className="inline-flex items-center gap-1.5">
            <CheckSquare size={14} />
            <span className="font-semibold text-(--dk-ink)">
              {dayMeta.tasksUpdated}
            </span>{" "}
            tasks
          </span>

          <span className="h-1 w-1 rounded-full bg-(--dk-ink)/25" />

          <span className="inline-flex items-center gap-1.5">
            <Calendar size={14} />
            <span className="font-semibold text-(--dk-ink)">
              {dayMeta.events}
            </span>{" "}
            events
          </span>

          {dayMeta.lastUpdateTime ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <Clock size={14} />
                <span className="font-semibold text-(--dk-ink)">
                  {dayMeta?.lastUpdateTime?.toLowerCase() || ""}
                </span>{" "}
              </span>
            </>
          ) : null}
        </div>
      </button>
    </div>
  )
}
