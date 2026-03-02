// =====================================
// FILE: components/search/SearchUserResultRow.tsx
// =====================================
"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { AVATAR_FALLBACK } from "@/components/Search/searchUtils"
import { resolveProfilePictureUrl } from "@/lib/media"

export default function SearchUserResultRow({ user }: { user: any }) {
  const router = useRouter()
  const avatar = resolveProfilePictureUrl(user, AVATAR_FALLBACK)
  const title = user?.displayName || user?.username || "User"
  const subtitle = [user?.username ? `@${user.username}` : "", user?.bio || ""]
    .filter(Boolean)
    .join(" • ")

  return (
    <button
      onClick={() => {
        const href = user?.username
          ? `/${encodeURIComponent(user.username)}`
          : user?._id
            ? `/${encodeURIComponent(String(user._id))}`
            : null
        if (href) router.push(href)
      }}
      className={[
        "w-full rounded-lg p-3 text-left transition",
        "hover:bg-(--dk-mist)/35",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-sm border border-(--dk-ink)/10 bg-(--dk-mist)">
          <Image src={avatar} alt="" fill className="object-cover" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-(--dk-ink)">
            {title}
          </div>
          <div className="mt-0.5 line-clamp-2 text-xs text-(--dk-slate)">
            {subtitle}
          </div>
        </div>
      </div>
    </button>
  )
}
