// =====================================
// FILE: components/search/SearchDayKindRow.tsx
// Event/Task single result row with: ContentHeader (user) + UserDayListRow (item)
// =====================================
"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, ClipboardList } from "lucide-react"

import ContentHeader from "@/components/common/ContentHeader"
import UserDayListRow from "@/components/UserDay/UserDayListRow"
import PrivacyChip from "@/components/common/PrivacyChip"
import { stableSearchId } from "@/components/Search/searchUtils"

function formatPostedAt(s?: string) {
  if (!s) return ""
  const d = new Date(s)
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

function formatTime(iso?: string) {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function leftIconFor(type: "Event" | "Task") {
  if (type === "Event") return <CalendarDays size={18} />
  return <ClipboardList size={22} />
}

function titleFor(item: any, type: "Event" | "Task") {
  if (type === "Event")
    return (
      item?.title ||
      item?.name ||
      item?.data?.title ||
      item?.data?.name ||
      "Event"
    )
  return item?.title || item?.name || "Task"
}

function subtitleFor(item: any, type: "Event" | "Task") {
  if (type !== "Event") return null
  return (
    item?.description ||
    item?.details ||
    item?.body ||
    item?.text ||
    item?.data?.description ||
    ""
  )
}

function hrefFor(item: any, type: "Event" | "Task") {
  const rawId = stableSearchId(item?._id) || stableSearchId(item?.id)
  if (!rawId) return null
  const id = encodeURIComponent(rawId)
  if (type === "Event") return `/day/events/${id}`
  return `/day/tasks/${id}`
}

export default function SearchDayKindRow({
  type,
  item,
}: {
  type: "Event" | "Task"
  item: any
}) {
  const router = useRouter()

  // backend sample uses user_info on posts; for day kinds, we accept either shape
  const user = item?.user_info || item?.userInfo || item?.user || null

  // "stamp" should show when this item was created (like header)
  const createdISO =
    item?.created_at || item?.createdAt || item?.dateCreated || item?.date
  const stamp = useMemo(() => formatPostedAt(createdISO), [createdISO])

  const privacy =
    item?.privacy ||
    item?.status ||
    (item?.private === true ? "private" : undefined) ||
    (item?.closeFriends || item?.close_friends ? "close friends" : undefined)

  const href = hrefFor(item, type)

  // for Event: show right time range chip like your UserDayEvents
  const right =
    type === "Event"
      ? (() => {
          const { startText, endText } = formatEventTimeRange(
            item?.dateStartLocal || item?.dateStart,
            item?.dateEndLocal || item?.dateEnd,
          )

          if (!startText) return null

          return (
            <div className="flex items-center justify-end min-w-0 max-w-full">
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
      : null

  // row meta top like your UserDay rows
  const metaTop =
    type === "Event" ? null : (
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5">
          {formatTime(item?.dateLocal || item?.date || createdISO)}
        </span>
        <PrivacyChip privacy={privacy} />
      </span>
    )

  const rowTitle =
    type === "Event" ? (
      <span className="inline-flex items-center gap-2 min-w-0">
        <span className="truncate">{titleFor(item, type)}</span>
        <PrivacyChip privacy={privacy} />
      </span>
    ) : (
      titleFor(item, type)
    )

  return (
    <div
      className={[
        "rounded-lg px-3 py-3 transition",
        "hover:bg-(--dk-mist)/35",
      ].join(" ")}
      onClick={() => {
        if (href) router.push(href)
      }}
      role="button"
      tabIndex={0}
    >
      {/* user header so you know who made it */}
      <ContentHeader
        user={user}
        stamp={stamp}
        privacy={privacy}
        onUserClick={() => {
          const username = user?.username
          if (username) router.push(`/${encodeURIComponent(String(username))}`)
        }}
        menuItems={[]}
      />

      {/* item row */}
      <div className="mt-2">
        <UserDayListRow
          leftIcon={leftIconFor(type)}
          title={rowTitle}
          subtitle={subtitleFor(item, type) || undefined}
          metaTop={metaTop}
          right={right || undefined}
          alignTop={type === "Event"}
          onClick={() => {
            if (href) router.push(href)
          }}
        />
      </div>
    </div>
  )
}
