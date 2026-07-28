"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import FeedPostItem from "./FeedPostItem"
import FeedUserDayItemRow from "./FeedUserDayItemRow"
import DayPageEntriesView from "@/components/DayPage/DayPageEntriesView"
import DayPageLikeBar from "@/components/DayPage/DayPageLikeBar"
import { MoreHorizontal, Flag, Ban, ArrowRight } from "lucide-react"
import BlockUserModal from "../common/BlockUserModal"
import ReportEntityModal from "@/components/common/ReportEntityModal"
import { useRouter } from "next/navigation"
import { toDayParam, toDDMMYYYY } from "@/lib/date"
import { resolveProfilePictureUrl } from "@/lib/media"

const AVATAR_FALLBACK = "/avatar-placeholder.png"

function formatDateLabel(d: Date | undefined) {
  if (!d) return null
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
}

export default function FeedUserDay({
  userDay,
  selectedDate,
  onRefreshMedia,
}: {
  userDay: any
  selectedDate: any
  onRefreshMedia?: (() => void | Promise<unknown>) | null
}) {
  const router = useRouter()
  const avatarSrc = resolveProfilePictureUrl(userDay.user_info, AVATAR_FALLBACK)
  const username = userDay.user_info.username
  const displayName = userDay?.user_info?.displayName || username

  const page = userDay.page ?? null
  const items = userDay.data || []
  const totalItems = Number(
    (userDay.postsCount ?? 0) + (userDay.tasksCount ?? 0) + (userDay.eventsCount ?? 0),
  )
  const hasMoreItems = (totalItems || items.length) > items.length

  const dateLabel = formatDateLabel(selectedDate)
  const dayUrl = selectedDate
    ? `/${username}/day?date=${toDDMMYYYY(selectedDate)}`
    : `/${username}/day`

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onEsc)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onEsc)
    }
  }, [])

  return (
    <article className="px-4 py-4 sm:px-4 sm:py-0">
      {/* User row */}
      <div className="flex items-center gap-3 pb-3 sm:pb-2">
        <button
          type="button"
          onClick={() => router.push(`/${username}`)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <Image
            src={avatarSrc}
            alt={username}
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-sm object-cover ring-1 ring-(--dk-ink)/10"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-[15px] font-semibold text-(--dk-ink)">
                {displayName}
              </span>
              {(userDay.user_info.currentStreak || 0) > 0 && (
                <span className="shrink-0 rounded-md bg-(--dk-mist)/80 px-1.5 py-0.5 text-[11px] font-medium text-(--dk-slate)">
                  {userDay.user_info.currentStreak}d
                </span>
              )}
            </div>
            <span className="text-xs text-(--dk-slate)">@{username}</span>
          </div>
        </button>

        {/* 3-dots menu */}
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-lg text-(--dk-slate) transition hover:bg-(--dk-mist)/70"
            aria-label="More options"
            aria-expanded={menuOpen}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((v) => !v) }}
          >
            <MoreHorizontal size={18} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-48 rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) shadow-lg overflow-hidden z-20"
              onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
            >
              <button
                type="button" role="menuitem"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); setReportOpen(true) }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-(--dk-ink)/5 text-(--dk-ink)"
              >
                <Flag size={15} /> Report user
              </button>
              <button
                type="button" role="menuitem"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); setBlockOpen(true) }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-(--dk-error)/10 text-(--dk-error)"
              >
                <Ban size={15} /> Block user
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Day page content */}
      {page ? (
        <div>
          {/* Date label */}
          {dateLabel && (
            <div className="pb-1.5">
              <span className="text-[11px] font-medium uppercase tracking-widest text-(--dk-slate)/60">
                {dateLabel}
              </span>
            </div>
          )}

          {/* Clickable content area */}
          <button
            type="button"
            onClick={() => router.push(dayUrl)}
            className="w-full text-left rounded-xl transition-colors hover:bg-(--dk-mist)/30 focus-visible:outline-none"
          >
            <DayPageEntriesView
              entries={page.entries ?? []}
              maxEntries={2}
              maxBlocksPerEntry={3}
            />

            {/* View full page CTA */}
            <div className="flex items-center gap-1.5 pb-2 pt-1 text-xs font-medium text-(--dk-sky)/80">
              <span>View full page</span>
              <ArrowRight size={11} />
            </div>
          </button>

          {/* Like bar */}
          <div className="mt-0.5">
            <DayPageLikeBar
              pageId={page._id}
              likesCount={page.likesCount ?? 0}
              commentsCount={page.commentsCount ?? 0}
              userLiked={!!page.userLiked}
            />
          </div>
        </div>
      ) : (
        /* Legacy fallback */
        <div className="space-y-1">
          {dateLabel && (
            <div className="pb-1.5">
              <span className="text-[11px] font-medium uppercase tracking-widest text-(--dk-slate)/60">
                {dateLabel}
              </span>
            </div>
          )}
          {items.map((item: any, idx: any) => (
            <div
              key={item?.id ? `${item.type || "item"}-${item.id}` : `fallback-${idx}`}
              className="border-b border-(--dk-ink)/8 pb-2 last:border-b-0 last:pb-0"
            >
              {item?.type === "post" ? (
                <FeedPostItem
                  post={item}
                  isLast={idx === items.length - 1}
                  onRefreshMedia={onRefreshMedia}
                />
              ) : (
                <FeedUserDayItemRow item={item} isLast={idx === items.length - 1} />
              )}
            </div>
          ))}
          {hasMoreItems && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/${username}?date=${toDayParam(selectedDate)}`) }}
              className="w-full pt-1 text-sm text-(--dk-sky) font-medium hover:text-(--dk-sky)/80"
            >
              See more
            </button>
          )}
        </div>
      )}

      <ReportEntityModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        entityLabel="user"
        entityId={String(username)}
        buildPath={({ id }) => `/user/${encodeURIComponent(id)}/report`}
        reasons={[
          { value: "spam", label: "Spam", hint: "Fake accounts or promotions" },
          { value: "impersonation", label: "Impersonation", hint: "Pretending to be someone else" },
          { value: "harassment", label: "Harassment or bullying", hint: "Threats, targeting, insults" },
          { value: "hate", label: "Hate speech", hint: "Attacks based on identity" },
          { value: "inappropriate", label: "Inappropriate content", hint: "Content that violates guidelines" },
          { value: "other", label: "Other", hint: "Doesn't fit above" },
        ]}
        defaultReason="spam"
      />

      <BlockUserModal
        username={String(username)}
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
      />
    </article>
  )
}
