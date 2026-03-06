"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"
import FeedPostItem from "./FeedPostItem"
import FeedUserDayItemRow from "./FeedUserDayItemRow"
import FeedUserDayCard from "./FeedUserDayCard"
import { MoreHorizontal, Flag, Ban } from "lucide-react"
import BlockUserModal from "../common/BlockUserModal"
import ReportEntityModal from "@/components/common/ReportEntityModal"
import { useRouter } from "next/navigation"
import { toDayParam } from "@/lib/date"
import { resolveProfilePictureUrl } from "@/lib/media"
const AVATAR_FALLBACK = "/avatar-placeholder.png"

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
  const displayName = userDay?.user_info?.displayName

  const items = useMemo(() => {
    return userDay.data || []
  }, [userDay.data])

  const totalItems = Number(
    (userDay.postsCount ?? 0) +
      (userDay.tasksCount ?? 0) +
      (userDay.eventsCount ?? 0),
  )

  const hasMoreItems = (totalItems || items.length) > items.length

  // menu state
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // modals
  const [reportOpen, setReportOpen] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return
      if (menuRef.current.contains(e.target as Node)) return
      setMenuOpen(false)
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
    <section className="relative px-2 sm:px-4">
      <div
        className="group flex items-start gap-3 px-1 sm:px-2 pb-3 cursor-pointer"
        onClick={() => router.push(`/${username}`)}
      >
        <Image
          src={avatarSrc}
          alt={username}
          width={44}
          height={44}
          className="h-11 w-11 rounded-sm object-cover ring-1 ring-(--dk-ink)/10"
        />

        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="truncate text-[15px] font-semibold text-(--dk-ink)">
                  {displayName}
                </h3>
                <span className="rounded-md bg-(--dk-mist)/80 px-1.5 py-0.5 text-[11px] font-medium text-(--dk-slate)">
                  {userDay.user_info.currentStreak || 0}d
                </span>
              </div>

              <p className="truncate text-xs text-(--dk-slate)">@{username}</p>
            </div>

            {/* 3-dots + menu */}
            <div ref={menuRef} className="relative shrink-0">
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-lg text-(--dk-slate) transition hover:bg-(--dk-mist)/70 hover:text-(--dk-ink) cursor-pointer"
                aria-label="More options"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setMenuOpen((v) => !v)
                }}
              >
                <MoreHorizontal size={18} />
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-48 rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) shadow-lg overflow-hidden z-20"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setMenuOpen(false)
                      setReportOpen(true)
                    }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-(--dk-ink)/5 transition text-(--dk-ink)"
                  >
                    <Flag size={16} />
                    Report user
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setMenuOpen(false)
                      setBlockOpen(true)
                    }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-(--dk-error)/10 transition text-(--dk-error)"
                  >
                    <Ban size={16} />
                    Block user
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="pr-1 sm:ml-[var(--lane-x)] sm:pr-[var(--lane-right,1rem)]">
        <FeedUserDayCard userDay={userDay} selectedDate={selectedDate} />

        <div className="space-y-1">
          {items.map((item: any, idx: any) => (
            <div
              key={
                item?.id
                  ? `${item.type || "item"}-${item.id}`
                  : `${item?.type || "item"}-fallback-${idx}`
              }
              className="border-b border-(--dk-ink)/10 pb-1 last:border-b-0 sm:border-b-0 sm:pb-0"
            >
              {item?.type === "post" ? (
                <FeedPostItem
                  key={item?.id ? `post-${item.id}` : `post-fallback-${idx}`}
                  post={item}
                  isLast={idx === items.length - 1}
                  onRefreshMedia={onRefreshMedia}
                />
              ) : (
                <FeedUserDayItemRow
                  key={
                    item?.id
                      ? `${item.type}-${item.id}`
                      : `${item?.type || "item"}-fallback-${idx}`
                  }
                  item={item}
                  isLast={idx === items.length - 1}
                />
              )}
            </div>
          ))}

          {hasMoreItems ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                router.push(
                  `/${userDay.user_info.username}?date=${toDayParam(
                    selectedDate,
                  )}`,
                )
              }}
              className="w-full transition px-4 py-1 text-sm text-(--dk-sky) font-medium flex items-center justify-center gap-2 cursor-pointer hover:text-(--dk-sky)/80"
            >
              <span>See more</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* report modal (generic) */}
      <ReportEntityModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        entityLabel="user"
        entityId={String(username)}
        buildPath={({ id }) => `/user/${encodeURIComponent(id)}/report`}
        reasons={[
          { value: "spam", label: "Spam", hint: "Fake accounts or promotions" },
          {
            value: "impersonation",
            label: "Impersonation",
            hint: "Pretending to be someone else",
          },
          {
            value: "harassment",
            label: "Harassment or bullying",
            hint: "Threats, targeting, insults",
          },
          {
            value: "hate",
            label: "Hate speech",
            hint: "Attacks based on identity",
          },
          {
            value: "inappropriate",
            label: "Inappropriate content",
            hint: "Content that violates guidelines",
          },
          { value: "other", label: "Other", hint: "Doesn’t fit above" },
        ]}
        defaultReason="spam"
      />

      {/* block modal */}
      <BlockUserModal
        username={String(username)}
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
      />
    </section>
  )
}
