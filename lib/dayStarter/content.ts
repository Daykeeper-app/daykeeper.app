/**
 * Day-starter content: prompts, placeholders, templates, guided questions.
 *
 * ⚠️ DUPLICATED FILE — keep byte-identical with:
 *   daykeeper-app:    lib/dayStarter/content.ts
 *   daykeeper-webapp: lib/dayStarter/content.ts
 *
 * Platform-neutral: text uses the markdown subset both editors understand
 * (**bold**, "- " bullets, \n). No imports; no platform APIs. Prompt text
 * must not contain markdown metacharacters (*, _) — it is inserted verbatim.
 */

export type StarterPrompt = { id: string; text: string }

export type TemplateBlockSpec =
  | { type: "text"; markdown: string }
  | { type: "task"; title: string }

export type DayTemplate = {
  id: "reflection" | "plan" | "gratitude"
  title: string
  subtitle: string
  blocks: TemplateBlockSpec[]
}

export type GuidedQuestion = { id: string; question: string; hint?: string }

export type GuidedAnswer = { question: string; answer: string }

export const STARTER_PROMPTS: StarterPrompt[] = [
  { id: "highlight", text: "Highlight of my day" },
  { id: "grateful", text: "3 things I'm grateful for" },
  { id: "learned", text: "Something I learned today" },
  { id: "smile", text: "Something that made me smile" },
  { id: "energy", text: "What gave me energy today" },
  { id: "challenge", text: "A challenge I worked through" },
  { id: "people", text: "Who I spent time with today" },
  { id: "tomorrow", text: "One thing I'm looking forward to" },
  { id: "proud", text: "Something I'm proud of today" },
]

export const DAILY_PLACEHOLDERS: string[] = [
  "How did today go?",
  "What's on your mind?",
  "Start with one small moment from today…",
  "What happened today?",
  "What would you tell a friend about today?",
  "One sentence is enough to start…",
  "What do you want to remember about today?",
]

export const DAY_TEMPLATES: DayTemplate[] = [
  {
    id: "reflection",
    title: "Daily reflection",
    subtitle: "Feelings, events, takeaways",
    blocks: [
      { type: "text", markdown: "**How I felt today**\n" },
      { type: "text", markdown: "**What happened**\n" },
      { type: "text", markdown: "**One thing I'm taking with me**\n" },
    ],
  },
  {
    id: "plan",
    title: "Plan my day",
    subtitle: "Focus + tasks + notes",
    blocks: [
      { type: "text", markdown: "**Today's focus**\n" },
      { type: "task", title: "" },
      { type: "task", title: "" },
      { type: "task", title: "" },
      { type: "text", markdown: "**Notes**\n" },
    ],
  },
  {
    id: "gratitude",
    title: "Gratitude",
    subtitle: "Three good things",
    blocks: [
      { type: "text", markdown: "**3 things I'm grateful for**\n- \n- \n- " },
    ],
  },
]

export const GUIDED_QUESTIONS: GuidedQuestion[] = [
  { id: "feeling", question: "How are you feeling today?", hint: "A word or a paragraph — both count." },
  { id: "happened", question: "What happened today?", hint: "Big or small. What stood out?" },
  { id: "tomorrow", question: "Anything for tomorrow?", hint: "A plan, a hope, a reminder." },
]

// ── Deterministic date-seeded rotation ───────────────────────────────────────

/** Simple 31-hash of the DD-MM-YYYY string; stable across platforms/sessions. */
export function dateSeed(dateParam: string): number {
  let h = 0
  for (let i = 0; i < dateParam.length; i++) h = (h * 31 + dateParam.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** The day's placeholder for the leading text block. */
export function dailyPlaceholder(dateParam: string): string {
  return DAILY_PLACEHOLDERS[dateSeed(dateParam) % DAILY_PLACEHOLDERS.length]
}

/**
 * `count` prompts for the day — deterministic for shuffle=0; each shuffle
 * press advances the window through the seed-rotated prompt list.
 */
export function promptsForDay(dateParam: string, shuffle = 0, count = 3): StarterPrompt[] {
  const n = STARTER_PROMPTS.length
  const start = (dateSeed(dateParam) + shuffle * count) % n
  return Array.from({ length: Math.min(count, n) }, (_, i) => STARTER_PROMPTS[(start + i) % n])
}
