"use client"

import { useParams, useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import {
  CalendarDays,
  ArrowRight,
  Clock,
  Pencil,
  Trash2,
  Flag,
  Ban,
} from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import { useEventDetail } from "@/hooks/useEventDetail"
import { useMe } from "@/lib/useMe"

import UserDayListRow from "@/components/UserDay/UserDayListRow"
import ContentHeader from "@/components/common/ContentHeader"
import PrivacyChip from "@/components/common/PrivacyChip"
import DeleteEntityModal from "@/components/common/DeleteEntityModal"
import formatDDMMYYYY from "@/utils/formatDate"
import RichText from "@/components/common/RichText"

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function weekKey(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const day = x.getDay()
  x.setDate(x.getDate() - day)
  return x.toISOString().slice(0, 10)
}

function formatShortWeekdayTime(d: Date) {
  const weekday = d.toLocaleDateString([], { weekday: "short" })
  const hh = pad2(d.getHours())
  const mm = pad2(d.getMinutes())
  return `${weekday} ${hh}:${mm}`
}

function formatFullDDMMYYYYTime(d: Date) {
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

  if (!start) return { startText: "", endText: "" }

  const crossesWeek = !!end && weekKey(start) !== weekKey(end)
  const fmt = crossesWeek ? formatFullDDMMYYYYTime : formatShortWeekdayTime

  return { startText: fmt(start), endText: end ? fmt(end) : "" }
}

function formatCreatedTime(iso?: string) {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export default function EventPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const q = useEventDetail(eventId)
  const me = useMe()

  const loading = q.isLoading
  const error = q.error ? (q.error as any).message : null
  const ev: any = q.data ?? null

  const user = ev?.user_info ?? null

  const { startText, endText } = useMemo(
    () =>
      formatEventTimeRange(
        ev?.dateStartLocal || ev?.dateStart,
        ev?.dateEndLocal || ev?.dateEnd,
      ),
    [ev?.dateStartLocal, ev?.dateStart, ev?.dateEndLocal, ev?.dateEnd],
  )

  const createdISO = useMemo(
    () => ev?.created_at || ev?.createdAt || ev?.dateCreated || ev?.date,
    [ev?.created_at, ev?.createdAt, ev?.dateCreated, ev?.date],
  )

  const stamp = useMemo(() => formatCreatedTime(createdISO), [createdISO])

  const edited = useMemo(
    () => formatDDMMYYYY(ev?.edited_at || ""),
    [ev?.edited_at],
  )

  const isOwner = !!me?._id && !!ev?.user && String(me._id) === String(ev.user)

  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <main className="pb-20 lg:pb-0">
      <div className="max-w-2xl mx-auto border-x border-(--dk-ink)/10 bg-(--dk-paper) min-h-screen">
        {/* Sticky top header shell (same as other detail pages) */}
        <div className="sticky top-0 bg-(--dk-paper)/95 backdrop-blur-md">
          <div className="h-1 w-full bg-(--dk-sky)/70" />
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-(--dk-mist) transition"
              aria-label="Back"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="text-(--dk-ink)"
              >
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="leading-tight">
              <div className="text-sm font-semibold text-(--dk-ink)">Event</div>
              <div className="text-xs text-(--dk-slate)">Details</div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="px-4 py-6 text-sm text-(--dk-slate)">Loading…</div>
        )}

        {!loading && error && (
          <div className="px-4 py-6 text-sm text-red-500">{error}</div>
        )}

        {!loading && !error && ev && (
          <div className="px-4 py-4 space-y-3">
            <ContentHeader
              user={user}
              stamp={stamp}
              editedDate={edited}
              privacy={ev.privacy}
              menuItems={
                isOwner
                  ? [
                      {
                        key: "edit",
                        label: "Edit event",
                        icon: <Pencil size={16} />,
                        onClick: () =>
                          router.push(`/day/events/${ev._id}/edit`),
                      },
                      {
                        key: "delete",
                        label: "Delete event",
                        icon: <Trash2 size={16} />,
                        variant: "danger",
                        onClick: () => setDeleteOpen(true),
                      },
                    ]
                  : [
                      {
                        key: "report",
                        label: "Report event",
                        icon: <Flag size={16} />,
                        onClick: () =>
                          router.push(
                            `/report?user=${encodeURIComponent(
                              String(user?._id || ""),
                            )}&event=${encodeURIComponent(String(ev._id))}`,
                          ),
                      },
                      {
                        key: "block",
                        label: "Block user",
                        icon: <Ban size={16} />,
                        variant: "danger",
                        onClick: () =>
                          router.push(
                            `/block?user=${encodeURIComponent(
                              String(user?._id || ""),
                            )}`,
                          ),
                      },
                    ]
              }
            />

            {/* Event content row (same visual language as UserDayEvents) */}
            <UserDayListRow
              leftIcon={<CalendarDays size={18} />}
              title={
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-(--dk-ink) truncate">
                    <RichText text={String(ev.title || "")} />
                  </div>
                  {ev.description ? (
                    <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-(--dk-ink)">
                      <RichText text={String(ev.description || "")} />
                    </div>
                  ) : null}
                </div>
              }
              metaTop={
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="inline-flex items-center gap-1.5 text-xs text-(--dk-slate) shrink-0">
                    <Clock size={12} />
                    {stamp}
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

            <DeleteEntityModal
              open={deleteOpen}
              onClose={() => setDeleteOpen(false)}
              onDeleted={() => {
                qc.removeQueries({ queryKey: ["eventDetail", eventId] })
                qc.invalidateQueries({ queryKey: ["userDay"] })
                router.back()
              }}
              entityLabel="event"
              entityId={String(ev._id)}
              buildPath={({ id }) => `/day/event/${encodeURIComponent(id)}`}
              confirmTitle="Delete event"
              confirmButtonText="Delete event"
              successTitle="Event deleted"
            />
          </div>
        )}
      </div>
    </main>
  )
}
