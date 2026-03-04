"use client"

import { Loader2, Search } from "lucide-react"

export default function SearchBar({
  value,
  onChange,
  loading,
}: {
  value: string
  onChange: (v: string) => void
  loading?: boolean
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper)/90 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] focus-within:border-(--dk-sky)/40">
      <Search size={16} className="text-(--dk-slate)" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search posts, people, events, tasks..."
        className="w-full bg-transparent text-sm text-(--dk-ink) outline-none placeholder:text-(--dk-slate)"
      />
      {loading ? (
        <Loader2 size={16} className="animate-spin text-(--dk-slate)" />
      ) : null}
    </div>
  )
}
