"use client"

import { useParams, useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import {
  ClipboardList,
  Clock,
  Pencil,
  Trash2,
  Flag,
  Ban,
} from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import { useTaskDetail } from "@/hooks/useTaskDetail"
import { useMe } from "@/lib/useMe"
import { isSameUsername } from "@/lib/ownership"

import UserDayListRow from "@/components/UserDay/UserDayListRow"
import ContentHeader from "@/components/common/ContentHeader"
import PrivacyChip from "@/components/common/PrivacyChip"
import DeleteEntityModal from "@/components/common/DeleteEntityModal"
import FormAlert from "@/components/Form/FormAlert"
import formatDDMMYYYY from "@/utils/formatDate"
import RichText from "@/components/common/RichText"

import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"
import TaskCompletionToggle from "@/components/Task/TaskCompletionToggle"
import { LoadingRows } from "@/components/common/LoadingSkeleton"

type ApiOk<T> = { message?: string; data?: T }

function formatTime(iso?: string) {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

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

export default function TaskPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const q = useTaskDetail(taskId)
  const me = useMe()

  const loading = q.isLoading
  const error = q.error ? (q.error as any).message : null
  const task: any = q.data ?? null

  const user = task?.user_info ?? null
  const done = !!task?.completed

  const stamp = useMemo(
    () => formatTime(task?.dateLocal || task?.date),
    [task?.dateLocal, task?.date],
  )

  const edited = useMemo(
    () => formatDDMMYYYY(task?.edited_at || ""),
    [task?.edited_at],
  )

  const isOwner = isSameUsername(me?.username, task?.user_info?.username)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toggleBusy, setToggleBusy] = useState(false)
  const [toggleErr, setToggleErr] = useState<string | null>(null)

  async function toggleCompleted() {
    if (!task) return
    if (!isOwner) return
    if (toggleBusy) return

    const next = !done

    setToggleBusy(true)
    setToggleErr(null)

    // optimistic update
    qc.setQueryData(["taskDetail", taskId], (old: any) => {
      if (!old) return old
      return { ...old, completed: next }
    })

    // also update any cached userDay pages if you want instant UI there too
    qc.setQueriesData({ queryKey: ["userDay"] }, (old: any) => {
      if (!old) return old
      // best effort, don't assume exact shape
      try {
        const nextOld = structuredClone(old)
        const data = nextOld?.data ?? nextOld
        if (data?.tasks?.data && Array.isArray(data.tasks.data)) {
          data.tasks.data = data.tasks.data.map((t: any) =>
            String(t._id) === String(taskId) ? { ...t, completed: next } : t,
          )
        }
        if (Array.isArray(data?.tasks)) {
          data.tasks = data.tasks.map((t: any) =>
            String(t._id) === String(taskId) ? { ...t, completed: next } : t,
          )
        }
        return nextOld
      } catch {
        return old
      }
    })

    try {
      const res = await apiFetch(
        `${API_URL}/day/task/${encodeURIComponent(String(taskId))}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: next }),
          cache: "no-store",
        },
      )

      const data = await readJsonSafe<ApiOk<any>>(res)

      if (!res.ok) {
        const msg = data?.message || "Could not update task."
        throw new Error(JSON.stringify({ message: msg }))
      }

      // keep cache consistent (server wins if it returns something)
      qc.setQueryData(["taskDetail", taskId], (old: any) => {
        if (!old) return old
        return { ...old, completed: next }
      })

      qc.invalidateQueries({ queryKey: ["userDay"] })
    } catch (err: any) {
      // rollback
      qc.setQueryData(["taskDetail", taskId], (old: any) => {
        if (!old) return old
        return { ...old, completed: done }
      })
      setToggleErr(safeApiMessage(err))
    } finally {
      setToggleBusy(false)
    }
  }

  return (
    <main className="pb-20 lg:pb-0">
      <div className="max-w-2xl mx-auto border-x border-(--dk-ink)/10 bg-(--dk-paper) min-h-screen">
        <div className="sticky top-0 bg-(--dk-paper)/95 backdrop-blur-md">
          <div className="h-1 w-full bg-(--dk-sky)/70" />
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-(--dk-mist) transition"
              aria-label="Back"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="text-(--dk-ink)"
              >
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="leading-tight">
              <div className="text-sm font-semibold text-(--dk-ink)">Task</div>
              <div className="text-xs text-(--dk-slate)">Details</div>
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
          <div className="px-4 py-4 space-y-3">
            {toggleErr ? <FormAlert type="error">{toggleErr}</FormAlert> : null}

            <ContentHeader
              user={user}
              stamp={stamp}
              editedDate={edited}
              privacy={task.privacy}
              menuItems={
                isOwner
                  ? [
                      {
                        key: "edit",
                        label: "Edit task",
                        icon: <Pencil size={16} />,
                        onClick: () =>
                          router.push(`/day/tasks/${task._id}/edit`),
                      },
                      {
                        key: "delete",
                        label: "Delete task",
                        icon: <Trash2 size={16} />,
                        variant: "danger",
                        onClick: () => setDeleteOpen(true),
                      },
                    ]
                  : [
                      {
                        key: "report",
                        label: "Report task",
                        icon: <Flag size={16} />,
                        onClick: () =>
                          router.push(
                            `/report?user=${encodeURIComponent(
                              String(user?._id || ""),
                            )}&task=${encodeURIComponent(String(task._id))}`,
                          ),
                      },
                      {
                        key: "block",
                        label: "Block user",
                        icon: <Ban size={16} />,
                        variant: "danger",
                        onClick: () =>
                          router.push(
                            `/block?user=${encodeURIComponent(
                              String(user?._id || ""),
                            )}`,
                          ),
                      },
                    ]
              }
              metaExtra={
                <span className="inline-flex items-center gap-2">
                  <span className="text-xs text-(--dk-slate)">
                    {isOwner
                      ? "Tap to toggle"
                      : done
                        ? "Completed"
                        : "Not completed"}
                  </span>
                </span>
              }
            />

            <UserDayListRow
              showLane
              leftIcon={<ClipboardList size={22} />}
              metaTop={
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={12} />
                    {stamp}
                  </span>
                  <PrivacyChip privacy={task.privacy} />
                </span>
              }
              title={
                <span
                  className={[
                    done ? "opacity-80 line-through" : "",
                    "transition whitespace-pre-wrap text-sm leading-6",
                  ].join(" ")}
                >
                  <RichText text={String(task.title || "")} />
                </span>
              }
              right={
                    <TaskCompletionToggle
                      done={done}
                      clickable={isOwner}
                      busy={toggleBusy}
                  onToggle={toggleCompleted}
                />
              }
            />

            <DeleteEntityModal
              open={deleteOpen}
              onClose={() => setDeleteOpen(false)}
              onDeleted={() => {
                qc.removeQueries({ queryKey: ["taskDetail", taskId] })
                qc.invalidateQueries({ queryKey: ["userDay"] })
                router.back()
              }}
              entityLabel="task"
              entityId={String(task._id)}
              buildPath={({ id }) => `/day/task/${encodeURIComponent(id)}`}
              confirmTitle="Delete task"
              confirmButtonText="Delete task"
              successTitle="Task deleted"
            />
          </div>
        )}
      </div>
    </main>
  )
}
