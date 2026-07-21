"use client"

import Image from "next/image"
import { Suspense, useMemo } from "react"
import { useParams, usePathname, useRouter, notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import ProfileDay from "@/components/User/ProfileDay"
import ProfileDaySkeleton from "@/components/User/ProfileDaySkeleton"
import { useUserProfile } from "@/hooks/useUserProfile"
import { resolveProfilePictureUrl } from "@/lib/media"

const AVATAR_FALLBACK = "/avatar-placeholder.png"

function normalizeUsername(param: unknown) {
  const raw = Array.isArray(param) ? param[0] : param
  if (typeof raw !== "string") return null
  const clean = raw.replace(/^@/, "").trim()
  return clean.length ? clean : null
}

function UserDayPageInner() {
  const params = useParams<{ user: string | string[] }>()
  const pathname = usePathname()
  const router = useRouter()

  const username = useMemo(
    () => normalizeUsername(params?.user ?? pathname.split("/")[1]),
    [params, pathname],
  )
  const q = useUserProfile(username)

  if (!username) return notFound()
  const loading = q.isPending || q.isLoading
  const user = q.data
  const error = q.error

  if (q.isFetched && (!user || error)) return notFound()

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
            {user ? (
              <button
                type="button"
                onClick={() => router.push(`/${user.username}`)}
                className="flex min-w-0 items-center gap-3 rounded-lg py-1 pr-2 text-left transition hover:opacity-80"
                aria-label={`Open ${user.displayName || user.username}'s profile`}
              >
                <Image
                  src={resolveProfilePictureUrl(user, AVATAR_FALLBACK)}
                  alt=""
                  width={36}
                  height={36}
                  className="h-9 w-9 shrink-0 rounded-lg object-cover"
                />
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-sm font-semibold text-(--dk-ink)">
                    {user.displayName || user.username}
                  </span>
                  <span className="block truncate text-xs text-(--dk-slate)">
                    @{user.username} · Day page
                  </span>
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-3" aria-label="Loading profile">
                <div className="h-9 w-9 animate-pulse rounded-lg bg-(--dk-mist)" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-24 animate-pulse rounded bg-(--dk-mist)" />
                  <div className="h-3 w-20 animate-pulse rounded bg-(--dk-mist)" />
                </div>
              </div>
            )}
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
            <ProfileDaySkeleton />
          </div>
        </main>
      }
    >
      <UserDayPageInner />
    </Suspense>
  )
}
