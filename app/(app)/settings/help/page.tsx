"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronDown, ChevronUp, Mail } from "lucide-react"

const FAQ_ITEMS = [
  {
    question: "What is Daykeeper?",
    answer:
      "Daykeeper is a daily journaling app where you write entries for each day, add tasks and events, and optionally share moments with friends. Think of it as a private diary that can be as social — or as private — as you want.",
  },
  {
    question: "How do I format text?",
    answer:
      "In any text block on the Day page, use the formatting toolbar at the top (Bold, Italic, Underline, etc.). You can also type / at the start of a line to open a quick-command menu with formatting and block options.",
  },
  {
    question: "Who can see my entries?",
    answer:
      "Each entry has a privacy picker at the bottom of the editor. Choose Public (anyone), Followers (only people who follow you), or Close Friends (a hand-picked list). You can change this per entry at any time before publishing.",
  },
  {
    question: "How do I manage my Close Friends list?",
    answer:
      "Go to Settings → Close Friends. You can search for followers and add or remove them from your Close Friends list. Only accounts you follow back can be added.",
  },
  {
    question: "Can I delete my account?",
    answer:
      "Yes. Go to Settings → Danger Zone → Delete Account. You'll be asked to verify your identity with a confirmation code sent to your email, then confirm with your password. This action is permanent and cannot be undone.",
  },
  {
    question: "How do I change my password?",
    answer:
      "Go to Settings → Change Password. Enter your current password and choose a new one. If you've forgotten your password, use the Forgot Password link on the login screen.",
  },
  {
    question: "Why isn't my entry saving?",
    answer:
      "Make sure you tap or click the Publish button in the editor toolbar after writing. Daykeeper does not auto-save — entries are saved only when you explicitly publish them.",
  },
]

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-(--dk-ink)/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left hover:bg-(--dk-sky)/5 transition"
      >
        <span className="text-sm font-medium text-(--dk-ink)">{question}</span>
        {open ? (
          <ChevronUp size={16} className="shrink-0 text-(--dk-slate)" />
        ) : (
          <ChevronDown size={16} className="shrink-0 text-(--dk-slate)" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-(--dk-slate) leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  )
}

export default function HelpPage() {
  const router = useRouter()

  return (
    <main className="pb-20 lg:pb-0">
      <div className="max-w-3xl mx-auto lg:border-x lg:border-(--dk-ink)/10 bg-(--dk-paper) min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-(--dk-paper)/95 backdrop-blur-md z-20">
          <div className="h-0.5 w-full bg-(--dk-sky)/65" />
          <div className="flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl hover:bg-(--dk-mist)/70 transition"
              aria-label="Go back"
            >
              <ArrowLeft size={18} className="text-(--dk-ink)" />
            </button>
            <div>
              <div className="text-sm font-semibold text-(--dk-ink)">
                Help &amp; FAQ
              </div>
              <div className="text-xs text-(--dk-slate)">
                Common questions and answers
              </div>
            </div>
          </div>
        </div>

        <div className="pb-8">
          {/* FAQ */}
          <section className="border-t border-(--dk-ink)/10 bg-(--dk-paper)">
            <div className="px-4 py-3">
              <div className="text-sm font-semibold text-(--dk-ink)">
                Frequently asked questions
              </div>
            </div>
            <div className="border-t border-(--dk-ink)/10">
              {FAQ_ITEMS.map((item) => (
                <FaqItem
                  key={item.question}
                  question={item.question}
                  answer={item.answer}
                />
              ))}
            </div>
          </section>

          {/* Contact */}
          <section className="border-t border-(--dk-ink)/10 bg-(--dk-paper) mt-0">
            <div className="px-4 py-3">
              <div className="text-sm font-semibold text-(--dk-ink)">
                Contact support
              </div>
              <div className="text-xs text-(--dk-slate)">
                Can&apos;t find what you&apos;re looking for?
              </div>
            </div>
            <div className="border-t border-(--dk-ink)/10 px-4 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-(--dk-sky)/15 flex items-center justify-center shrink-0">
                <Mail size={18} className="text-(--dk-ink)" />
              </div>
              <div>
                <div className="text-sm font-medium text-(--dk-ink)">Email us</div>
                <a
                  href="mailto:contact@daykeeper.app"
                  className="text-xs text-(--dk-sky) underline underline-offset-2"
                >
                  contact@daykeeper.app
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
