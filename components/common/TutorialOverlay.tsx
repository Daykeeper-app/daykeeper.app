"use client"

import { useEffect, useState } from "react"
import {
  BookOpen,
  CheckSquare,
  LayoutList,
  PenLine,
  Shield,
  X,
} from "lucide-react"

const STEPS = [
  {
    icon: BookOpen,
    title: "Welcome to Daykeeper!",
    description:
      "Your personal daily journal. Write about your day, track tasks and events, and share moments with friends.",
  },
  {
    icon: PenLine,
    title: "Write your day",
    description:
      "Use the Day page to write rich entries. Format text with the toolbar — bold, italic, headings, and more. Type / in any text block for quick commands.",
  },
  {
    icon: LayoutList,
    title: "Browse the Feed",
    description:
      "See daily entries from people you follow, sorted by date. Navigate between days with the arrows at the top.",
  },
  {
    icon: CheckSquare,
    title: "Tasks & Events",
    description:
      "Add tasks and events to your day entries. Check off tasks as you complete them and keep track of what's ahead.",
  },
  {
    icon: Shield,
    title: "Control your privacy",
    description:
      "Each entry has a privacy picker: Public, Followers only, or Close Friends. You're always in control of who sees what.",
  },
]

export default function TutorialOverlay({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (open) setStep(0)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
    }
    document.addEventListener("keydown", onEsc)
    return () => document.removeEventListener("keydown", onEsc)
  }, [open])

  function handleClose() {
    localStorage.setItem("dk-tutorial-seen", "1")
    onClose()
  }

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
    } else {
      handleClose()
    }
  }

  if (!open) return null

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-sm rounded-2xl bg-(--dk-paper) shadow-2xl p-6">
        {/* Skip */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Skip tutorial"
          className="absolute top-4 right-4 h-7 w-7 flex items-center justify-center rounded-lg hover:bg-(--dk-mist) transition text-(--dk-slate)"
        >
          <X size={15} />
        </button>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={[
                "h-1.5 rounded-full transition-all",
                i === step
                  ? "w-5 bg-(--dk-sky)"
                  : "w-1.5 bg-(--dk-ink)/15",
              ].join(" ")}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="h-14 w-14 rounded-2xl bg-(--dk-sky)/12 flex items-center justify-center">
            <Icon size={28} className="text-(--dk-sky)" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h2 className="text-base font-semibold text-(--dk-ink) mb-2">
            {current.title}
          </h2>
          <p className="text-sm text-(--dk-slate) leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 rounded-xl border border-(--dk-ink)/12 px-4 py-2.5 text-sm font-medium text-(--dk-ink) hover:bg-(--dk-mist) transition"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 rounded-xl bg-(--dk-sky) px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 transition"
          >
            {isLast ? "Get started" : "Next"}
          </button>
        </div>

        {/* Step counter */}
        <p className="text-center text-xs text-(--dk-slate)/60 mt-3">
          {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  )
}
