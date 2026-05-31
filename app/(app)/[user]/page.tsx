"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams, notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import ProfileHeader from "@/components/User/UserHeader"
import ProfileHeaderSkeleton from "@/components/User/ProfileHeaderSkeleton"
import ProfileDaySkeleton from "@/components/User/ProfileDaySkeleton"
import ProfileActivityCalendar from "@/components/User/ProfileActivityCalendar"
import ProfileDaySection from "@/components/User/ProfileDaySection"
import { useUserProfile } from "@/hooks/useUserProfile"
import { isSameDay, parseDDMMYYYY, startOfDay, toDDMMYYYY } from "@/lib/date"

function normalizeUsername(param: unknown) {
  const raw = Array.isArray(param) ? param[0] : param
  if (typeof raw !== "string") return null
  const clean = raw.replace(/^@/, "").trim()
  return clean.length ? clean : null
}

function UserPageInner() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()

  const username = useMemo(
    () => normalizeUsername((params as any)?.user),
    [params],
  )

  if (!username) return notFound()

  const q = useUserProfile(username)
  const loading = q.isLoading
  const user = q.data
  const error = q.error

  if (!loading && (!user || error)) return notFound()

  const isSelf = user?.follow_info === "same_user"

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search)
      const raw = sp.get("date")
      const parsed = raw ? parseDDMMYYYY(raw) : null
      if (parsed) return startOfDay(parsed)
    }
    return startOfDay(new Date())
  })

  const setDate = useCallback(
    (d: Date) => {
      const next = startOfDay(d)
      setSelectedDate(next)
      const qs = new URLSearchParams(searchParams.toString())
      qs.set("date", toDDMMYYYY(next))
      router.replace(`/${username}?${qs.toString()}`, { scroll: false })
    },
    [router, searchParams, username],
  )

  const changeDate = useCallback(
    (days: number) => {
      const next = new Date(selectedDate)
      next.setDate(next.getDate() + days)
      setDate(next)
    },
    [selectedDate, setDate],
  )

  const handleCalendarDayClick = useCallback(
    (isoDate: string) => {
      const [yyyy, mm, dd] = isoDate.split("-")
      if (!yyyy || !mm || !dd) return
      const parsed = new Date(`${yyyy}-${mm}-${dd}T00:00:00`)
      setDate(parsed)
      // Scroll to day section smoothly
      setTimeout(() => {
        document.getElementById("profile-day-section")?.scrollIntoView({ behavior: "smooth" })
      }, 50)
    },
    [setDate],
  )

  const urlDateParam = searchParams.get("date")
  useEffect(() => {
    if (!urlDateParam) return
    const parsed = parseDDMMYYYY(urlDateParam)
    if (!parsed) return
    setSelectedDate((prev) => (isSameDay(prev, parsed) ? prev : startOfDay(parsed)))
  }, [urlDateParam])

  return (
    <main className="pb-20 lg:pb-0">
      <div className="mx-auto min-h-screen max-w-3xl bg-(--dk-paper) lg:border-x lg:border-(--dk-ink)/10">
        {/* Top bar */}
        <div className="sticky top-0 z-50 border-b border-(--dk-ink)/10 bg-(--dk-paper)/96 backdrop-blur-md">
          <div className="h-0.5 w-full bg-(--dk-sky)/65" />
          <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <button
              onClick={() => router.back()}
              className="rounded-lg p-2 transition hover:bg-(--dk-mist)/75"
              aria-label="Back"
            >
              <ArrowLeft size={18} className="text-(--dk-ink)" />
            </button>
            <div className="leading-tight min-w-0">
              <div className="text-sm font-semibold text-(--dk-ink) truncate">
                @{username}
              </div>
              <div className="text-xs text-(--dk-slate)">Profile</div>
            </div>
          </div>
        </div>

        {loading && (
          <>
            <ProfileHeaderSkeleton />
            <div className="h-px bg-(--dk-ink)/10" />
            <ProfileDaySkeleton />
          </>
        )}

        {!loading && user && (
          <>
            <ProfileHeader user={user} />

            {/* Activity calendar — clicking a day scrolls to that day's page */}
            <ProfileActivityCalendar
              username={user.username}
              onDayClick={handleCalendarDayClick}
            />

            {/* Day page viewer */}
            <div id="profile-day-section">
              <ProfileDaySection
                username={user.username}
                isSelf={isSelf}
                selectedDate={selectedDate}
                onChangeDate={changeDate}
              />
            </div>
          </>
        )}
      </div>
    </main>
  )
}

export default function UserPage() {
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
      <UserPageInner />
    </Suspense>
  )
}
