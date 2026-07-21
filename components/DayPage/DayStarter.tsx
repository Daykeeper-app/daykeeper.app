"use client"

/**
 * Empty-day starter panel — shown under the (empty) leading text block of the
 * day editor to fight blank-page paralysis. Three ways in, lowest friction
 * first: tappable prompt chips, one-tap page templates, and a guided
 * questions flow. Purely presentational; DayPageEditor owns all mutations.
 *
 * The parent editor remounts per date (key={dateParam}), so shuffle state
 * resets each day for free.
 */

import { useState } from "react"
import { Shuffle, Sun, ListTodo, Heart, MessagesSquare } from "lucide-react"
import { promptsForDay, DAY_TEMPLATES, type DayTemplate } from "@/lib/dayStarter/content"

const TEMPLATE_ICONS: Record<DayTemplate["id"], typeof Sun> = {
  reflection: Sun,
  plan: ListTodo,
  gratitude: Heart,
}

export default function DayStarter({
  dateParam,
  onInsertPrompt,
  onApplyTemplate,
  onOpenGuided,
}: {
  dateParam: string
  onInsertPrompt: (text: string) => void
  onApplyTemplate: (tpl: DayTemplate) => void
  onOpenGuided: () => void
}) {
  const [shuffle, setShuffle] = useState(0)
  const prompts = promptsForDay(dateParam, shuffle)

  return (
    <div className="px-1 pt-3 pb-1">
      {/* prompt chips */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-(--dk-slate)">
          Need a spark?
        </span>
        <button
          type="button"
          onClick={() => setShuffle((s) => s + 1)}
          title="Shuffle prompts"
          aria-label="Shuffle prompts"
          className="flex h-6 w-6 items-center justify-center rounded text-(--dk-slate) transition hover:bg-(--dk-mist) hover:text-(--dk-ink)"
        >
          <Shuffle size={13} />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {prompts.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onInsertPrompt(p.text)}
            className="rounded-full bg-(--dk-mist) px-3 py-1.5 text-sm text-(--dk-ink) transition hover:bg-(--dk-sky)/15 hover:text-(--dk-sky)"
          >
            {p.text}
          </button>
        ))}
      </div>

      {/* templates */}
      <div className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-(--dk-slate)">
        Or start from a template
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {DAY_TEMPLATES.map((tpl) => {
          const Icon = TEMPLATE_ICONS[tpl.id]
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onApplyTemplate(tpl)}
              className="rounded-xl border border-(--dk-ink)/8 bg-(--dk-mist)/40 p-3 text-left transition hover:border-(--dk-sky)/40 hover:bg-(--dk-sky)/8"
            >
              <Icon size={16} className="text-(--dk-sky)" />
              <div className="mt-1.5 text-sm font-semibold text-(--dk-ink)">{tpl.title}</div>
              <div className="text-xs text-(--dk-slate)">{tpl.subtitle}</div>
            </button>
          )
        })}
      </div>

      {/* guided flow */}
      <button
        type="button"
        onClick={onOpenGuided}
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-(--dk-sky) transition hover:opacity-80"
      >
        <MessagesSquare size={15} />
        Answer 3 quick questions
      </button>
    </div>
  )
}
