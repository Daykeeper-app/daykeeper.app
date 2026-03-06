"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, ClipboardList, CheckSquare2, Square } from "lucide-react"

import type { FeedUserDayItem } from "@/lib/feedTypes"
import { stableFeedId } from "@/lib/feedTypes"
import UserDayListRow from "@/components/UserDay/UserDayListRow"
import PrivacyChip from "@/components/common/PrivacyChip"

function formatTime(iso?: string) {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function weekKey(d: Date) {
  if (Number.isNaN(d.getTime())) return ""
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  if (Number.isNaN(x.getTime())) return ""
  const day = x.getDay()
  x.setDate(x.getDate() - day)
  if (Number.isNaN(x.getTime())) return ""
  return x.toISOString().slice(0, 10)
}

function formatShortWeekdayTime(d: Date) {
  if (Number.isNaN(d.getTime())) return ""
  const weekday = d.toLocaleDateString([], { weekday: "short" })
  const hh = pad2(d.getHours())
  const mm = pad2(d.getMinutes())
  return `${weekday} ${hh}:${mm}`
}

function formatFullDDMMYYYYTime(d: Date) {
  if (Number.isNaN(d.getTime())) return ""
  const dd = pad2(d.getDate())
  const mm = pad2(d.getMonth() + 1)
  const yyyy = d.getFullYear()
  const hh = pad2(d.getHours())
  const min = pad2(d.getMinutes())
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

function formatEventTimeRange(startISO?: string, endISO?: string) {
  const start = startISO ? new Date(startISO) : null
  const end = endISO ? new Date(endISO) : null
  if (!start || Number.isNaN(start.getTime())) return { startText: "", endText: "" }
  const safeEnd = end && !Number.isNaN(end.getTime()) ? end : null

  const crossesWeek = !!safeEnd && weekKey(start) !== weekKey(safeEnd)
  const fmt = crossesWeek ? formatFullDDMMYYYYTime : formatShortWeekdayTime

  return { startText: fmt(start), endText: safeEnd ? fmt(safeEnd) : "" }
}

function iconFor(type: FeedUserDayItem["type"]) {
  if (type === "event") return <CalendarDays size={18} />
  return <ClipboardList size={20} />
}

export default function FeedUserDayItemRow({
  item,
  isLast,
}: {
  item: FeedUserDayItem
  isLast: boolean
}) {
  const router = useRouter()

  const href = useMemo(() => {
    const rawId = stableFeedId(item.id)
    if (!rawId) return null
    const id = encodeURIComponent(rawId)
    if (item.type === "event") return `/day/events/${id}`
    if (item.type === "task") return `/day/tasks/${id}`
    return null
  }, [item.id, item.type])

  const metaTop =
    item.type === "event" ? null : (
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5">
          {formatTime(item.date || item.time)}
        </span>
        <PrivacyChip privacy={item.privacy} />
      </span>
    )

  const right =
    item.type === "event"
      ? (() => {
          const { startText, endText } = formatEventTimeRange(
            item.dateStart || item.date,
            item.dateEnd,
          )
          if (!startText) return null
          return (
            <div className="hidden sm:flex items-center justify-end min-w-0 max-w-full">
              <div
                className={[
                  "inline-flex items-center gap-2",
                  "rounded-xl border border-(--dk-ink)/10 bg-(--dk-mist)/35",
                  "px-2.5 py-1 text-xs",
                  "max-w-full min-w-0",
                  "flex-wrap sm:flex-nowrap",
                ].join(" ")}
              >
                <span className="font-semibold text-(--dk-ink) whitespace-nowrap">
                  {startText}
                </span>
                {endText ? (
                  <>
                    <span className="text-(--dk-slate)/70 shrink-0">→</span>
                    <span className="font-semibold text-(--dk-ink) whitespace-nowrap">
                      {endText}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          )
        })()
      : item.type === "task"
        ? (() => {
            const done = !!item.completed
            const Icon = done ? CheckSquare2 : Square
            return (
              <div className="inline-flex items-center justify-center h-9 w-9 rounded-xl border transition bg-(--dk-paper)/60 border-(--dk-ink)/10 text-(--dk-slate)">
                <Icon
                  size={18}
                  className={done ? "text-(--dk-sky)" : "text-(--dk-slate)"}
                />
              </div>
            )
          })()
        : null

  const title =
    item.type === "task"
        ? item.title || "Task"
        : (
            <span className="inline-flex items-center gap-2 min-w-0">
              <span className="truncate">{item.title || "Event"}</span>
              <PrivacyChip privacy={item.privacy} />
            </span>
          )

  const subtitle =
    item.type === "event"
      ? (() => {
          const { startText, endText } = formatEventTimeRange(
            item.dateStart || item.date,
            item.dateEnd,
          )
          const rangeText = startText
            ? `${startText}${endText ? ` → ${endText}` : ""}`
            : ""
          return (
            <span className="block">
              {rangeText ? (
                <span className="block text-xs text-(--dk-slate) sm:hidden">
                  {rangeText}
                </span>
              ) : null}
              {item.description ? (
                <span className="block">{item.description}</span>
              ) : null}
            </span>
          )
        })()
      : undefined

  return (
    <div className="relative">
      {/* dot */}
      <div
        className="absolute top-5 hidden h-2.5 w-2.5 rounded-full bg-(--dk-sky) sm:block"
        style={{ left: 0, transform: "translateX(-50%)" }}
      />

      {/* connector */}
      {!isLast ? (
        <div
          className="absolute top-6 hidden w-px bg-(--dk-sky)/40 sm:block"
          style={{
            left: 0,
            transform: "translateX(-50%)",
            height: "calc(100% + 0.25rem)",
          }}
        />
      ) : null}

      <div
        className="ml-0 sm:ml-7 rounded-lg px-2.5 sm:px-3 py-2 transition hover:bg-(--dk-mist)/35"
        onClick={() => {
          if (href) router.push(href)
        }}
      >
        <UserDayListRow
          leftIcon={iconFor(item.type)}
          title={title}
          subtitle={subtitle}
          metaTop={metaTop}
          right={right || undefined}
          alignTop={item.type === "event"}
          onClick={() => {
            if (href) router.push(href)
          }}
        />
      </div>
    </div>
  )
}
