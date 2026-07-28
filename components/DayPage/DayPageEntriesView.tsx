"use client"

import { Clock3 } from "lucide-react"

import DayPageBlocksView from "@/components/DayPage/DayPageBlocksView"
import type { DayPageEntry } from "@/lib/feedTypes"

function formatEntryTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

export default function DayPageEntriesView({
  entries,
  maxEntries,
  maxBlocksPerEntry,
}: {
  entries: DayPageEntry[]
  maxEntries?: number
  maxBlocksPerEntry?: number
}) {
  const sorted = [...(entries || [])].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )
  const visible = maxEntries == null ? sorted : sorted.slice(0, maxEntries)
  const hidden = sorted.length - visible.length

  if (!visible.length) {
    return (
      <div className="px-4 py-8 text-center text-sm italic text-(--dk-slate)">
        Nothing written for this day yet.
      </div>
    )
  }

  return (
    <div className="divide-y divide-(--dk-ink)/8">
      {visible.map((entry) => (
        <article key={entry._id} className="py-3">
          <div className="flex items-center gap-1.5 px-4 pb-1.5 text-[11px] font-medium text-(--dk-slate)">
            <Clock3 size={11} className="text-(--dk-sky)" />
            <time dateTime={entry.publishedAt}>{formatEntryTime(entry.publishedAt)}</time>
            {entry.edited ? (
              <span className="text-(--dk-slate)/60">· Edited</span>
            ) : null}
          </div>
          <DayPageBlocksView
            blocks={entry.blocks ?? []}
            maxBlocks={maxBlocksPerEntry}
          />
        </article>
      ))}
      {hidden > 0 ? (
        <p className="px-4 py-2 text-xs text-(--dk-slate)">
          +{hidden} earlier entr{hidden === 1 ? "y" : "ies"}…
        </p>
      ) : null}
    </div>
  )
}
