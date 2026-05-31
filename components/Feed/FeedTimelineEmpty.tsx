"use client"

import Link from "next/link"
import { BookOpen, UserPlus } from "lucide-react"

export default function FeedTimelineEmpty() {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-(--dk-mist)">
        <BookOpen size={26} className="text-(--dk-sky)" />
      </div>
      <h3 className="mb-2 text-base font-semibold text-(--dk-ink)">
        No pages from the people you follow
      </h3>
      <p className="mb-6 text-sm text-(--dk-slate) leading-relaxed max-w-xs mx-auto">
        The feed shows your friends' daily pages — notes, tasks, and moments from their day. Follow more people or come back later.
      </p>
      <div className="flex flex-col items-center gap-2">
        <Link
          href="/search"
          className="inline-flex items-center gap-2 rounded-xl bg-(--dk-sky) px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-(--dk-sky)/90"
        >
          <UserPlus size={15} />
          Find people to follow
        </Link>
        <Link
          href="/day"
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-(--dk-slate) transition hover:text-(--dk-ink)"
        >
          Write your own page →
        </Link>
      </div>
    </div>
  )
}
