"use client"

/**
 * Guided questions flow — a gentle step-by-step alternative to freeform
 * writing. One question per step with Skip / Next; on the last step
 * "Add to page" returns only the answered questions, which DayPageEditor
 * assembles into text blocks.
 */

import { useState } from "react"
import ModalShell from "@/components/common/ModalShell"
import { GUIDED_QUESTIONS, type GuidedAnswer } from "@/lib/dayStarter/content"

export default function GuidedFlowModal({
  onClose,
  onDone,
}: {
  onClose: () => void
  onDone: (answers: GuidedAnswer[]) => void
}) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<string[]>(() => GUIDED_QUESTIONS.map(() => ""))

  const q = GUIDED_QUESTIONS[step]
  const isLast = step === GUIDED_QUESTIONS.length - 1
  const anyAnswered = answers.some((a) => a.trim().length > 0)

  function finish(finalAnswers: string[]) {
    const out: GuidedAnswer[] = GUIDED_QUESTIONS.flatMap((question, i) => {
      const answer = finalAnswers[i].trim()
      return answer ? [{ question: question.question, answer }] : []
    })
    onDone(out)
  }

  function skip() {
    const next = answers.map((a, i) => (i === step ? "" : a))
    setAnswers(next)
    if (isLast) finish(next)
    else setStep(step + 1)
  }

  function advance() {
    if (isLast) finish(answers)
    else setStep(step + 1)
  }

  return (
    <ModalShell title={`Question ${step + 1} of ${GUIDED_QUESTIONS.length}`} onClose={onClose}>
      <div className="text-base font-bold text-(--dk-ink)">{q.question}</div>
      {q.hint && <div className="mt-0.5 text-xs text-(--dk-slate)">{q.hint}</div>}

      <textarea
        key={q.id}
        value={answers[step]}
        onChange={(e) =>
          setAnswers((prev) => prev.map((a, i) => (i === step ? e.target.value : a)))
        }
        placeholder="Type your answer…"
        autoFocus
        rows={4}
        className="mt-3 w-full resize-none rounded-lg border border-(--dk-ink)/10 bg-(--dk-mist)/40 px-3 py-2 text-sm text-(--dk-ink) outline-none placeholder:text-(--dk-slate)/40 focus:border-(--dk-sky)/50"
      />

      <div className="mt-3 flex justify-center gap-2">
        {GUIDED_QUESTIONS.map((gq, i) => (
          <span
            key={gq.id}
            className={[
              "h-1.5 w-1.5 rounded-full",
              i <= step ? "bg-(--dk-sky)" : "bg-(--dk-mist)",
            ].join(" ")}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={skip}
          className="py-1.5 text-sm font-medium text-(--dk-slate) transition hover:text-(--dk-ink)"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={advance}
          disabled={isLast && !anyAnswered}
          className="min-w-28 rounded-full bg-(--dk-sky) px-5 py-1.5 text-sm font-semibold text-white transition hover:bg-(--dk-sky)/90 disabled:bg-(--dk-mist) disabled:text-(--dk-slate)"
        >
          {isLast ? "Add to page" : "Next"}
        </button>
      </div>
    </ModalShell>
  )
}
