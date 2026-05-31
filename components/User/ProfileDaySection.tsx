"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react"

import DayPageBlocksView from "@/components/DayPage/DayPageBlocksView"
import DayPageLikeBar from "@/components/DayPage/DayPageLikeBar"
import ProfileDaySkeleton from "@/components/User/ProfileDaySkeleton"
import { useOwnDayPage, useUserDayPage } from "@/hooks/useDayPage"
import { isSameDay, parseDDMMYYYY, startOfDay, toDDMMYYYY } from "@/lib/date"

type Props = {
  username: string
  isSelf: boolean
  selectedDate: Date
  onChangeDate: (days: number) => void
}

function formatDate(d: Date) {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

export default function ProfileDaySection({
  username,
  isSelf,
  selectedDate,
  onChangeDate,
}: Props) {
  const router = useRouter()
  const dateParam = useMemo(() => toDDMMYYYY(selectedDate), [selectedDate])
  const isToday = useMemo(() => isSameDay(selectedDate, new Date()), [selectedDate])

  const ownPageQ = useOwnDayPage(isSelf ? dateParam : "")
  const userPageQ = useUserDayPage(!isSelf ? username : null, dateParam)

  const loading = isSelf ? ownPageQ.isLoading : userPageQ.isLoading
  const page = isSelf ? ownPageQ.data : userPageQ.data

  return (
    <section className="border-t border-(--dk-ink)/10">
      {/* Day navigation */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={() => onChangeDate(-1)}
          className="rounded-lg p-1.5 text-(--dk-slate) transition hover:bg-(--dk-mist)/75 hover:text-(--dk-ink)"
          aria-label="Previous day"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="text-center">
          <div className="text-sm font-semibold text-(--dk-ink)">{formatDate(selectedDate)}</div>
          <div className="text-xs text-(--dk-slate)">
            {selectedDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onChangeDate(1)}
          disabled={isToday}
          className="rounded-lg p-1.5 text-(--dk-slate) transition hover:bg-(--dk-mist)/75 hover:text-(--dk-ink) disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next day"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <ProfileDaySkeleton />
      ) : page ? (
        <div>
          <DayPageBlocksView blocks={page.blocks ?? []} />
          <div className="border-t border-(--dk-ink)/8">
            {isSelf ? (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs text-(--dk-slate)">
                  {(page.blocks ?? []).length} block{(page.blocks ?? []).length !== 1 ? "s" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => router.push(`/day?date=${dateParam}`)}
                  className="flex items-center gap-1.5 rounded-lg bg-(--dk-sky)/10 px-3 py-1.5 text-xs font-medium text-(--dk-sky) transition hover:bg-(--dk-sky)/20"
                >
                  <Pencil size={12} />
                  Edit page
                </button>
              </div>
            ) : page._id ? (
              <DayPageLikeBar
                pageId={page._id}
                likesCount={page.likesCount ?? 0}
                commentsCount={page.commentsCount ?? 0}
                userLiked={!!page.userLiked}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div className="px-4 py-8 text-center">
          {isSelf ? (
            <div className="space-y-3">
              <p className="text-sm text-(--dk-slate)">No page yet for this day.</p>
              <button
                type="button"
                onClick={() => router.push(`/day?date=${dateParam}`)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-(--dk-sky) px-4 py-2 text-sm font-semibold text-white transition hover:bg-(--dk-sky)/90"
              >
                <Pencil size={14} />
                Write today's page
              </button>
            </div>
          ) : (
            <p className="text-sm italic text-(--dk-slate)">
              No page for this day.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
