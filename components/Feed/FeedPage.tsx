"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import FeedHeader from "@/components/Feed/FeedHeader"
import FeedTimeline from "@/components/Feed/FeedTimeline"
import UploadStatusBar from "@/components/Post/UploadStatusBar"
import { useFeed } from "@/hooks/useFeed"
import { toDDMMYYYY, parseDDMMYYYY, isSameDay, startOfDay } from "@/lib/date"

function FeedPageInner() {
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

  const {
    data,
    loading,
    error,
    reload,
    loadMore,
    hasMore,
    loadingMore,
    usersCount,
  }: any = useFeed(selectedDate)

  const setDate = useCallback(
    (d: Date) => {
      const next = startOfDay(d)

      setSelectedDate(next)

      const qs = new URLSearchParams(searchParams.toString())
      qs.set("date", toDDMMYYYY(next))
      router.replace(`?${qs.toString()}`, { scroll: false })
    },
    [router, searchParams]
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
    router.replace(`?${qs.toString()}`, { scroll: false })
  }, [router, searchParams])

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

  return (
    <main className="pb-20 lg:pb-0">
      <div className="mx-auto min-h-screen max-w-3xl bg-(--dk-paper) lg:border-x lg:border-(--dk-ink)/10">
        <UploadStatusBar />
        <FeedHeader
          selectedDate={selectedDate}
          onChangeDate={changeDate}
          onSelectDate={setDate}
          isToday={isToday}
          loading={loading}
          error={error}
          usersCount={usersCount ?? 0}
          onRetry={reload}
        />

        <FeedTimeline
          data={data}
          selectedDate={selectedDate}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={loadMore}
          error={error}
          onRetry={loadMore}
          onRefreshMedia={reload}
        />
      </div>
    </main>
  )
}

export default function FeedPage() {
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
      <FeedPageInner />
    </Suspense>
  )
}
