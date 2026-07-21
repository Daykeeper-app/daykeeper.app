"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"

import { useTaskDetail } from "@/hooks/useTaskDetail"

import FormAlert from "@/components/Form/FormAlert"
import PrivacyPicker, {
  type PrivacyValue,
} from "@/components/common/PrivacyPicker"
import TaskCompletionToggle from "@/components/Task/TaskCompletionToggle"
import { LoadingRows } from "@/components/common/LoadingSkeleton"
import { LoadingSpinner } from "@/components/common/LoadingIndicator"

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
  if (!date) return ""
  const t = time?.trim() ? time.trim() : "00:00"
  const d = new Date(`${date}T${t}:00`)
  return d.toISOString()
}

export default function EditTaskPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const q = useTaskDetail(taskId)
  const loading = q.isLoading
  const error = q.error ? (q.error as any).message : null
  const task: any = q.data ?? null

  const [title, setTitle] = useState("")
  const [privacy, setPrivacy] = useState<Privacy>("public")
  const [completed, setCompleted] = useState(false)

  // optional schedule (if your task uses date/dateLocal)
  const [date, setDate] = useState("") // YYYY-MM-DD
  const [time, setTime] = useState("") // HH:mm

  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Initialize form when task arrives
  useEffect(() => {
    if (!task) return

    setTitle(String(task.title ?? ""))
    setPrivacy((task.privacy as Privacy) || "public")
    setCompleted(!!task.completed)

    // if you have dateLocal, prefer it
    if (task.dateLocal) {
      setDate(localToDateInput(task.dateLocal))
      setTime(localToTimeInput(task.dateLocal))
    } else if (task.date) {
      const x = isoToDateTimeInputs(task.date)
      setDate(x.date)
      setTime(x.time)
    } else {
      setDate("")
      setTime("")
    }
  }, [task])

  const canSave = useMemo(() => {
    if (!task) return false
    if (busy) return false

    const t = title.trim()
    if (!t.length) return false

    const nextISO = date ? combineDateTime(date, time) : ""

    const changed =
      t !== String(task.title ?? "").trim() ||
      privacy !== task.privacy ||
      completed !== !!task.completed ||
      (date ? nextISO !== String(task.date ?? "") : false)

    return changed
  }, [task, title, privacy, completed, date, time, busy])

  async function onSave() {
    if (!task) return
    if (busy) return

    setBusy(true)
    setFormError(null)

    try {
      const payload: any = {
        title: title.trim(),
        privacy,
        completed,
      }

      // only send date if the UI has it (so you don’t accidentally wipe it)
      if (date) payload.date = combineDateTime(date, time)

      const res = await apiFetch(
        `${API_URL}/day/task/${encodeURIComponent(String(taskId))}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          cache: "no-store",
        },
      )

      const data = await readJsonSafe<ApiOk<any>>(res)

      if (!res.ok) {
        const msg = data?.message || "Could not update task."
        throw new Error(JSON.stringify({ message: msg }))
      }

      // Update detail cache
      qc.setQueryData(["taskDetail", taskId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          title: payload.title,
          privacy: payload.privacy,
          completed: payload.completed,
          ...(payload.date ? { date: payload.date } : {}),
        }
      })

      qc.invalidateQueries({ queryKey: ["userDay"] })

      router.push(`/day/tasks/${taskId}`)
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
                Edit task
              </div>
              <div className="text-xs text-(--dk-slate)">Update</div>
            </div>
          </div>
        </div>

        {loading && (
          <LoadingRows rows={4} />
        )}

        {!loading && error && (
          <div className="px-4 py-6 text-sm text-(--dk-error)">{error}</div>
        )}

        {!loading && !error && task && (
          <div className="px-4 py-4 space-y-4">
            {formError ? <FormAlert type="error">{formError}</FormAlert> : null}

            <div className="space-y-2">
              <div className="text-xs font-medium text-(--dk-slate)">Task</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title…"
                className={[
                  "w-full rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper)",
                  "px-3 py-2 text-sm text-(--dk-ink)",
                  "focus:outline-none focus:ring-2 focus:ring-(--dk-sky)/40",
                ].join(" ")}
              />
              <div className="text-xs text-(--dk-slate)">
                {title.trim().length} characters
              </div>
            </div>

            {/* Optional: schedule */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-(--dk-slate)">
                Schedule (optional)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={busy}
                  className="w-full rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) px-3 py-2 text-sm text-(--dk-ink) focus:outline-none focus:ring-2 focus:ring-(--dk-sky)/40"
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={busy || !date}
                  className="w-full rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) px-3 py-2 text-sm text-(--dk-ink) focus:outline-none focus:ring-2 focus:ring-(--dk-sky)/40 disabled:opacity-60"
                />
              </div>

              {date ? (
                <div className="text-xs text-(--dk-slate)">
                  Leaving time blank defaults to 00:00.
                </div>
              ) : (
                <div className="text-xs text-(--dk-slate)">
                  Leave empty if this task has no time.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-(--dk-slate)">
                Status
              </div>

              <TaskCompletionToggle
                done={completed}
                clickable={!busy}
                showLabel
                onToggle={() => setCompleted((v) => !v)}
              />
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
                {busy ? <LoadingSpinner size={16} /> : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
