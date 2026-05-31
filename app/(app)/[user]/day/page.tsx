"use client"

import { Suspense, useMemo } from "react"
import { useParams, useRouter, notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import ProfileDay from "@/components/User/ProfileDay"
import ProfileDaySkeleton from "@/components/User/ProfileDaySkeleton"
import { useUserProfile } from "@/hooks/useUserProfile"

function normalizeUsername(param: unknown) {
  const raw = Array.isArray(param) ? param[0] : param
  if (typeof raw !== "string") return null
  const clean = raw.replace(/^@/, "").trim()
  return clean.length ? clean : null
}

function UserDayPageInner() {
  const params = useParams()
  const router = useRouter()

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
              <div className="text-xs text-(--dk-slate)">Day Page</div>
            </div>
          </div>
        </div>

        {loading && <ProfileDaySkeleton />}

        {!loading && user && (
          <ProfileDay username={user.username} />
        )}
      </div>
    </main>
  )
}

export default function UserDayPage() {
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
      <UserDayPageInner />
    </Suspense>
  )
}
