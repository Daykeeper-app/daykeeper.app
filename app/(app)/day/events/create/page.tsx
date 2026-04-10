"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"
import FormAlert from "@/components/Form/FormAlert"
import PrivacyPicker, {
  type PrivacyValue,
} from "@/components/common/PrivacyPicker"
import { toDDMMYYYY } from "@/lib/date"

type Privacy = PrivacyValue

type ApiOk<T> = { message?: string; data?: T }

function safeApiMessage(err: any) {
  try {
    const parsed = JSON.parse(err?.message)
    const msg = parsed?.message

    if (typeof msg === "string") return msg

    if (msg && typeof msg === "object") {
      if (typeof msg.message === "string") return msg.message
      return JSON.stringify(msg)
    }

    return "Something went wrong."
  } catch {
    return err?.message ? String(err.message) : "Something went wrong."
  }
}

async function readJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

function combineDateTime(date: string, time: string) {
  if (!date) return ""
  const t = time?.trim() ? time.trim() : "00:00"
  const d = new Date(`${date}T${t}:00`)
  return d.toISOString()
}

function addMinutes(date: string, time: string, minutes: number) {
  const base = new Date(`${date}T${time || "00:00"}:00`)
  if (!Number.isFinite(base.getTime())) return null
  base.setMinutes(base.getMinutes() + minutes)

  const yyyy = base.getFullYear()
  const mm = String(base.getMonth() + 1).padStart(2, "0")
  const dd = String(base.getDate()).padStart(2, "0")
  const hh = String(base.getHours()).padStart(2, "0")
  const min = String(base.getMinutes()).padStart(2, "0")

  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${min}`,
  }
}

function formatEventSummaryDate(date: Date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const target = new Date(date)
  target.setHours(0, 0, 0, 0)

  if (target.getTime() === today.getTime()) return "today"
  if (target.getTime() === tomorrow.getTime()) return "tomorrow"

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function todayInputs(fromDate?: string | null) {
  if (fromDate && /^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
    return { date: fromDate, time: "00:00" }
  }
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  const hh = String(now.getHours()).padStart(2, "0")
  const min = String(now.getMinutes()).padStart(2, "0")
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` }
}

function CreateEventForm() {
  const router = useRouter()
  const sp = useSearchParams()
  const qc = useQueryClient()

  const goToTodayFeed = () =>
    router.replace(`/?date=${encodeURIComponent(toDDMMYYYY(new Date()))}`)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [privacy, setPrivacy] = useState<Privacy>("public")

  const [startDate, setStartDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("")

  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    const next = todayInputs(sp.get("date"))
    const defaultEnd = addMinutes(next.date, next.time, 30)
    setStartDate(next.date)
    setStartTime(next.time)
    setEndDate(defaultEnd?.date ?? next.date)
    setEndTime(defaultEnd?.time ?? next.time)
  }, [sp])

  const rangeSummary = useMemo(() => {
    if (!startDate || !endDate) return null

    const start = new Date(`${startDate}T${startTime || "00:00"}:00`)
    const end = new Date(`${endDate}T${endTime || "00:00"}:00`)

    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      return null
    }

    const diffMs = end.getTime() - start.getTime()
    if (diffMs < 0) return null

    const totalMinutes = Math.round(diffMs / 60000)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    const durationParts = []

    if (hours > 0) durationParts.push(`${hours}h`)
    if (minutes > 0 || durationParts.length === 0) {
      durationParts.push(`${minutes}min`)
    }

    const sameDay = startDate === endDate
    const startText = start.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
    const endText = end.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
    const endDateText = end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
    const startDateLabel = formatEventSummaryDate(start)
    const endDateLabel = formatEventSummaryDate(end)

    return sameDay
      ? `${startText} to ${endText} • ${durationParts.join(" ")}`
      : `${startText} on ${startDateLabel} to ${endText} on ${endDateLabel} • ${durationParts.join(" ")}`
  }, [startDate, startTime, endDate, endTime])

  const rangeValid = useMemo(() => {
    if (!startDate || !endDate) return false
    const s = new Date(`${startDate}T${startTime || "00:00"}:00`).getTime()
    const e = new Date(`${endDate}T${endTime || "00:00"}:00`).getTime()
    return Number.isFinite(s) && Number.isFinite(e) && e >= s
  }, [startDate, startTime, endDate, endTime])

  const canSave = useMemo(() => {
    if (busy) return false
    if (!title.trim()) return false
    if (!rangeValid) return false
    return true
  }, [title, rangeValid, busy])

  async function onSave() {
    if (!canSave || busy) return

    setBusy(true)
    setFormError(null)

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        privacy,
        dateStart: combineDateTime(startDate, startTime),
        dateEnd: combineDateTime(endDate, endTime),
      }

      const res = await apiFetch(`${API_URL}/day/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      })

      const data = await readJsonSafe<ApiOk<any>>(res)

      if (!res.ok) {
        const msg = data?.message || "Could not create event."
        throw new Error(JSON.stringify({ message: msg }))
      }

      qc.invalidateQueries({ queryKey: ["userDay"] })
      goToTodayFeed()
    } catch (err: any) {
      setFormError(String(safeApiMessage(err)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="pb-20 lg:pb-0">
      <div className="mx-auto min-h-screen max-w-3xl bg-(--dk-paper) lg:border-x lg:border-(--dk-ink)/10">
        <div className="sticky top-0 z-10 border-b border-(--dk-ink)/10 bg-(--dk-paper)/96 backdrop-blur-md">
          <div className="h-0.5 w-full bg-(--dk-sky)/65" />
          <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <button
              onClick={() => router.back()}
              className="rounded-lg p-2 transition hover:bg-(--dk-mist)/75"
              aria-label="Back"
              disabled={busy}
            >
              <ArrowLeft size={18} className="text-(--dk-ink)" />
            </button>

            <div className="leading-tight">
              <div className="text-sm font-semibold text-(--dk-ink)">
                Create event
              </div>
              <div className="text-xs text-(--dk-slate)">
                Add a new event
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-5">
          {formError ? <FormAlert type="error">{formError}</FormAlert> : null}

          <div className="space-y-2">
            <div className="text-xs font-medium text-(--dk-slate)">Title</div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className="w-full rounded-lg border border-transparent bg-(--dk-mist)/45 px-3 py-2 text-sm text-(--dk-ink)"
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-(--dk-slate)">
              Description
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Event details"
              className={[
                "w-full rounded-lg border border-transparent bg-(--dk-mist)/45",
                "px-3 py-2 text-sm text-(--dk-ink)",
                "focus:outline-none focus:ring-2 focus:ring-(--dk-sky)/30",
              ].join(" ")}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-(--dk-slate)">
                Start date
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-2 w-full rounded-lg border border-transparent bg-(--dk-mist)/45 px-3 py-2 text-sm text-(--dk-ink)"
              />
            </div>
            <div>
              <div className="text-xs font-medium text-(--dk-slate)">
                Start time
              </div>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-2 w-full rounded-lg border border-transparent bg-(--dk-mist)/45 px-3 py-2 text-sm text-(--dk-ink)"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-(--dk-slate)">End date</div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-2 w-full rounded-lg border border-transparent bg-(--dk-mist)/45 px-3 py-2 text-sm text-(--dk-ink)"
              />
            </div>
            <div>
              <div className="text-xs font-medium text-(--dk-slate)">End time</div>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-2 w-full rounded-lg border border-transparent bg-(--dk-mist)/45 px-3 py-2 text-sm text-(--dk-ink)"
              />
            </div>
          </div>

          {rangeSummary ? (
            <div className="rounded-xl bg-(--dk-sky)/10 px-3 py-3">
              <div className="text-xs font-medium text-(--dk-slate)">
                Event time
              </div>
              <div className="mt-1 text-sm font-semibold text-(--dk-ink)">
                {rangeSummary}
              </div>
            </div>
          ) : null}

          {!rangeValid ? (
            <div className="text-xs text-red-500">
              End time must be after start time.
            </div>
          ) : null}

          <PrivacyPicker value={privacy} onChange={setPrivacy} />

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={busy}
              className="rounded-lg bg-(--dk-mist)/55 px-3 py-2 text-sm transition hover:bg-(--dk-mist)/80 disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={!canSave}
              className="rounded-lg bg-(--dk-sky) px-3 py-2 text-sm text-white transition hover:opacity-95 disabled:opacity-60"
            >
              {busy ? "Saving..." : "Create event"}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function CreateEventPage() {
  return (
    <Suspense
      fallback={
        <main className="pb-20 lg:pb-0">
          <div className="mx-auto min-h-screen max-w-3xl bg-(--dk-paper) lg:border-x lg:border-(--dk-ink)/10">
            <div className="px-4 py-6 text-sm text-(--dk-slate)">Loading…</div>
          </div>
        </main>
      }
    >
      <CreateEventForm />
    </Suspense>
  )
}
