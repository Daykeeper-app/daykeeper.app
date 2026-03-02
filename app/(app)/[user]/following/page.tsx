"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, UserPlus } from "lucide-react"

import { useUserProfile } from "@/hooks/useUserProfile"
import { useUserFollows } from "@/hooks/useUserFollows"
import FormAlert from "@/components/Form/FormAlert"
import { AVATAR_FALLBACK } from "@/components/Search/searchUtils"
import { resolveProfilePictureUrl } from "@/lib/media"
import RichText from "@/components/common/RichText"

function normalizeUsername(param: unknown) {
  const raw = Array.isArray(param) ? param[0] : param
  if (typeof raw !== "string") return null
  const clean = raw.replace(/^@/, "").trim()
  return clean.length ? clean : null
}

export default function FollowingPage() {
  const params = useParams()
  const router = useRouter()

  const username = useMemo(
    () => normalizeUsername((params as any)?.user),
    [params]
  )

  const profileQ = useUserProfile(username)
  const user = profileQ.data

  const isPrivate = !!user?.private
  const isFollowing = !!user?.isFollowing
  const isSelf = user?.follow_info === "same_user"
  const canView = !isPrivate || isFollowing || isSelf

  const {
    items,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    totalCount,
  } = useUserFollows(username, "following", canView)

  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        if (hasMore && !loadingMore) loadMore()
      },
      { rootMargin: "600px" }
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loadingMore, loadMore])

  return (
    <main className="pb-20 lg:pb-0">
      <div className="max-w-2xl mx-auto border-x border-(--dk-ink)/10 bg-(--dk-paper) min-h-screen">
        <div className="sticky top-0 bg-(--dk-paper)/95 backdrop-blur-md z-20">
          <div className="h-1 w-full bg-(--dk-sky)/70" />
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-(--dk-mist) transition"
              aria-label="Back"
            >
              <ArrowLeft size={18} className="text-(--dk-ink)" />
            </button>

            <div className="leading-tight">
              <div className="text-sm font-semibold text-(--dk-ink)">
                Following
              </div>
              <div className="text-xs text-(--dk-slate)">
                @{username} follows {totalCount} accounts
              </div>
            </div>
          </div>
        </div>

        <div className="pb-8">
          {profileQ.isLoading ? (
            <div className="px-4 py-6 text-sm text-(--dk-slate)">
              Loading profile...
            </div>
          ) : null}

          {!profileQ.isLoading && !canView ? (
            <div className="px-4 py-10 border-t border-(--dk-ink)/10">
              <div className="rounded-xl border border-(--dk-ink)/10 bg-(--dk-mist)/40 px-4 py-4 text-center">
                <div className="text-sm font-semibold text-(--dk-ink)">
                  This account is private
                </div>
                <div className="text-xs text-(--dk-slate) mt-1">
                  Follow this user to see who they follow.
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="px-4 pt-6">
                {error ? <FormAlert>{error}</FormAlert> : null}
              </div>

              <section className="border-t border-(--dk-ink)/10">
                {loading ? (
                  <div className="px-4 py-6 text-sm text-(--dk-slate)">
                    Loading following...
                  </div>
                ) : items.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-(--dk-slate)">
                    Not following anyone yet.
                  </div>
                ) : (
                  <div className="divide-y divide-(--dk-ink)/10">
                    {items.map((user) => {
                      const avatar = resolveProfilePictureUrl(user, AVATAR_FALLBACK)
                      const title = user?.displayName || user?.username || "User"
                      const subtitle =
                        [user?.username ? `@${user.username}` : "", user?.bio]
                          .filter(Boolean)
                          .join(" • ")

                      return (
                        <div key={user._id} className="px-4 py-4">
                          <div className="flex items-center gap-3">
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-(--dk-ink)/10 bg-(--dk-mist)">
                              <Image src={avatar} alt="" fill className="object-cover" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-(--dk-ink)">
                                {title}
                              </div>
                              <div className="mt-0.5 line-clamp-2 text-xs text-(--dk-slate)">
                                <RichText text={subtitle || "No bio yet"} />
                              </div>
                            </div>

                            <UserPlus size={16} className="text-(--dk-slate)" />
                          </div>
                        </div>
                      )
                    })}

                    {loadingMore ? (
                      <div className="px-4 py-4 text-sm text-(--dk-slate)">
                        Loading more...
                      </div>
                    ) : null}
                  </div>
                )}
              </section>

              {!loading && !loadingMore && !hasMore && items.length > 0 ? (
                <div className="text-xs text-(--dk-slate) text-center pt-6">
                  You’re all caught up.
                </div>
              ) : null}

              <div ref={sentinelRef} className="h-1" />
            </>
          )}
        </div>
      </div>
    </main>
  )
}
