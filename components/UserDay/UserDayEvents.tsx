"use client"

import { useMemo, useState } from "react"
import {
  CalendarDays,
  ArrowRight,
  Clock,
  Loader2,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import UserDayListRow from "./UserDayListRow"
import PrivacyChip from "@/components/common/PrivacyChip"
import ActionPill from "../common/ActionPill"
import type { PaginationMeta } from "@/hooks/useUserDay"
import { useRouter } from "next/navigation"
import RichText from "@/components/common/RichText"
import { stableFeedId } from "@/lib/feedTypes"

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

function formatCreatedTime(iso?: string) {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export default function UserDayEvents({
  events,
  pagination,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onCollapse,
}: {
  events?: any[]
  pagination?: PaginationMeta
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  onCollapse?: () => void
}) {
  const PREVIEW_COUNT = 5

  const router = useRouter()
  const list = useMemo(() => (Array.isArray(events) ? events : []), [events])

  // UI-only collapse state (MUST be before any return)
  const [collapsed, setCollapsed] = useState(true)

  if (!list.length) {
    return <div className="text-sm text-(--dk-slate)">No events.</div>
  }

  const visible = collapsed ? list.slice(0, PREVIEW_COUNT) : list

  const canCollapse = list.length > PREVIEW_COUNT && !collapsed
  const canExpand = list.length > PREVIEW_COUNT && collapsed

  // same mutual exclusion system as notes
  const showLoadMore = !!hasMore && !!onLoadMore
  const showShowAll = !showLoadMore && canExpand

  return (
    <div className="space-y-2">
      {canCollapse ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setCollapsed(true)
              onCollapse?.()
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-(--dk-slate) hover:text-(--dk-ink)"
          >
            <ChevronUp size={14} />
            Collapse
          </button>
        </div>
      ) : null}

      <div className="space-y-0.5">
        {visible.map((ev: any, idx: number) => {
          const eventId = stableFeedId(ev?._id) || stableFeedId(ev?.id)
          const { startText, endText } = formatEventTimeRange(
            ev.dateStartLocal || ev.dateStart,
            ev.dateEndLocal || ev.dateEnd,
          )

          const createdISO =
            ev.created_at || ev.createdAt || ev.dateCreated || ev.date

          return (
            <UserDayListRow
              key={eventId || `event-${idx}`}
              leftIcon={<CalendarDays size={18} />}
              title={<RichText text={String(ev.title || "")} />}
              onClick={() => {
                if (!eventId) return
                router.push(`/day/events/${encodeURIComponent(eventId)}`)
              }}
              metaTop={
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="inline-flex items-center gap-1.5 text-xs text-(--dk-slate) shrink-0">
                    <Clock size={12} />
                    {formatCreatedTime(createdISO)}
                  </span>
                  <div className="shrink-0">
                    <PrivacyChip privacy={ev.privacy} />
                  </div>
                </div>
              }
              right={
                <div className="flex items-center justify-end min-w-0 max-w-full">
                  <div
                    className={[
                      "inline-flex items-center gap-2",
                      "rounded-lg bg-(--dk-mist)/55",
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
                        <ArrowRight
                          size={12}
                          className="text-(--dk-slate)/70 shrink-0"
                        />
                        <span className="font-semibold text-(--dk-ink) whitespace-nowrap">
                          {endText}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              }
            />
          )
        })}
      </div>

      {showShowAll ? (
        <ActionPill onClick={() => setCollapsed(false)}>
          <ChevronDown size={16} />
          Show all
        </ActionPill>
      ) : null}

      {showLoadMore ? (
        <ActionPill
          onClick={() => {
            if (loadingMore) return
            setCollapsed(false)
            onLoadMore()
          }}
          disabled={loadingMore}
        >
          {loadingMore ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Loading…
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              Show more
            </>
          )}
        </ActionPill>
      ) : null}
    </div>
  )
}
