"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import PostsHeader from "@/components/User/PostsHeader"
import ProfileDaySkeleton from "@/components/User/ProfileDaySkeleton"
import DayPageTimelineEditor from "@/components/DayPage/DayPageTimelineEditor"
import DayPageEntriesView from "@/components/DayPage/DayPageEntriesView"
import DayPageLikeBar from "@/components/DayPage/DayPageLikeBar"

import { useUserProfile } from "@/hooks/useUserProfile"
import { useOwnDayPage, useUserDayPage } from "@/hooks/useDayPage"
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
  const [editorDirty, setEditorDirty] = useState(false)

  const dateParam = useMemo(() => toDDMMYYYY(selectedDate), [selectedDate])

  const { data: user, isLoading: userLoading, error: userError } = useUserProfile(username)

  const isSelf = user?.follow_info === "same_user"
  const canView = !!user && (!user.private || !!user.isFollowing || isSelf)

  // Only enable the relevant hook after user profile resolves
  const ownPageQ = useOwnDayPage(user != null && isSelf ? dateParam : "")
  const userPageQ = useUserDayPage(
    user != null && !isSelf ? username : null,
    dateParam,
  )

  const pageLoading = user != null
    ? (isSelf ? ownPageQ.isLoading : userPageQ.isLoading)
    : false
  const loading = userLoading || pageLoading
  const error = userError ? "Failed to load profile." : null

  const setDate = useCallback(
    (d: Date) => {
      if (
        editorDirty &&
        !window.confirm("Discard your unpublished entry and open another day?")
      ) {
        return
      }
      const next = startOfDay(d)
      setEditorDirty(false)
      setSelectedDate(next)
      const qs = new URLSearchParams(searchParams.toString())
      qs.set("date", toDDMMYYYY(next))
      router.replace(`${pathname}?${qs.toString()}`, { scroll: false })
    },
    [editorDirty, router, pathname, searchParams],
  )

  useEffect(() => {
    if (!urlDateParam) return
    const parsed = parseDDMMYYYY(urlDateParam)
    if (!parsed) return
    setSelectedDate((prev) =>
      isSameDay(prev, parsed) ? prev : startOfDay(parsed),
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
    [selectedDate, setDate],
  )

  const isToday = useMemo(
    () => isSameDay(selectedDate, new Date()),
    [selectedDate],
  )

  const readyToShowSkeleton = useDelayedRender(200)
  const showSkeleton = loading && readyToShowSkeleton

  const page = isSelf ? ownPageQ.data : userPageQ.data

  return (
    <section className={className}>
      <PostsHeader
        selectedDate={selectedDate}
        onChangeDate={changeDate}
        onSelectDate={setDate}
        isToday={isToday}
        loading={loading}
        error={error}
        usersCount={page?.entries?.length ?? 0}
        onRetry={() => setDate(selectedDate)}
      />

      {showSkeleton ? <ProfileDaySkeleton /> : null}

      {!loading && error && (
        <div className="px-4 py-6 text-sm text-(--dk-error) sm:px-5">{error}</div>
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
          ) : isSelf ? (
            <DayPageTimelineEditor
              key={dateParam}
              dateParam={dateParam}
              initialPage={ownPageQ.data}
              onDirtyChange={setEditorDirty}
            />
          ) : (
            <div>
              {page ? (
                <>
                  <DayPageEntriesView entries={page.entries ?? []} />
                  <DayPageLikeBar
                    pageId={page._id}
                    likesCount={page.likesCount ?? 0}
                    commentsCount={page.commentsCount ?? 0}
                    userLiked={!!page.userLiked}
                  />
                </>
              ) : (
                <div className="px-4 py-8 text-center text-sm italic text-(--dk-slate)">
                  No day page for this date.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
