"use client"

import { useEffect, useRef, useState } from "react"
import {
  CheckSquare,
  Heart,
  MessageCircleMore,
  Shuffle,
  Sun,
  X,
} from "lucide-react"
import {
  DAY_TEMPLATES,
  GUIDED_QUESTIONS,
  promptsForDay,
  type DayTemplate,
  type GuidedAnswer,
} from "@/lib/dayStarter/content"

const TEMPLATE_ICONS = {
  reflection: Sun,
  plan: CheckSquare,
  gratitude: Heart,
} satisfies Record<DayTemplate["id"], typeof Sun>

export default function DayStarter({
  dateParam,
  onInsertPrompt,
  onApplyTemplate,
  onGuidedDone,
}: {
  dateParam: string
  onInsertPrompt: (text: string) => void
  onApplyTemplate: (template: DayTemplate) => void
  onGuidedDone: (answers: GuidedAnswer[]) => void
}) {
  const [shuffle, setShuffle] = useState(0)
  const [guidedOpen, setGuidedOpen] = useState(false)
  const prompts = promptsForDay(dateParam, shuffle)

  return (
    <>
      <section
        className="mx-1 mt-4 rounded-xl border border-(--dk-sky)/12 bg-(--dk-sky)/[0.035] px-3.5 py-4 sm:px-4"
        aria-label="Writing ideas"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-(--dk-slate)">
            Need a spark?
          </p>
          <button
            type="button"
            onClick={() => setShuffle((value) => value + 1)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-(--dk-slate) transition hover:bg-(--dk-mist) hover:text-(--dk-ink)"
            aria-label="Shuffle prompts"
            title="Shuffle prompts"
          >
            <Shuffle size={14} />
          </button>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              onClick={() => onInsertPrompt(prompt.text)}
              className="rounded-full bg-(--dk-mist) px-3 py-1.5 text-left text-xs text-(--dk-ink) transition hover:bg-(--dk-sky)/12 hover:text-(--dk-sky)"
            >
              {prompt.text}
            </button>
          ))}
        </div>

        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-(--dk-slate)">
          Or start from a template
        </p>
        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {DAY_TEMPLATES.map((template) => {
            const Icon = TEMPLATE_ICONS[template.id]
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onApplyTemplate(template)}
                className="rounded-xl bg-(--dk-mist)/55 p-3 text-left transition hover:bg-(--dk-sky)/10"
              >
                <Icon size={17} className="text-(--dk-sky)" />
                <span className="mt-2 block text-xs font-semibold text-(--dk-ink)">
                  {template.title}
                </span>
                <span className="mt-0.5 block text-[11px] leading-4 text-(--dk-slate)">
                  {template.subtitle}
                </span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => setGuidedOpen(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-lg py-1 text-xs font-semibold text-(--dk-sky) transition hover:opacity-75"
        >
          <MessageCircleMore size={16} />
          Answer 3 quick questions
        </button>
      </section>

      {guidedOpen ? (
        <GuidedFlow
          onClose={() => setGuidedOpen(false)}
          onDone={(answers) => {
            setGuidedOpen(false)
            onGuidedDone(answers)
          }}
        />
      ) : null}
    </>
  )
}

function GuidedFlow({
  onClose,
  onDone,
}: {
  onClose: () => void
  onDone: (answers: GuidedAnswer[]) => void
}) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState(() => GUIDED_QUESTIONS.map(() => ""))
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const question = GUIDED_QUESTIONS[step]
  const isLast = step === GUIDED_QUESTIONS.length - 1
  const anyAnswered = answers.some((answer) => answer.trim())

  useEffect(() => {
    inputRef.current?.focus()
  }, [step])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  function finish(finalAnswers: string[]) {
    onDone(
      GUIDED_QUESTIONS.flatMap((item, index) => {
        const answer = finalAnswers[index].trim()
        return answer ? [{ question: item.question, answer }] : []
      }),
    )
  }

  function skip() {
    const next = answers.map((answer, index) => (index === step ? "" : answer))
    setAnswers(next)
    if (isLast) finish(next)
    else setStep((value) => value + 1)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guided-question"
        className="w-full max-w-sm rounded-2xl border border-(--dk-ink)/10 bg-(--dk-paper) p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-(--dk-slate)">
            Question {step + 1} of {GUIDED_QUESTIONS.length}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-(--dk-slate) transition hover:bg-(--dk-mist) hover:text-(--dk-ink)"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        <h2 id="guided-question" className="mt-4 text-lg font-bold tracking-tight text-(--dk-ink)">
          {question.question}
        </h2>
        {question.hint && (
          <p className="mt-1 text-xs text-(--dk-slate)">{question.hint}</p>
        )}

        <textarea
          key={question.id}
          ref={inputRef}
          value={answers[step]}
          onChange={(event) =>
            setAnswers((current) =>
              current.map((answer, index) =>
                index === step ? event.target.value : answer,
              ),
            )
          }
          aria-label={`Answer: ${question.question}`}
          placeholder="Type your answer…"
          rows={5}
          className="mt-4 w-full resize-y rounded-xl border border-(--dk-ink)/10 bg-(--dk-mist)/40 px-3 py-2.5 text-sm leading-5 text-(--dk-ink) outline-none transition placeholder:text-(--dk-slate)/45 focus:border-(--dk-sky)/50"
        />

        <div className="mt-4 flex justify-center gap-2" aria-hidden="true">
          {GUIDED_QUESTIONS.map((item, index) => (
            <span
              key={item.id}
              className={[
                "h-1.5 w-1.5 rounded-full",
                index <= step ? "bg-(--dk-sky)" : "bg-(--dk-mist)",
              ].join(" ")}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={skip}
            className="rounded-lg px-2 py-2 text-xs font-medium text-(--dk-slate) transition hover:text-(--dk-ink)"
          >
            Skip
          </button>
          <button
            type="button"
            disabled={isLast && !anyAnswered}
            onClick={() => {
              if (isLast) finish(answers)
              else setStep((value) => value + 1)
            }}
            className="min-w-28 rounded-full bg-(--dk-sky) px-5 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:bg-(--dk-mist) disabled:text-(--dk-slate) disabled:opacity-100"
          >
            {isLast ? "Add to page" : "Next"}
          </button>
        </div>
      </div>
    </div>
  )
}
