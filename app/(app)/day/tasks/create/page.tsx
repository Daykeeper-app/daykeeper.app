"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ClipboardList } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"
import FormAlert from "@/components/Form/FormAlert"
import PrivacyPicker, {
  type PrivacyValue,
} from "@/components/common/PrivacyPicker"
import TaskCompletionToggle from "@/components/Task/TaskCompletionToggle"
import { useDailyTasks } from "@/hooks/useDailyTasks"
import { toDDMMYYYY } from "@/lib/date"
import { CenteredSpinner, LoadingSpinner } from "@/components/common/LoadingIndicator"
import { LoadingRows, PageSkeleton } from "@/components/common/LoadingSkeleton"

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

function CreateTaskForm() {
  const router = useRouter()
  const sp = useSearchParams()
  const qc = useQueryClient()

  const goToTodayFeed = () =>
    router.replace(`/?date=${encodeURIComponent(toDDMMYYYY(new Date()))}`)

  const [title, setTitle] = useState("")
  const [privacy, setPrivacy] = useState<Privacy>("public")
  const [completed, setCompleted] = useState(false)
  const [daily, setDaily] = useState(false)
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")

  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    items: dailyTasks,
    loading: dailyLoading,
    loadingMore: dailyLoadingMore,
    hasMore: dailyHasMore,
    loadMore: dailyLoadMore,
  } = useDailyTasks()

  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const next = todayInputs(sp.get("date"))
    setDate(next.date)
    setTime(next.time)
  }, [sp])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        if (dailyHasMore && !dailyLoadingMore) dailyLoadMore()
      },
      { rootMargin: "600px" }
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [dailyHasMore, dailyLoadingMore, dailyLoadMore])

  const canSave = useMemo(() => {
    if (busy) return false
    if (!title.trim()) return false
    if (!date) return false
    return true
  }, [title, date, busy])

  function applyTemplate(t: any) {
    if (!t) return
    setTitle(String(t.title ?? ""))
    if (t.privacy) setPrivacy(t.privacy)
    if (typeof t.completed === "boolean") setCompleted(t.completed)
    if (typeof t.daily === "boolean") setDaily(t.daily)
  }

  async function onSave() {
    if (!canSave || busy) return

    setBusy(true)
    setFormError(null)

    try {
      const payload: any = {
        title: title.trim(),
        privacy,
        completed,
        daily,
      }

      if (!daily) {
        payload.date = combineDateTime(date, time)
      }

      const res = await apiFetch(`${API_URL}/day/task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      })

      const data = await readJsonSafe<ApiOk<any>>(res)

      if (!res.ok) {
        const msg = data?.message || "Could not create task."
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
                Create task
              </div>
              <div className="text-xs text-(--dk-slate)">
                Plan your day
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
              placeholder="Task title"
              className="w-full rounded-lg border border-transparent bg-(--dk-mist)/45 px-3 py-2 text-sm text-(--dk-ink)"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-(--dk-slate)">Date</div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-2 w-full rounded-lg border border-transparent bg-(--dk-mist)/45 px-3 py-2 text-sm text-(--dk-ink)"
              />
            </div>
            <div>
              <div className="text-xs font-medium text-(--dk-slate)">Time</div>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-2 w-full rounded-lg border border-transparent bg-(--dk-mist)/45 px-3 py-2 text-sm text-(--dk-ink)"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <TaskCompletionToggle
              done={completed}
              clickable
              showLabel
              onToggle={() => setCompleted((v) => !v)}
            />

            <button
              type="button"
              onClick={() => setDaily((v) => !v)}
              className={[
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                daily
                  ? "bg-(--dk-sky)/12 text-(--dk-sky)"
                  : "bg-(--dk-mist)/55 text-(--dk-slate)",
              ].join(" ")}
            >
              <ClipboardList size={18} />
              {daily ? "Daily task" : "Not daily"}
            </button>
          </div>

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
              {busy ? <LoadingSpinner size={16} /> : "Create task"}
            </button>
          </div>

          <section className="border-t border-(--dk-ink)/10 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-(--dk-ink)">
                  Daily task templates
                </div>
                <div className="text-xs text-(--dk-slate)">
                  Use a template to prefill your task.
                </div>
              </div>
            </div>

            {dailyLoading ? (
              <LoadingRows rows={3} className="px-0" />
            ) : dailyTasks.length === 0 ? (
              <div className="py-4 text-sm text-(--dk-slate)">
                No daily task templates yet.
              </div>
            ) : (
              <div className="divide-y divide-(--dk-ink)/10 mt-3">
                {dailyTasks.map((t) => (
                  <div key={t._id} className="py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-(--dk-ink) truncate">
                        {t.title || "Untitled task"}
                      </div>
                      <div className="text-xs text-(--dk-slate)">
                        {t.privacy || "public"}
                        {typeof t.completed === "boolean"
                          ? t.completed
                            ? " • completed"
                            : " • not completed"
                          : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className="rounded-lg bg-(--dk-mist)/65 px-3 py-2 text-xs font-medium text-(--dk-ink) transition hover:bg-(--dk-sky)/14"
                    >
                      Use
                    </button>
                  </div>
                ))}

                {dailyLoadingMore ? (
                  <CenteredSpinner className="py-3" />
                ) : null}
              </div>
            )}

            <div ref={sentinelRef} className="h-1" />
          </section>
        </div>
      </div>
    </main>
  )
}

export default function CreateTaskPage() {
  return (
    <Suspense
      fallback={
        <main className="pb-20 lg:pb-0">
          <div className="mx-auto min-h-screen max-w-3xl bg-(--dk-paper) lg:border-x lg:border-(--dk-ink)/10">
            <PageSkeleton />
          </div>
        </main>
      }
    >
      <CreateTaskForm />
    </Suspense>
  )
}
