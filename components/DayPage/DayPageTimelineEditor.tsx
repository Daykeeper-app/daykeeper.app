"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Clock3, Pencil, Plus, Trash2 } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import DayPageEditor from "@/components/DayPage/DayPageEditor"
import DayPageBlocksView from "@/components/DayPage/DayPageBlocksView"
import PrivacyPicker, {
  type PrivacyValue,
} from "@/components/common/PrivacyPicker"
import { API_URL } from "@/config"
import { apiFetch } from "@/lib/authClient"
import type { DayPage, DayPageEntry } from "@/lib/feedTypes"

type ActiveEditor = { kind: "new" } | { kind: "entry"; id: string } | null

function formatEntryTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function normalizePage(page: DayPage | null | undefined): DayPage {
  return {
    ...(page ?? {}),
    privacy: page?.privacy ?? "public",
    blocks: Array.isArray(page?.blocks) ? page.blocks : [],
    entries: Array.isArray(page?.entries) ? page.entries : [],
  } as DayPage
}

export default function DayPageTimelineEditor({
  dateParam,
  initialPage,
  onDirtyChange,
}: {
  dateParam: string
  initialPage: DayPage | null
  onDirtyChange?: (dirty: boolean) => void
}) {
  const qc = useQueryClient()
  const [page, setPage] = useState<DayPage>(() => normalizePage(initialPage))
  const [active, setActive] = useState<ActiveEditor>({ kind: "new" })
  const [dirty, setDirty] = useState(false)
  const [privacySaving, setPrivacySaving] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    onDirtyChange?.(dirty)
    if (!dirty) return
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", preventUnload)
    return () => window.removeEventListener("beforeunload", preventUnload)
  }, [dirty, onDirtyChange])

  const entries = useMemo(
    () =>
      [...(page.entries ?? [])].sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() -
          new Date(a.publishedAt).getTime(),
      ),
    [page.entries],
  )

  function canSwitchEditor() {
    return (
      !dirty ||
      window.confirm(
        "Discard your unpublished changes and open another entry?",
      )
    )
  }

  function startNewEntry() {
    if (!canSwitchEditor()) return
    setDirty(false)
    setActive({ kind: "new" })
  }

  function editEntry(entry: DayPageEntry) {
    if (!canSwitchEditor()) return
    setDirty(false)
    setActive({ kind: "entry", id: entry._id })
  }

  const handleSaved = useCallback((nextPage: DayPage, entryId: string) => {
    setPage(normalizePage(nextPage))
    setActive({ kind: "entry", id: entryId })
    setDirty(false)
  }, [])

  async function changePrivacy(next: PrivacyValue) {
    if (privacySaving || next === page.privacy) return
    const previous = page.privacy
    setPage((current) => ({ ...current, privacy: next }))
    setPrivacySaving(true)
    try {
      const res = await apiFetch(
        `${API_URL}/day-pages/${encodeURIComponent(dateParam)}/privacy`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ privacy: next }),
        },
      )
      if (!res.ok) throw new Error("Could not update privacy")
      const json = await res.json().catch(() => null)
      if (json?.data) setPage(normalizePage(json.data))
      void qc.invalidateQueries({ queryKey: ["dayPage"] })
      void qc.invalidateQueries({ queryKey: ["feed"] })
    } catch {
      setPage((current) => ({ ...current, privacy: previous }))
    } finally {
      setPrivacySaving(false)
    }
  }

  async function removeEntry(entry: DayPageEntry) {
    if (
      !window.confirm(
        `Delete the entry published at ${formatEntryTime(entry.publishedAt)}?`,
      )
    ) {
      return
    }
    setDeleteError(null)
    try {
      const endpoint =
        `${API_URL}/day-pages/${encodeURIComponent(dateParam)}/entries/` +
        encodeURIComponent(entry._id)
      const requestDelete = (force = false) =>
        apiFetch(endpoint, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version: entry.version, force }),
        })
      let res = await requestDelete()
      let json = await res.json().catch(() => null)
      if (
        res.status === 409 &&
        json?.conflict &&
        window.confirm(
          "This entry changed on another device. Delete the newer version anyway?",
        )
      ) {
        res = await requestDelete(true)
        json = await res.json().catch(() => null)
      }
      if (!res.ok) {
        setDeleteError(json?.message || "Could not delete this entry.")
        return
      }
      setPage(normalizePage(json?.data))
      if (active?.kind === "entry" && active.id === entry._id) {
        setActive({ kind: "new" })
        setDirty(false)
      }
      void qc.invalidateQueries({ queryKey: ["dayPage"] })
      void qc.invalidateQueries({ queryKey: ["feed"] })
    } catch {
      setDeleteError("Could not delete this entry.")
    }
  }

  const activeEntry =
    active?.kind === "entry"
      ? entries.find((entry) => entry._id === active.id) ?? null
      : null
  const otherMediaCount = (page.blocks ?? []).filter((block) => {
    if (block.type !== "image") return false
    if (!activeEntry) return true
    return !activeEntry.blocks.some((entryBlock) => entryBlock._id === block._id)
  }).length
  const mediaSlots = Math.max(0, 5 - otherMediaCount)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--dk-ink)/8 px-4 py-2.5 sm:px-5">
        <button
          type="button"
          onClick={startNewEntry}
          disabled={active?.kind === "new"}
          className="inline-flex items-center gap-1.5 rounded-lg bg-(--dk-sky)/12 px-3 py-1.5 text-xs font-semibold text-(--dk-sky) transition hover:bg-(--dk-sky)/20 disabled:cursor-default disabled:opacity-45"
        >
          <Plus size={13} />
          New entry
        </button>
        <div className={privacySaving ? "opacity-60" : ""}>
          <PrivacyPicker
            compact
            value={page.privacy as PrivacyValue}
            onChange={changePrivacy}
          />
        </div>
      </div>

      {deleteError ? (
        <p className="px-4 py-2 text-xs text-(--dk-error)">{deleteError}</p>
      ) : null}

      {active?.kind === "new" ? (
        <section className="border-b border-(--dk-ink)/10 bg-(--dk-sky)/3">
          <div className="flex items-center gap-1.5 px-4 pt-3 text-[11px] font-semibold uppercase tracking-wider text-(--dk-sky)">
            <Clock3 size={12} />
            New entry
          </div>
          <DayPageEditor
            key={`new-${dateParam}`}
            dateParam={dateParam}
            maxMedia={mediaSlots}
            onSaved={handleSaved}
            onDirtyChange={setDirty}
          />
        </section>
      ) : null}

      <div className="divide-y divide-(--dk-ink)/10">
        {entries.map((entry) => {
          const editing = active?.kind === "entry" && active.id === entry._id
          return (
            <article key={entry._id} className={editing ? "bg-(--dk-sky)/3" : ""}>
              <header className="flex items-center justify-between gap-3 px-4 pt-3 sm:px-5">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-(--dk-slate)">
                  <Clock3 size={11} className="text-(--dk-sky)" />
                  <time dateTime={entry.publishedAt}>
                    {formatEntryTime(entry.publishedAt)}
                  </time>
                  {entry.edited ? (
                    <span className="text-(--dk-slate)/60">· Edited</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  {!editing ? (
                    <button
                      type="button"
                      onClick={() => editEntry(entry)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-(--dk-slate) transition hover:bg-(--dk-mist) hover:text-(--dk-ink)"
                    >
                      <Pencil size={11} />
                      Edit
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeEntry(entry)}
                    className="rounded-md p-1.5 text-(--dk-slate)/60 transition hover:bg-(--dk-error)/10 hover:text-(--dk-error)"
                    aria-label="Delete entry"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </header>

              {editing ? (
                <DayPageEditor
                  key={entry._id}
                  dateParam={dateParam}
                  entry={entry}
                  maxMedia={mediaSlots}
                  onSaved={handleSaved}
                  onDirtyChange={setDirty}
                />
              ) : (
                <div className="pb-3">
                  <DayPageBlocksView blocks={entry.blocks ?? []} />
                </div>
              )}
            </article>
          )
        })}
      </div>

      {!entries.length && active?.kind !== "new" ? (
        <div className="px-4 py-8 text-center text-sm italic text-(--dk-slate)">
          No entries for this day yet.
        </div>
      ) : null}
    </div>
  )
}
