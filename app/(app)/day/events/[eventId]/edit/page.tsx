"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"

import { useEventDetail } from "@/hooks/useEventDetail"

import FormAlert from "@/components/Form/FormAlert"
import PrivacyPicker, {
  type PrivacyValue,
} from "@/components/common/PrivacyPicker"

type ApiOk<T> = { message?: string; data?: T }

type Privacy = PrivacyValue // "public" | "private" | "close friends"

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

// expects "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DD HH:mm"
function localToDateInput(local?: string) {
  if (!local) return ""
  return local.slice(0, 10)
}

// expects "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DD HH:mm"
function localToTimeInput(local?: string) {
  if (!local) return ""
  const t = local.split(" ")[1] || ""
  if (!t) return ""
  return t.slice(0, 5)
}

function isoToDateTimeInputs(iso?: string) {
  if (!iso) return { date: "", time: "" }
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` }
}

function combineDateTime(date: string, time: string) {
  // We treat this as local time, then serialize to ISO
  if (!date) return ""
  const t = time?.trim() ? time.trim() : "00:00"
  const d = new Date(`${date}T${t}:00`)
  return d.toISOString()
}

export default function EditEventPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const q = useEventDetail(eventId)
  const loading = q.isLoading
  const error = q.error ? (q.error as any).message : null
  const ev: any = q.data ?? null

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [privacy, setPrivacy] = useState<Privacy>("public")

  // event range inputs
  const [startDate, setStartDate] = useState("") // YYYY-MM-DD
  const [startTime, setStartTime] = useState("") // HH:mm
  const [endDate, setEndDate] = useState("") // YYYY-MM-DD
  const [endTime, setEndTime] = useState("") // HH:mm

  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Initialize form when event arrives
  useEffect(() => {
    if (!ev) return

    setTitle(String(ev.title ?? ""))
    setDescription(String(ev.description ?? ""))
    setPrivacy((ev.privacy as Privacy) || "public")

    // Prefer Local fields because your app already calculates them
    const sLocal = ev.dateStartLocal as string | undefined
    const eLocal = ev.dateEndLocal as string | undefined

    if (sLocal) {
      setStartDate(localToDateInput(sLocal))
      setStartTime(localToTimeInput(sLocal))
    } else {
      const x = isoToDateTimeInputs(ev.dateStart)
      setStartDate(x.date)
      setStartTime(x.time)
    }

    if (eLocal) {
      setEndDate(localToDateInput(eLocal))
      setEndTime(localToTimeInput(eLocal))
    } else {
      const x = isoToDateTimeInputs(ev.dateEnd)
      setEndDate(x.date)
      setEndTime(x.time)
    }
  }, [ev])

  const rangeValid = useMemo(() => {
    if (!startDate) return false
    if (!endDate) return false

    const s = new Date(`${startDate}T${startTime || "00:00"}:00`).getTime()
    const e = new Date(`${endDate}T${endTime || "00:00"}:00`).getTime()
    return Number.isFinite(s) && Number.isFinite(e) && e >= s
  }, [startDate, startTime, endDate, endTime])

  const canSave = useMemo(() => {
    if (!ev) return false
    if (busy) return false

    const t = title.trim()
    if (!t.length) return false

    if (!rangeValid) return false

    const nextStartISO = combineDateTime(startDate, startTime)
    const nextEndISO = combineDateTime(endDate, endTime)

    const changed =
      t !== String(ev.title ?? "").trim() ||
      description.trim() !== String(ev.description ?? "").trim() ||
      privacy !== ev.privacy ||
      nextStartISO !== String(ev.dateStart ?? "") ||
      nextEndISO !== String(ev.dateEnd ?? "")

    return changed
  }, [
    ev,
    title,
    description,
    privacy,
    startDate,
    startTime,
    endDate,
    endTime,
    rangeValid,
    busy,
  ])

  async function onSave() {
    if (!ev) return
    if (busy) return

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

      const res = await apiFetch(
        `${API_URL}/day/event/${encodeURIComponent(String(eventId))}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          cache: "no-store",
        },
      )

      const data = await readJsonSafe<ApiOk<any>>(res)

      if (!res.ok) {
        const msg = data?.message || "Could not update event."
        throw new Error(JSON.stringify({ message: msg }))
      }

      // Update detail cache
      qc.setQueryData(["eventDetail", eventId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          title: payload.title,
          description: payload.description,
          privacy: payload.privacy,
          dateStart: payload.dateStart,
          dateEnd: payload.dateEnd,
        }
      })

      qc.invalidateQueries({ queryKey: ["userDay"] })

      router.push(`/day/events/${eventId}`)
      router.refresh()
    } catch (err: any) {
      setFormError(String(safeApiMessage(err)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="pb-20 lg:pb-0">
      <div className="max-w-2xl mx-auto border-x border-(--dk-ink)/10 bg-(--dk-paper) min-h-screen">
        {/* Sticky top header */}
        <div className="sticky top-0 bg-(--dk-paper)/95 backdrop-blur-md">
          <div className="h-1 w-full bg-(--dk-sky)/70" />
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-(--dk-mist) transition"
              aria-label="Back"
              disabled={busy}
            >
              <ArrowLeft size={18} className="text-(--dk-ink)" />
            </button>

            <div className="leading-tight">
              <div className="text-sm font-semibold text-(--dk-ink)">
                Edit event
              </div>
              <div className="text-xs text-(--dk-slate)">Update</div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="px-4 py-6 text-sm text-(--dk-slate)">Loading…</div>
        )}

        {!loading && error && (
          <div className="px-4 py-6 text-sm text-(--dk-error)">{error}</div>
        )}

        {!loading && !error && ev && (
          <div className="px-4 py-4 space-y-4">
            {formError ? <FormAlert type="error">{formError}</FormAlert> : null}

            <div className="space-y-2">
              <div className="text-xs font-medium text-(--dk-slate)">Title</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Event title…"
                className={[
                  "w-full rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper)",
                  "px-3 py-2 text-sm text-(--dk-ink)",
                  "focus:outline-none focus:ring-2 focus:ring-(--dk-sky)/40",
                ].join(" ")}
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-(--dk-slate)">
                Description
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Describe the event…"
                className={[
                  "w-full rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper)",
                  "px-3 py-2 text-sm text-(--dk-ink)",
                  "focus:outline-none focus:ring-2 focus:ring-(--dk-sky)/40",
                ].join(" ")}
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-(--dk-slate)">
                Date range
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) p-3">
                  <div className="text-xs font-medium text-(--dk-slate) mb-2">
                    Start
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      disabled={busy}
                      className="w-full rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) px-3 py-2 text-sm text-(--dk-ink) focus:outline-none focus:ring-2 focus:ring-(--dk-sky)/40"
                    />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      disabled={busy}
                      className="w-full rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) px-3 py-2 text-sm text-(--dk-ink) focus:outline-none focus:ring-2 focus:ring-(--dk-sky)/40"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) p-3">
                  <div className="text-xs font-medium text-(--dk-slate) mb-2">
                    End
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      disabled={busy}
                      className="w-full rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) px-3 py-2 text-sm text-(--dk-ink) focus:outline-none focus:ring-2 focus:ring-(--dk-sky)/40"
                    />
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={busy}
                      className="w-full rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) px-3 py-2 text-sm text-(--dk-ink) focus:outline-none focus:ring-2 focus:ring-(--dk-sky)/40"
                    />
                  </div>
                </div>
              </div>

              {!rangeValid ? (
                <div className="text-xs text-(--dk-error)">
                  End must be after start.
                </div>
              ) : null}
            </div>

            <PrivacyPicker
              value={privacy}
              onChange={(v) => {
                if (busy) return
                setPrivacy(v)
              }}
            />

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={busy}
                className="px-3 py-2 rounded-xl border border-(--dk-ink)/10 hover:bg-(--dk-ink)/5 text-sm transition disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={onSave}
                disabled={!canSave}
                className="px-3 py-2 rounded-xl bg-(--dk-sky) text-white text-sm hover:opacity-95 transition disabled:opacity-60"
              >
                {busy ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
