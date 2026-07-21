"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import PostsHeader from "@/components/User/PostsHeader"
import DayPageEditor from "@/components/DayPage/DayPageEditor"
import ProfileDaySkeleton from "@/components/User/ProfileDaySkeleton"
import { useOwnDayPage } from "@/hooks/useDayPage"
import { isSameDay, parseDDMMYYYY, startOfDay, toDDMMYYYY } from "@/lib/date"

function DayPageInner() {
  const router = useRouter()
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

  const dateParam = useMemo(() => toDDMMYYYY(selectedDate), [selectedDate])
  const { data: page, isLoading } = useOwnDayPage(dateParam)

  const isToday = useMemo(() => isSameDay(selectedDate, new Date()), [selectedDate])

  const setDate = useCallback(
    (d: Date) => {
      const next = startOfDay(d)
      setSelectedDate(next)
      const qs = new URLSearchParams(searchParams.toString())
      qs.set("date", toDDMMYYYY(next))
      router.replace(`/day?${qs.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  const changeDate = useCallback(
    (days: number) => {
      const next = new Date(selectedDate)
      next.setDate(next.getDate() + days)
      setDate(next)
    },
    [selectedDate, setDate],
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
    router.replace(`/day?${qs.toString()}`, { scroll: false })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="pb-20 lg:pb-0">
      <div className="mx-auto min-h-screen max-w-3xl bg-(--dk-paper) lg:border-x lg:border-(--dk-ink)/10">
        <PostsHeader
          selectedDate={selectedDate}
          onChangeDate={changeDate}
          onSelectDate={setDate}
          isToday={isToday}
          loading={isLoading}
          error={null}
          usersCount={page?.blocks?.length ?? 0}
          onRetry={() => setDate(selectedDate)}
        />

        {isLoading ? (
          <ProfileDaySkeleton />
        ) : (
          <DayPageEditor key={dateParam} dateParam={dateParam} initialPage={page} />
        )}
      </div>
    </main>
  )
}

export default function DayPage() {
  return (
    <Suspense
      fallback={
        <main className="pb-20 lg:pb-0">
          <div className="mx-auto min-h-screen max-w-3xl bg-(--dk-paper) lg:border-x lg:border-(--dk-ink)/10">
            <ProfileDaySkeleton />
          </div>
        </main>
      }
    >
      <DayPageInner />
    </Suspense>
  )
}
