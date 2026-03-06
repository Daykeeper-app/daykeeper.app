"use client"

import { useMemo, useState } from "react"
import {
  CheckSquare2,
  Square,
  Clock,
  ClipboardList,
  Loader2,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import UserDayListRow from "./UserDayListRow"
import PrivacyChip from "@/components/common/PrivacyChip"
import ActionPill from "../common/ActionPill"
import { useRouter } from "next/navigation"
import type { PaginationMeta } from "@/hooks/useUserDay"
import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"
import { useQueryClient } from "@tanstack/react-query"
import { useMe } from "@/lib/useMe"
import RichText from "@/components/common/RichText"
import { stableFeedId } from "@/lib/feedTypes"

type ApiOk<T> = { message?: string; data?: T }

function formatTime(s?: string) {
  if (!s) return ""
  const d = new Date(s)
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

function TaskStatusPill({
  done,
  clickable,
  busy,
  onToggle,
}: {
  done: boolean
  clickable?: boolean
  busy?: boolean
  onToggle?: () => void
}) {
  const Icon = done ? CheckSquare2 : Square

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!clickable || busy) return
        onToggle?.()
      }}
      disabled={!clickable || busy}
      className={[
        "inline-flex items-center justify-center",
        "h-8 w-8 rounded-lg",
        "transition",
        clickable ? "cursor-pointer" : "cursor-default",
        done
          ? "bg-(--dk-sky)/12 text-(--dk-sky)"
          : "bg-(--dk-mist)/55 text-(--dk-slate)",
        clickable && !done
          ? "hover:bg-(--dk-mist)/75"
          : clickable && done
            ? "hover:bg-(--dk-sky)/18"
            : "",
        busy ? "opacity-70" : "",
      ].join(" ")}
      aria-label={done ? "Task completed" : "Task not completed"}
      title={
        clickable
          ? done
            ? "Mark as not completed"
            : "Mark as completed"
          : done
            ? "Completed"
            : "Not completed"
      }
    >
      {busy ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <Icon size={18} />
      )}
    </button>
  )
}

export default function UserDayTasks({
  tasks,
  pagination,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onCollapse,
}: {
  tasks?: any[]
  pagination?: PaginationMeta
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  onCollapse?: () => void
}) {
  const PREVIEW_COUNT = 5

  const router = useRouter()
  const qc = useQueryClient()
  const me = useMe()

  const list = useMemo(() => (Array.isArray(tasks) ? tasks : []), [tasks])

  const [collapsed, setCollapsed] = useState(true)

  const [busyMap, setBusyMap] = useState<Record<string, boolean>>({})
  const [errMap, setErrMap] = useState<Record<string, string | null>>({})

  if (!list.length) {
    return <div className="text-sm text-(--dk-slate)">No tasks.</div>
  }

  const visible = collapsed ? list.slice(0, PREVIEW_COUNT) : list

  const canCollapse = list.length > PREVIEW_COUNT && !collapsed
  const canExpand = list.length > PREVIEW_COUNT && collapsed

  // same mutual exclusion system as notes
  const showLoadMore = !!hasMore && !!onLoadMore
  const showShowAll = !showLoadMore && canExpand

  async function toggleTaskCompleted(task: any) {
    const id = String(task?._id || "")
    if (!id) return

    const isOwner =
      !!me?._id && !!task?.user && String(me._id) === String(task.user)

    if (!isOwner) return
    if (busyMap[id]) return

    const prev = !!task.completed
    const next = !prev

    setBusyMap((m) => ({ ...m, [id]: true }))
    setErrMap((m) => ({ ...m, [id]: null }))

    qc.setQueriesData(
      {
        predicate: (q) =>
          Array.isArray(q.queryKey) && q.queryKey[0] === "userDay",
      },
      (old: any) => {
      if (!old) return old
      try {
        const nextOld = structuredClone(old)
        const data = nextOld?.data ?? nextOld

        if (data?.tasks?.data && Array.isArray(data.tasks.data)) {
          data.tasks.data = data.tasks.data.map((t: any) =>
            String(t._id) === id ? { ...t, completed: next } : t,
          )
        } else if (Array.isArray(data?.tasks)) {
          data.tasks = data.tasks.map((t: any) =>
            String(t._id) === id ? { ...t, completed: next } : t,
          )
        }

        return nextOld
      } catch {
        return old
      }
    })

    qc.setQueryData(["taskDetail", id], (old: any) => {
      if (!old) return old
      return { ...old, completed: next }
    })

    try {
      const res = await apiFetch(
        `${API_URL}/day/task/${encodeURIComponent(id)}`,
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

      qc.invalidateQueries({ queryKey: ["userDay"] })
    } catch (err: any) {
      qc.setQueriesData(
        {
          predicate: (q) =>
            Array.isArray(q.queryKey) && q.queryKey[0] === "userDay",
        },
        (old: any) => {
        if (!old) return old
        try {
          const nextOld = structuredClone(old)
          const data = nextOld?.data ?? nextOld

          if (data?.tasks?.data && Array.isArray(data.tasks.data)) {
            data.tasks.data = data.tasks.data.map((t: any) =>
              String(t._id) === id ? { ...t, completed: prev } : t,
            )
          } else if (Array.isArray(data?.tasks)) {
            data.tasks = data.tasks.map((t: any) =>
              String(t._id) === id ? { ...t, completed: prev } : t,
            )
          }

          return nextOld
        } catch {
          return old
        }
      })

      qc.setQueryData(["taskDetail", id], (old: any) => {
        if (!old) return old
        return { ...old, completed: prev }
      })

      setErrMap((m) => ({ ...m, [id]: safeApiMessage(err) }))
    } finally {
      setBusyMap((m) => ({ ...m, [id]: false }))
    }
  }

  return (
    <div className="space-y-2">
      {canCollapse ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setCollapsed(true)
              onCollapse?.()
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-(--dk-slate) hover:text-(--dk-ink)"
          >
            <ChevronUp size={14} />
            Collapse
          </button>
        </div>
      ) : null}

      <div className="space-y-0.5">
        {visible.map((t: any, idx: number) => {
          const id = stableFeedId(t?._id) || stableFeedId(t?.id) || ""
          const done = !!t.completed

          const isOwner =
            !!me?._id && !!t?.user && String(me._id) === String(t.user)

          const rowErr = id ? errMap[id] : null
          const rowBusy = id ? !!busyMap[id] : false

          return (
            <div key={id || `task-${idx}`} className="space-y-1">
              {rowErr ? (
                <div className="text-xs text-red-600 px-1">{rowErr}</div>
              ) : null}

              <UserDayListRow
                showLane
                leftIcon={<ClipboardList size={22} />}
                onClick={() => {
                  if (!id) return
                  router.push(`/day/tasks/${encodeURIComponent(id)}`)
                }}
                metaTop={
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={12} />
                      {formatTime(t.dateLocal || t.date)}
                    </span>
                    <PrivacyChip privacy={t.privacy} />
                  </span>
                }
                title={
                  <span
                    className={[
                      done ? "opacity-80 line-through" : "",
                      "transition",
                    ].join(" ")}
                  >
                    <RichText text={String(t.title || "")} />
                  </span>
                }
                right={
                  <TaskStatusPill
                    done={done}
                    clickable={isOwner}
                    busy={rowBusy}
                    onToggle={() => toggleTaskCompleted(t)}
                  />
                }
              />
            </div>
          )
        })}
      </div>

      {showShowAll ? (
        <ActionPill onClick={() => setCollapsed(false)}>
          <ChevronDown size={16} />
          Show all
        </ActionPill>
      ) : null}

      {showLoadMore ? (
        <ActionPill
          onClick={() => {
            if (loadingMore) return
            setCollapsed(false)
            onLoadMore()
          }}
          disabled={loadingMore}
        >
          {loadingMore ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Loading…
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              Show more
            </>
          )}
        </ActionPill>
      ) : null}
    </div>
  )
}
