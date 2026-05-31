"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

type Props = {
  selectedDate: Date
  onChangeDate: (days: number) => void
  isToday: boolean

  loading: boolean
  error: string | null
  usersCount: number
  onRetry: () => void

  onSelectDate: (date: Date) => void
}

function formatDate(date: Date) {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return "Today"
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday"

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function toISODateInputValue(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function fromISOToLocalDate(iso: string) {
  // iso: yyyy-mm-dd -> local Date at 00:00 (no timezone weirdness)
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date()
  dt.setFullYear(y, m - 1, d)
  dt.setHours(0, 0, 0, 0)
  return dt
}

export default function FeedHeader({
  selectedDate,
  onChangeDate,
  isToday,
  loading,
  error,
  usersCount,
  onRetry,
  onSelectDate,
}: Props) {
  const [open, setOpen] = useState(false)

  const [draftISO, setDraftISO] = useState(() =>
    toISODateInputValue(selectedDate),
  )

  const popoverRef = useRef<HTMLDivElement | null>(null)

  // whenever popover opens, sync draft with current selectedDate
  useEffect(() => {
    if (!open) return
    setDraftISO(toISODateInputValue(selectedDate))
  }, [open, selectedDate])

  useEffect(() => {
    if (!open) return

    const onPointerDownCapture = (e: PointerEvent) => {
      const el = popoverRef.current
      if (!el) return
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false)
    }

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }

    document.addEventListener("pointerdown", onPointerDownCapture, true) // capture
    document.addEventListener("keydown", onEsc)

    return () => {
      document.removeEventListener("pointerdown", onPointerDownCapture, true)
      document.removeEventListener("keydown", onEsc)
    }
  }, [open])

  const commitDraft = (iso: string) => {
    if (!iso) return
    onSelectDate(fromISOToLocalDate(iso))
    setOpen(false)
  }

  return (
    <div className="sticky top-0 z-10 border-b border-(--dk-ink)/10 bg-(--dk-paper)/96 backdrop-blur-md">
      <div className="h-0.5 w-full bg-(--dk-sky)/65" />

      <div className="px-3 py-2 sm:px-5 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => onChangeDate(-1)}
            className="rounded-lg p-1.5 transition hover:bg-(--dk-mist)/75 cursor-pointer"
            aria-label="Previous day"
          >
            <ChevronLeft size={18} className="text-(--dk-slate)" />
          </button>

          <div className="flex-1 text-center relative" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex w-full flex-col items-center justify-center rounded-lg py-1 transition hover:bg-(--dk-mist)/60"
              aria-label="Pick a date"
              aria-expanded={open}
            >
              <p className="text-[13px] font-semibold text-(--dk-ink) sm:text-sm">
                {formatDate(selectedDate)}
              </p>
              <p className="hidden sm:block text-xs text-(--dk-slate)">
                {selectedDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </button>

            {open && (
              <div className="absolute left-1/2 mt-2 w-55 -translate-x-1/2 rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) p-3 shadow-lg">
                <p className="text-xs text-(--dk-slate) mb-2">Jump to date</p>

                <input
                  type="date"
                  value={draftISO}
                  onChange={(e) => setDraftISO(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitDraft(draftISO)
                  }}
                  className="w-full rounded-lg border border-(--dk-ink)/15 bg-transparent px-3 py-2 text-sm text-(--dk-ink) outline-none focus:ring-2 focus:ring-(--dk-sky)/40"
                />

                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const t = new Date()
                      t.setHours(0, 0, 0, 0)
                      onSelectDate(t)
                      setOpen(false)
                    }}
                    className="text-xs underline text-(--dk-slate) hover:text-(--dk-ink)"
                  >
                    Today
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => commitDraft(draftISO)}
                      className="text-xs underline text-(--dk-slate) hover:text-(--dk-ink)"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => onChangeDate(1)}
            className="rounded-lg p-1.5 transition hover:bg-(--dk-mist)/75 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            aria-label="Next day"
            disabled={isToday}
          >
            <ChevronRight size={18} className="text-(--dk-slate)" />
          </button>
        </div>

        <div className="mt-1 flex items-center justify-center gap-3 sm:mt-3">
          {loading ? (
            <span className="text-xs text-(--dk-slate)">Loading…</span>
          ) : error ? (
            <button
              onClick={onRetry}
              className="text-xs underline text-(--dk-slate) hover:text-(--dk-ink)"
            >
              Failed to load. Click to retry.
            </button>
          ) : usersCount > 0 ? (
            <span className="text-xs text-(--dk-slate)">
              {usersCount} {usersCount === 1 ? "page" : "pages"} from people you follow
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
