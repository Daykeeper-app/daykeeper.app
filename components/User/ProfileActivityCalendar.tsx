"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useUserCalendar } from "@/hooks/useUserCalendar"

type CalendarCell = {
  date: string
  count: number
  postsCount: number
  tasksCount: number
  eventsCount: number
  level: 0 | 1 | 2 | 3 | 4
}

function toDateUTC(date: string) {
  return new Date(`${date}T00:00:00Z`)
}

function dateKey(d: Date) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function monthShort(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })
}

function levelClass(level: number) {
  if (level <= 0) return "bg-(--dk-mist)/55"
  if (level === 1) return "bg-(--dk-sky)/28"
  if (level === 2) return "bg-(--dk-sky)/45"
  if (level === 3) return "bg-(--dk-sky)/65"
  return "bg-(--dk-sky)"
}

function tooltipText(c: CalendarCell) {
  const date = toDateUTC(c.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
  const total = `${c.count} interaction${c.count === 1 ? "" : "s"}`
  return `${date}\n${total}\nPosts: ${c.postsCount}\nTasks: ${c.tasksCount}\nEvents: ${c.eventsCount}`
}

function ActivityCalendarSkeleton() {
  return (
    <section className="border-t border-(--dk-ink)/10 px-4 py-4 sm:px-5">
      <div className="animate-pulse rounded-xl bg-(--dk-mist)/20 p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="h-4 w-20 rounded bg-(--dk-mist)" />
            <div className="h-3 w-40 rounded bg-(--dk-mist)" />
          </div>
          <div className="h-8 w-24 rounded-lg bg-(--dk-mist)" />
        </div>

        <div className="overflow-hidden">
          <div>
            <div className="mb-1 grid auto-cols-[10px] grid-flow-col gap-[3px]">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={`sm-${i}`} className="h-2 w-5 rounded bg-(--dk-mist)" />
              ))}
            </div>

            <div className="grid auto-cols-[10px] grid-flow-col gap-[3px]">
              {Array.from({ length: 54 }).map((_, wi) => (
                <div key={`sw-${wi}`} className="grid grid-rows-7 gap-[3px]">
                  {Array.from({ length: 7 }).map((__, di) => (
                    <div
                      key={`sc-${wi}-${di}`}
                      className="h-[10px] w-[10px] rounded-[3px] bg-(--dk-mist)"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function ProfileActivityCalendar({
  username,
}: {
  username: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const q = useUserCalendar(username, {
    startDate: `${selectedYear}-01-01`,
    endDate: `${selectedYear}-12-31`,
  })
  const data = q.data

  const calendar = useMemo(() => {
    if (!data?.points?.length) return null

    const map = new Map<string, CalendarCell>()
    for (const p of data.points) {
      map.set(p.date, {
        date: p.date,
        count: Number(p.count ?? 0),
        postsCount: Number(
          p.postsCount ??
            p.interactions?.find((i) => i.type === "post")?.count ??
            0
        ),
        tasksCount: Number(
          p.tasksCount ??
            p.interactions?.find((i) => i.type === "task")?.count ??
            0
        ),
        eventsCount: Number(
          p.eventsCount ??
            p.interactions?.find((i) => i.type === "event")?.count ??
            0
        ),
        level: (Number(p.level ?? 0) as 0 | 1 | 2 | 3 | 4),
      })
    }

    const first = toDateUTC(data.points[0].date)
    const last = toDateUTC(data.points[data.points.length - 1].date)

    const start = new Date(first)
    start.setUTCDate(start.getUTCDate() - start.getUTCDay())

    const end = new Date(last)
    end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()))

    const weeks: Array<Array<CalendarCell | null>> = []
    const monthLabels: Array<{ index: number; label: string }> = []

    let week: Array<CalendarCell | null> = []
    let d = new Date(start)
    let weekIndex = 0

    while (d <= end) {
      const key = dateKey(d)
      const cell = map.get(key) || null
      week.push(cell)

      if (d.getUTCDay() === 6) {
        weeks.push(week)
        if (week[0]) {
          const month = monthShort(toDateUTC(week[0].date))
          const prev = monthLabels[monthLabels.length - 1]
          if (!prev || prev.label !== month) {
            monthLabels.push({ index: weekIndex, label: month })
          }
        }
        week = []
        weekIndex += 1
      }

      d.setUTCDate(d.getUTCDate() + 1)
    }

    return { weeks, monthLabels }
  }, [data])

  if (q.isLoading) {
    return <ActivityCalendarSkeleton />
  }

  if (q.isError) {
    return (
      <section className="border-t border-(--dk-ink)/10 px-4 py-4 sm:px-5">
        <div className="rounded-xl bg-(--dk-mist)/30 p-4 text-sm text-(--dk-slate)">
          Could not load activity right now.
        </div>
      </section>
    )
  }

  if (!data || !calendar) return null

  const { weeks, monthLabels } = calendar
  const monthLabelByIndex = new Map(monthLabels.map((m) => [m.index, m.label]))
  const onSelectDay = (isoDate: string) => {
    const [yyyy, mm, dd] = isoDate.split("-")
    if (!yyyy || !mm || !dd) return

    const qs = new URLSearchParams(searchParams.toString())
    qs.set("date", `${dd}-${mm}-${yyyy}`)
    router.push(`${pathname}?${qs.toString()}`, { scroll: false })
  }

  return (
    <section className="border-t border-(--dk-ink)/10 px-4 py-4 sm:px-5">
      <div className="rounded-xl bg-(--dk-mist)/20 p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-(--dk-ink)">Activity</div>
            <div className="text-xs text-(--dk-slate)">
              {data.totalCount} interactions in {selectedYear}
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-(--dk-paper)/55 p-1">
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y - 1)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-(--dk-slate) transition hover:bg-(--dk-mist)/85 hover:text-(--dk-sky)"
              aria-label="Previous year"
            >
              <ChevronLeft size={14} />
            </button>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-7 appearance-none rounded-md bg-transparent px-2 text-xs font-medium text-(--dk-ink) outline-none hover:bg-(--dk-mist)/70"
              aria-label="Select year"
            >
              {Array.from({ length: 12 }).map((_, idx) => {
                const y = currentYear - idx
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                )
              })}
            </select>
            <button
              type="button"
              onClick={() =>
                setSelectedYear((y) => Math.min(currentYear, y + 1))
              }
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-(--dk-slate) transition hover:bg-(--dk-mist)/85 hover:text-(--dk-sky) disabled:opacity-35"
              aria-label="Next year"
              disabled={selectedYear >= currentYear}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="overflow-hidden">
          <div>
            <div className="mb-1 grid auto-cols-[10px] grid-flow-col gap-[3px] text-[10px] text-(--dk-slate)">
              {Array.from({ length: weeks.length }).map((_, idx) => {
                const label = monthLabelByIndex.get(idx)
                return <div key={`m-${idx}`}>{label || ""}</div>
              })}
            </div>

            <div className="grid auto-cols-[10px] grid-flow-col gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={`w-${wi}`} className="grid grid-rows-7 gap-[3px]">
                  {week.map((c, di) =>
                    c ? (
                      <button
                        key={`c-${wi}-${di}`}
                        type="button"
                        title={tooltipText(c)}
                        onClick={() => onSelectDay(c.date)}
                        className={`h-[10px] w-[10px] rounded-[3px] transition hover:opacity-85 ${levelClass(c.level)}`}
                        aria-label={`Open ${c.date}`}
                      />
                    ) : (
                      <div
                        key={`c-${wi}-${di}`}
                        className="h-[10px] w-[10px] rounded-[3px] bg-transparent"
                        aria-hidden
                      />
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
