"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Plus } from "lucide-react"

import PostsHeader from "@/components/User/PostsHeader"
import ProfileDaySkeleton from "@/components/User/ProfileDaySkeleton"

import UserDaySection from "@/components/UserDay/UserDaySection"
import UserDayTasks from "@/components/UserDay/UserDayTasks"
import UserDayNotes from "@/components/UserDay/UserDayNotes"
import UserDayEvents from "@/components/UserDay/UserDayEvents"
import UserDayPosts from "@/components/UserDay/UserDayPosts"

import { useProfileDay } from "@/hooks/useProfileDay"
import { isSameDay, parseDDMMYYYY, startOfDay, toDDMMYYYY } from "@/lib/date"
import { useDelayedRender } from "@/hooks/useDelayedRender"

type Props = {
  username: string
  className?: string
}

export default function ProfileDaySections({ username, className }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlDateParam = searchParams.get("date")

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search)
      const raw = sp.get("date")
      const parsed = raw ? parseDDMMYYYY(raw) : null
      if (parsed) return startOfDay(parsed)
    }
    return startOfDay(new Date())
  })

  const {
    loading,
    error,
    user,
    stats,
    canView,

    tasks,
    notes,
    events,
    posts,

    tasksMeta,
    notesMeta,
    eventsMeta,
    postsMeta,

    loadMoreTasks,
    loadMoreNotes,
    loadMoreEvents,
    loadMorePosts,

    hasMoreTasks,
    hasMoreNotes,
    hasMoreEvents,
    hasMorePosts,

    loadingMoreTasks,
    loadingMoreNotes,
    loadingMoreEvents,
    loadingMorePosts,

    collapseTasks,
    collapseNotes,
    collapseEvents,
    collapsePosts,
    reloadAll,
  } = useProfileDay(username, urlDateParam)

  const setDate = useCallback(
    (d: Date) => {
      const next = startOfDay(d)
      setSelectedDate(next)

      const qs = new URLSearchParams(searchParams.toString())
      qs.set("date", toDDMMYYYY(next))

      router.replace(`${pathname}?${qs.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  useEffect(() => {
    if (!urlDateParam) return
    const parsed = parseDDMMYYYY(urlDateParam)
    if (!parsed) return

    setSelectedDate((prev) =>
      isSameDay(prev, parsed) ? prev : startOfDay(parsed)
    )
  }, [urlDateParam])

  useEffect(() => {
    if (typeof window === "undefined") return

    const sp = new URLSearchParams(window.location.search)
    if (sp.get("date")) return

    const qs = new URLSearchParams(searchParams.toString())
    qs.set("date", toDDMMYYYY(startOfDay(new Date())))
    router.replace(`${pathname}?${qs.toString()}`, { scroll: false })
  }, [router, pathname, searchParams])

  const changeDate = useCallback(
    (days: number) => {
      const next = new Date(selectedDate)
      next.setDate(next.getDate() + days)
      setDate(next)
    },
    [selectedDate, setDate]
  )

  const isToday = useMemo(
    () => isSameDay(selectedDate, new Date()),
    [selectedDate]
  )
  const isSelf = user?.follow_info === "same_user"
  const dateParamForCreate = useMemo(() => {
    const d = selectedDate
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  }, [selectedDate])

  const addButton = useCallback(
    (href: string) => (
      <button
        type="button"
        onClick={() => router.push(href)}
        className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-(--dk-sky)/15 text-(--dk-sky) hover:bg-(--dk-sky)/25 transition"
        aria-label="Create new"
      >
        <Plus size={14} />
      </button>
    ),
    [router]
  )

  // Use real totals from API when available (posts totalCount too)
  const entriesCount =
    (stats?.tasksCount ?? tasks.length) +
    (stats?.notesCount ?? notes.length) +
    (stats?.eventsCount ?? events.length) +
    (postsMeta?.totalCount ?? posts.length)
  const visibleEntriesCount = canView ? entriesCount : 0
  const readyToShowSkeleton = useDelayedRender(200)
  const showSkeleton = loading && readyToShowSkeleton

  return (
    <section className={className}>
        <PostsHeader
          selectedDate={selectedDate}
          onChangeDate={changeDate}
          onSelectDate={setDate}
          isToday={isToday}
          loading={loading}
          error={error}
          usersCount={visibleEntriesCount}
          onRetry={() => setDate(selectedDate)}
        />

      {showSkeleton ? <ProfileDaySkeleton /> : null}

      {!loading && error && (
        <div className="px-4 py-6 text-sm text-red-500 sm:px-5">{error}</div>
      )}

      {!loading && !error && (
        <>
          {!canView ? (
            <div className="border-t border-(--dk-ink)/10 px-4 py-10 sm:px-5">
              <div className="rounded-xl border border-(--dk-ink)/10 bg-(--dk-mist)/40 px-4 py-4 text-center">
                <div className="text-sm font-semibold text-(--dk-ink)">
                  This account is private
                </div>
                <div className="text-xs text-(--dk-slate) mt-1">
                  Follow this user to see their day entries.
                </div>
              </div>
            </div>
          ) : (
            <>
              <UserDaySection
                title="Tasks"
                count={stats?.tasksCount ?? 0}
                action={
                  isSelf
                    ? addButton(`/day/tasks/create?date=${dateParamForCreate}`)
                    : undefined
                }
              >
                <UserDayTasks
                  tasks={tasks}
                  pagination={tasksMeta}
                  hasMore={hasMoreTasks}
                  loadingMore={loadingMoreTasks}
                  onLoadMore={loadMoreTasks}
                  onCollapse={collapseTasks}
                />
              </UserDaySection>

              <UserDaySection
                title="Notes"
                count={stats?.notesCount ?? 0}
                action={
                  isSelf
                    ? addButton(`/day/notes/create?date=${dateParamForCreate}`)
                    : undefined
                }
              >
                <UserDayNotes
                  notes={notes}
                  pagination={notesMeta}
                  hasMore={hasMoreNotes}
                  loadingMore={loadingMoreNotes}
                  onLoadMore={loadMoreNotes}
                  onCollapse={collapseNotes}
                />
              </UserDaySection>

              <UserDaySection
                title="Events"
                count={stats?.eventsCount ?? 0}
                action={
                  isSelf
                    ? addButton(`/day/events/create?date=${dateParamForCreate}`)
                    : undefined
                }
              >
                <UserDayEvents
                  events={events}
                  pagination={eventsMeta}
                  hasMore={hasMoreEvents}
                  loadingMore={loadingMoreEvents}
                  onLoadMore={loadMoreEvents}
                  onCollapse={collapseEvents}
                />
              </UserDaySection>

              {/* UPDATED: posts now use infinite scroll props */}
              <UserDaySection
                title="Posts"
                count={postsMeta?.totalCount ?? posts.length}
              >
                <UserDayPosts
                  posts={posts}
                  pagination={postsMeta}
                  hasMore={hasMorePosts}
                  loadingMore={loadingMorePosts}
                  onLoadMore={loadMorePosts}
                  onCollapse={collapsePosts}
                  onRefreshMedia={reloadAll}
                />
              </UserDaySection>
            </>
          )}
        </>
      )}
    </section>
  )
}
