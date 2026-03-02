"use client"

import { useMemo } from "react"
import { useUserDay } from "@/hooks/useUserDay"
import { parseDDMMYYYY, startOfDay, toDDMMYYYY } from "@/lib/date"

export function useProfileDay(username: string, dateParam: string | null) {
  const safeDateParam = useMemo(() => {
    if (!dateParam) return toDDMMYYYY(startOfDay(new Date()))
    const parsed = parseDDMMYYYY(dateParam)
    if (!parsed) return toDDMMYYYY(startOfDay(new Date()))
    return toDDMMYYYY(startOfDay(parsed))
  }, [dateParam])

  const {
    loading,
    error,
    canView,

    user,
    stats,

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
  } = useUserDay(username, safeDateParam) as any

  return {
    loading,
    error,
    canView,
    dateParam: safeDateParam,

    user,
    stats,

    tasks: tasks ?? [],
    notes: notes ?? [],
    events: events ?? [],
    posts: posts ?? [],

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
  }
}
