"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import {
  Flame,
  Trophy,
  Users,
  UserPlus,
  Lock,
  Globe,
  Pencil,
  MoreVertical,
} from "lucide-react"
import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"
import { useRouter } from "next/navigation"
import UserActionsMenu from "@/components/User/UserActionsMenu"
import RichText from "@/components/common/RichText"
import { resolveProfilePictureUrl } from "@/lib/media"

const AVATAR_FALLBACK = "/avatar-placeholder.png"

export default function ProfileHeader({ user }: { user: any }) {
  const router = useRouter()
  const avatar = resolveProfilePictureUrl(user, AVATAR_FALLBACK)

  const currentStreak = user?.currentStreak ?? user?.currentStrike ?? 0
  const maxStreak = user?.maxStreak ?? user?.maxStrike ?? 0

  const isPrivate = !!user?.private
  const isSelf = user?.follow_info == "same_user"

  const username = String(user?.username || user?.handle || "")
  const displayName = String(user?.displayName || username || "User")
  const handle = username

  const bio = String(user?.bio || "").trim()
  const initialInCloseFriends = !!user?.isInCloseFriends
  const initialRequested = user?.follow_info === "requested"

  // --- optimistic follow state ---
  const initialFollowing = !!user?.isFollowing
  const initialFollowers = Number.isFinite(user?.followers) ? user.followers : 0
  const initialFollowingCount = Number.isFinite(user?.following)
    ? user.following
    : 0

  const [isFollowing, setIsFollowing] = useState<boolean>(initialFollowing)
  const [isRequested, setIsRequested] = useState<boolean>(initialRequested)
  const [followers, setFollowers] = useState<number>(initialFollowers)
  const [followingCount] = useState<number>(initialFollowingCount)
  const [busy, setBusy] = useState(false)

  const [pulse, setPulse] = useState(false)
  const canViewFollows = !isPrivate || isFollowing || isSelf

  useEffect(() => {
    setIsFollowing(!!user?.isFollowing)
    setFollowers(Number.isFinite(user?.followers) ? user.followers : 0)
    setIsRequested(user?.follow_info === "requested")
  }, [user?._id])

  const followEndpoint = useMemo(() => {
    return `${API_URL}/${encodeURIComponent(handle)}/follow`
  }, [handle])

  async function toggleFollow() {
    if (busy || isSelf) return

    if (isPrivate && !isFollowing) {
      if (isRequested) return

      setPulse(true)
      window.setTimeout(() => setPulse(false), 180)

      setBusy(true)
      try {
        const res = await apiFetch(followEndpoint, { method: "POST" })
        if (!res.ok) {
          const text = await res.text().catch(() => "")
          throw new Error(text || `Request failed (${res.status})`)
        }
        setIsRequested(true)
      } catch {
        setIsRequested(false)
      } finally {
        setBusy(false)
      }
      return
    }

    const prevFollowing = isFollowing
    const prevFollowers = followers

    const next = !prevFollowing
    setIsFollowing(next)
    setFollowers((c) => {
      const base = Number.isFinite(c) ? c : 0
      return next ? base + 1 : Math.max(0, base - 1)
    })

    setPulse(true)
    window.setTimeout(() => setPulse(false), 180)

    setBusy(true)
    try {
      const res = await apiFetch(followEndpoint, { method: "POST" })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Request failed (${res.status})`)
      }
    } catch {
      setIsFollowing(prevFollowing)
      setFollowers(prevFollowers)
    } finally {
      setBusy(false)
    }
  }

  return (
    <header className="px-4 pt-5 pb-4 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-(--dk-mist)/40">
            <Image
              src={avatar}
              alt={username || displayName}
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <h1 className="text-xl font-semibold text-(--dk-ink) truncate">
                {displayName}
              </h1>
              <PrivacyBadge isPrivate={isPrivate} />
            </div>

            <div className="mt-0.5 text-sm text-(--dk-slate) truncate">
              @{handle}
            </div>
          </div>
        </div>

        {/* right actions: follow + 3 dots */}
        <div className="sm:ml-auto flex items-center gap-2">
          <ActionButton
            isSelf={isSelf}
            isFollowing={isFollowing}
            isRequested={isRequested}
            isPrivate={isPrivate}
            busy={busy}
            pulse={pulse}
            onClick={toggleFollow}
          />

          <UserActionsMenu
            userKey={String(user?._id || handle)}
            name={handle}
            disabled={busy || isSelf || !handle}
            isSelf={isSelf}
            initialInCloseFriends={initialInCloseFriends}
          />
        </div>
      </div>

      <div className="mt-3">
        {bio ? (
          <p className="text-sm text-(--dk-ink)/85 leading-relaxed whitespace-pre-wrap">
            <RichText text={bio} />
          </p>
        ) : (
          <p className="text-sm text-(--dk-slate)">No bio yet.</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-(--dk-slate)">
        <Stat
          icon={Users}
          value={followers}
          label="followers"
          onClick={
            canViewFollows && handle
              ? () => router.push(`/${encodeURIComponent(handle)}/followers`)
              : undefined
          }
        />
        <Stat
          icon={UserPlus}
          value={followingCount}
          label="following"
          onClick={
            canViewFollows && handle
              ? () => router.push(`/${encodeURIComponent(handle)}/following`)
              : undefined
          }
        />

        <span className="hidden sm:inline-block h-3 w-px bg-(--dk-ink)/10" />

        <Stat icon={Flame} value={currentStreak} label="day streak" accent />
        <Stat icon={Trophy} value={maxStreak} label="best streak" accent />
      </div>
    </header>
  )
}

function PrivacyBadge({ isPrivate }: { isPrivate: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-(--dk-mist)/35 text-(--dk-slate) whitespace-nowrap">
      {isPrivate ? <Lock size={14} /> : <Globe size={14} />}
      {isPrivate ? "Private" : "Public"}
    </span>
  )
}

function ActionButton({
  isSelf,
  isFollowing,
  isRequested,
  isPrivate,
  busy,
  pulse,
  onClick,
}: {
  isSelf: boolean
  isFollowing: boolean
  isRequested: boolean
  isPrivate: boolean
  busy: boolean
  pulse: boolean
  onClick: () => void
}) {
  const router = useRouter()
  const base =
    "w-full sm:w-auto h-10 px-4 rounded-xl text-sm font-medium transition inline-flex items-center justify-center select-none"

  if (isSelf) {
    return (
      <button
        type="button"
        className={`${base} gap-2 bg-(--dk-mist)/35 text-(--dk-ink) hover:bg-(--dk-mist)/55 cursor-pointer`}
        onClick={() => router.push("profile")}
      >
        <Pencil size={16} className="text-(--dk-slate)" />
        Edit profile
      </button>
    )
  }

  const pop = pulse ? "scale-[1.03]" : "scale-100"

  if (isFollowing) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={`${base} ${pop} bg-(--dk-mist)/35 text-(--dk-ink) hover:bg-(--dk-mist)/55 disabled:opacity-60 cursor-pointer`}
      >
        Following
      </button>
    )
  }

  if (isRequested) {
    return (
      <button
        type="button"
        disabled
        className={`${base} ${pop} bg-(--dk-mist)/35 text-(--dk-slate)`}
      >
        Requested
      </button>
    )
  }

  if (isPrivate) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={`${base} ${pop} font-semibold bg-(--dk-sky) text-white hover:opacity-90 disabled:opacity-70 cursor-pointer`}
      >
        Request
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`${base} ${pop} font-semibold bg-(--dk-sky) text-white hover:opacity-90 disabled:opacity-70 cursor-pointer`}
    >
      Follow
    </button>
  )
}

function Stat({
  icon: Icon,
  value,
  label,
  accent = false,
  onClick,
}: {
  icon: React.ComponentType<any>
  value: number
  label: string
  accent?: boolean
  onClick?: () => void
}) {
  const content = (
    <>
      <Icon
        size={16}
        className={accent ? "text-(--dk-sky)" : "text-(--dk-slate)"}
      />
      <span className="font-semibold text-(--dk-ink)">{value}</span>
      <span>{label}</span>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 whitespace-nowrap hover:text-(--dk-ink) transition cursor-pointer"
      >
        {content}
      </button>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {content}
    </span>
  )
}
