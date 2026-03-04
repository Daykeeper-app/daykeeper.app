"use client"

import type { SearchType } from "@/hooks/useSearch"
import {
  Users,
  FileText,
  CalendarDays,
  CheckSquare,
} from "lucide-react"

function TypeIcon({ type }: { type: SearchType }) {
  if (type === "User") return <Users size={16} />
  if (type === "Post") return <FileText size={16} />
  if (type === "Event") return <CalendarDays size={16} />
  return <CheckSquare size={16} />
}

export default function SearchTypePills({
  value,
  onChange,
}: {
  value: SearchType
  onChange: (t: SearchType) => void
}) {
  const types: SearchType[] = ["Post", "User", "Event", "Task"]

  return (
    <div className="grid w-full grid-cols-4 gap-2">
      {types.map((t) => {
        const active = t === value
        return (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={[
              "inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm transition",
              active
                ? "bg-(--dk-sky)/18 text-(--dk-ink)"
                : "bg-(--dk-paper)/70 text-(--dk-slate) hover:bg-(--dk-sky)/14 hover:text-(--dk-ink)",
            ].join(" ")}
          >
            <TypeIcon type={t} />
            {t}
          </button>
        )
      })}
    </div>
  )
}
