"use client"

import { CheckCircle2 } from "lucide-react"

type Props = {
  dateLabel?: string
  title?: string
  message?: string
}

export default function FeedTimelineEnd({
  dateLabel,
  title = "You’re all caught up",
  message,
}: Props) {
  return (
    <div className="px-4 py-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-(--dk-mist)">
        <CheckCircle2 size={28} className="text-(--dk-sky)" />
      </div>

      <h3 className="text-base font-semibold text-(--dk-ink) mb-1">
        {title}
      </h3>

      <p className="text-sm text-(--dk-slate)">
        {message ??
          (dateLabel
            ? `That’s everything people shared on ${dateLabel}.`
            : "That’s everything people shared for this day.")}
      </p>
    </div>
  )
}
