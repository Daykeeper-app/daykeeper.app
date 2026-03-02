"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Clock, MoreHorizontal, Pencil } from "lucide-react"
import PrivacyChip from "@/components/common/PrivacyChip"
import { resolveProfilePictureUrl } from "@/lib/media"

const AVATAR_FALLBACK = "/avatar-placeholder.png"

export type ContentPrivacy = "public" | "close friends" | "private"

export type HeaderUser = {
  _id?: string
  username?: string
  displayName?: string
  profile_picture?: { url?: string }
}

export type HeaderMenuItem = {
  key: string
  label: string
  icon?: React.ReactNode
  variant?: "default" | "danger"
  onClick: () => void
}

export default function ContentHeader({
  user,
  stamp,
  editedDate,
  privacy,
  onUserClick,
  menuItems = [],
  metaExtra,
}: {
  user?: HeaderUser | any
  stamp?: string
  editedDate?: String
  privacy?: any
  onUserClick?: () => void
  menuItems?: HeaderMenuItem[]
  metaExtra?: React.ReactNode
}) {
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const avatarSrc = resolveProfilePictureUrl(user, AVATAR_FALLBACK)
  const displayName =
    user?.displayName ||
    user?.display_name ||
    user?.name ||
    user?.fullName ||
    user?.username ||
    "unknown"
  const handle = useMemo(() => {
    const uname = user?.username || ""
    return uname ? `@${uname}` : ""
  }, [user?.username])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  const hasMenu = Array.isArray(menuItems) && menuItems.length > 0

  return (
    <div className="flex items-start justify-between gap-3">
      <button
        type="button"
        className="flex items-start gap-3 text-left min-w-0"
        onClick={() => {
          if (onUserClick) return onUserClick()
          if (user?.username) router.push(`/${user.username}`)
        }}
      >
        <Image
          src={avatarSrc}
          alt={user?.username || "User"}
          width={44}
          height={44}
          className="h-11 w-11 rounded-sm object-cover"
        />

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-(--dk-ink) truncate">
              {displayName}
            </p>
            {handle ? (
              <p className="text-sm text-(--dk-slate) truncate">{handle}</p>
            ) : null}
          </div>

          <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-(--dk-slate)">
            {stamp ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock size={12} />
                {stamp}
              </span>
            ) : null}
            {editedDate ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-(--dk-slate)">
                <Pencil size={14} className="text-(--dk-slate)" />
                <span>{editedDate}</span>
              </span>
            ) : null}

            {privacy ? <PrivacyChip privacy={privacy as any} /> : null}

            {metaExtra ? metaExtra : null}
          </div>
        </div>
      </button>

      {hasMenu ? (
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
            className="p-2 rounded-lg hover:bg-(--dk-ink)/5 transition text-(--dk-slate)"
            aria-label="Options"
          >
            <MoreHorizontal size={18} />
          </button>

          {menuOpen ? (
            <div
              className="absolute right-0 mt-2 w-44 rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) shadow-lg overflow-hidden z-20"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
            >
              {menuItems.map((it) => {
                const danger = it.variant === "danger"
                return (
                  <button
                    key={it.key}
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      it.onClick()
                    }}
                    className={[
                      "w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition",
                      danger
                        ? "text-(--dk-error) hover:bg-(--dk-error)/10"
                        : "text-(--dk-ink) hover:bg-(--dk-ink)/5",
                    ].join(" ")}
                  >
                    {it.icon ? it.icon : null}
                    {it.label}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
