"use client"

import type { SearchType } from "@/hooks/useSearch"
import { Users, BookOpen } from "lucide-react"

function TypeIcon({ type }: { type: SearchType }) {
  if (type === "User") return <Users size={16} />
  return <BookOpen size={16} />
}

function typeLabel(type: SearchType) {
  if (type === "User") return "People"
  return "Day Pages"
}

export default function SearchTypePills({
  value,
  onChange,
}: {
  value: SearchType
  onChange: (t: SearchType) => void
}) {
  const types: SearchType[] = ["DayPage", "User"]

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {types.map((t) => {
        const active = t === value
        return (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={[
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition whitespace-nowrap",
              active
                ? "bg-(--dk-sky)/15 text-(--dk-sky)"
                : "text-(--dk-slate) hover:bg-(--dk-mist)/70 hover:text-(--dk-ink)",
            ].join(" ")}
          >
            <TypeIcon type={t} />
            {typeLabel(t)}
          </button>
        )
      })}
    </div>
  )
}
