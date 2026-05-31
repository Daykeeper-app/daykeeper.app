"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { useEditor, EditorContent, Extension } from "@tiptap/react"
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — BubbleMenu React component lives in @tiptap/react/menus in this version
import { BubbleMenu } from "@tiptap/react/menus"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Placeholder from "@tiptap/extension-placeholder"
import Link from "@tiptap/extension-link"
import Suggestion from "@tiptap/suggestion"
import { createPortal } from "react-dom"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Code,
  Strikethrough,
  Link as LinkIcon,
  Link2Off as LinkOff,
  CheckSquare,
  CalendarDays,
  ImageIcon,
  List,
  X,
  Check,
} from "lucide-react"

export type SlashCommandType = "task" | "event" | "image" | "list" | "link"

export interface TiptapEditorHandle {
  focus: () => void
}

interface SlashItem {
  title: string
  description: string
  type: SlashCommandType
  aliases: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: any
}

const SLASH_ITEMS: SlashItem[] = [
  {
    title: "Task",
    description: "A to-do item",
    type: "task",
    aliases: ["todo", "task", "checkbox", "check"],
    Icon: CheckSquare,
  },
  {
    title: "Event",
    description: "Calendar event with dates",
    type: "event",
    aliases: ["event", "calendar", "meeting"],
    Icon: CalendarDays,
  },
  {
    title: "Bullet list",
    description: "Start a bulleted list",
    type: "list",
    aliases: ["list", "bullet", "ul"],
    Icon: List,
  },
  {
    title: "Link",
    description: "Insert a hyperlink",
    type: "link",
    aliases: ["link", "url", "href", "hyperlink"],
    Icon: LinkIcon,
  },
  {
    title: "Photo",
    description: "Upload an image or video",
    type: "image",
    aliases: ["photo", "image", "picture", "video", "media"],
    Icon: ImageIcon,
  },
]

function filterItems(query: string): SlashItem[] {
  if (!query) return SLASH_ITEMS
  const q = query.toLowerCase()
  return SLASH_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().startsWith(q) ||
      item.aliases.some((a) => a.startsWith(q)),
  )
}

// ── Shared callbacks object ───────────────────────────────────────────────

interface SuggestionCallbacks {
  setState: ((s: DropdownState) => void) | null
  getState: (() => DropdownState) | null
  selectItem: ((item: SlashItem) => void) | null
  onCommand: ((type: SlashCommandType) => void) | null
}

interface DropdownState {
  items: SlashItem[]
  activeIndex: number
  rect: DOMRect | null
}

const EMPTY_DROPDOWN: DropdownState = { items: [], activeIndex: 0, rect: null }

function buildSlashExtension(cb: SuggestionCallbacks) {
  return Extension.create({
    name: "slashCommand",
    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          char: "/",
          allowSpaces: false,
          items: ({ query }: { query: string }) => filterItems(query),
          command({ editor, range, props }: { editor: any; range: any; props: SlashItem }) {
            editor.chain().focus().deleteRange(range).run()
            cb.onCommand?.(props.type)
          },
          render() {
            return {
              onStart(props: any) {
                cb.selectItem = (item) => props.command(item)
                cb.setState?.({
                  items: props.items,
                  activeIndex: 0,
                  rect: props.clientRect?.() ?? null,
                })
              },
              onUpdate(props: any) {
                cb.selectItem = (item) => props.command(item)
                cb.setState?.({
                  items: props.items,
                  activeIndex: 0,
                  rect: props.clientRect?.() ?? null,
                })
              },
              onKeyDown({ event }: { event: KeyboardEvent }) {
                const state = cb.getState?.()
                if (!state || state.items.length === 0) return false
                const { items, activeIndex } = state

                if (event.key === "ArrowDown") {
                  cb.setState?.({ ...state, activeIndex: (activeIndex + 1) % items.length })
                  return true
                }
                if (event.key === "ArrowUp") {
                  cb.setState?.({
                    ...state,
                    activeIndex: (activeIndex - 1 + items.length) % items.length,
                  })
                  return true
                }
                if (event.key === "Enter") {
                  const item = items[activeIndex]
                  if (item) { cb.selectItem?.(item); return true }
                }
                if (event.key === "Escape") {
                  cb.setState?.(EMPTY_DROPDOWN)
                  return true
                }
                return false
              },
              onExit() {
                cb.setState?.(EMPTY_DROPDOWN)
              },
            }
          },
        }),
      ]
    },
  })
}

// ── Slash dropdown UI ─────────────────────────────────────────────────────

function SlashDropdown({
  items,
  activeIndex,
  rect,
  onSelect,
}: {
  items: SlashItem[]
  activeIndex: number
  rect: DOMRect | null
  onSelect: (item: SlashItem) => void
}) {
  if (!rect || items.length === 0) return null

  const style: React.CSSProperties = {
    position: "fixed",
    top: rect.bottom + 8,
    left: Math.min(rect.left, (typeof window !== "undefined" ? window.innerWidth : 800) - 220),
    zIndex: 9999,
  }

  return createPortal(
    <div
      style={style}
      className="w-52 overflow-hidden rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) shadow-xl shadow-black/10 py-1"
      role="listbox"
    >
      {items.map((item, idx) => {
        const Icon = item.Icon
        const active = idx === activeIndex
        return (
          <button
            key={item.type}
            type="button"
            role="option"
            aria-selected={active}
            onMouseDown={(e) => {
              e.preventDefault()
              onSelect(item)
            }}
            className={[
              "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
              active ? "bg-(--dk-mist)" : "hover:bg-(--dk-mist)/50",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                active ? "bg-(--dk-sky)/15 text-(--dk-sky)" : "bg-(--dk-mist) text-(--dk-slate)",
              ].join(" ")}
            >
              <Icon size={14} />
            </span>
            <div className="min-w-0">
              <div className={["text-sm font-medium", active ? "text-(--dk-ink)" : "text-(--dk-ink)"].join(" ")}>
                {item.title}
              </div>
              <div className="text-[11px] text-(--dk-slate)/70 leading-none mt-0.5">
                {item.description}
              </div>
            </div>
          </button>
        )
      })}
    </div>,
    document.body,
  )
}

// ── Bubble menu (formatting toolbar) ─────────────────────────────────────

function FormatBubbleMenu({ editor }: { editor: any }) {
  const [linkMode, setLinkMode] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [linkTitle, setLinkTitle] = useState("")
  const [linkRange, setLinkRange] = useState<{ from: number; to: number } | null>(null)
  const [linkHasPreselection, setLinkHasPreselection] = useState(false)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const isLink = editor.isActive("link")
  const { from, to } = editor.state.selection
  const hasSelection = from !== to

  useEffect(() => {
    if (!isLink) setLinkMode(false)
  }, [isLink])

  function openLinkEdit() {
    // Extend selection to cover the whole link mark so we can read/replace it
    if (isLink) {
      editor.chain().extendMarkRange("link").run()
    }
    const { from: f, to: t } = editor.state.selection
    const text = editor.state.doc.textBetween(f, t, "")
    const href = editor.getAttributes("link").href ?? ""
    // pre-selection = user selected text first (not editing an existing link)
    const preselected = f !== t && !isLink

    setLinkTitle(text)
    setLinkUrl(href)
    setLinkRange(f !== t ? { from: f, to: t } : null)
    setLinkHasPreselection(preselected)
    setLinkMode(true)

    setTimeout(() => {
      urlInputRef.current?.focus()
      urlInputRef.current?.select()
    }, 10)
  }

  function applyLink() {
    const url = linkUrl.trim()
    const title = linkTitle.trim()
    const href = !url
      ? ""
      : url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:")
        ? url
        : `https://${url}`

    if (!href) {
      // Remove the link entirely
      if (linkRange) {
        editor.chain().focus().setTextSelection(linkRange).unsetLink().run()
      } else {
        editor.chain().focus().unsetLink().run()
      }
    } else if (linkRange && title) {
      // Replace text + set link in one go
      editor
        .chain()
        .focus()
        .setTextSelection(linkRange)
        .insertContent([{ type: "text", text: title, marks: [{ type: "link", attrs: { href } }] }])
        .run()
    } else if (linkRange) {
      // URL-only change — keep existing text
      editor.chain().focus().setTextSelection(linkRange).setLink({ href }).run()
    } else {
      editor.chain().focus().setLink({ href }).run()
    }

    setLinkMode(false)
    setLinkUrl("")
    setLinkTitle("")
    setLinkRange(null)
  }

  function cancelLink() {
    setLinkMode(false)
    setLinkUrl("")
    setLinkTitle("")
    setLinkRange(null)
    setLinkHasPreselection(false)
    editor.chain().focus().run()
  }

  function removeLink() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run()
    setLinkMode(false)
  }

  const btnBase = "flex h-7 w-7 items-center justify-center rounded-md transition"
  const btnActive = "bg-(--dk-sky)/15 text-(--dk-sky)"
  const btnInactive = "text-(--dk-slate) hover:bg-(--dk-mist) hover:text-(--dk-ink)"
  const wrap = "rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) shadow-lg shadow-black/8"

  // ── Link edit form (title + URL) ────────────────────────────────────────
  if (linkMode) {
    const fieldRow = "flex items-center gap-2 rounded-lg border border-(--dk-ink)/8 px-2 py-1.5"
    const fieldInput = "flex-1 bg-transparent text-sm text-(--dk-ink) outline-none placeholder:text-(--dk-slate)/40 min-w-0"
    return (
      <div className={`${wrap} flex flex-col gap-1.5 p-2 w-60`}>
        {/* Hide title row when user pre-selected text — they just need the URL */}
        {!linkHasPreselection && (
          <div className={fieldRow}>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-(--dk-slate)/50 w-5 text-center shrink-0">T</span>
            <input
              ref={titleInputRef}
              type="text"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); urlInputRef.current?.focus(); urlInputRef.current?.select() }
                if (e.key === "Escape") cancelLink()
              }}
              placeholder="Link text"
              className={fieldInput}
            />
          </div>
        )}
        <div className={fieldRow}>
          <LinkIcon size={11} className="shrink-0 text-(--dk-slate)/50" />
          <input
            ref={urlInputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); applyLink() }
              if (e.key === "Escape") cancelLink()
            }}
            placeholder="https://example.com"
            className={fieldInput}
          />
        </div>
        <div className="flex items-center justify-end gap-1 pt-0.5">
          <button type="button" onMouseDown={(e) => { e.preventDefault(); cancelLink() }}
            className="px-2 py-1 text-xs text-(--dk-slate) hover:text-(--dk-ink) transition rounded-md">
            Cancel
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); applyLink() }}
            className="px-2.5 py-1 text-xs font-medium bg-(--dk-sky) text-white rounded-md hover:opacity-90 transition">
            Apply
          </button>
        </div>
      </div>
    )
  }

  // ── Cursor inside a link, no selection → compact link bar ───────────────
  if (isLink && !hasSelection) {
    const href = editor.getAttributes("link").href ?? ""
    const displayUrl = href.replace(/^https?:\/\//, "").replace(/\/$/, "")
    return (
      <div className={`${wrap} flex items-center gap-1.5 px-2 py-1.5`}>
        <LinkIcon size={12} className="shrink-0 text-(--dk-sky)" />
        <span className="max-w-[140px] truncate text-xs text-(--dk-sky)">{displayUrl || href}</span>
        <div className="mx-0.5 h-3.5 w-px bg-(--dk-ink)/15" />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); openLinkEdit() }}
          className="text-xs font-medium text-(--dk-slate) hover:text-(--dk-ink) transition px-1 py-0.5 rounded-md" aria-label="Edit link">
          Edit
        </button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); removeLink() }}
          className="flex h-6 w-6 items-center justify-center rounded-md text-(--dk-slate) hover:text-(--dk-error) hover:bg-(--dk-mist) transition" aria-label="Remove link">
          <LinkOff size={12} />
        </button>
      </div>
    )
  }

  // ── Normal format toolbar ───────────────────────────────────────────────
  return (
    <div className={`${wrap} flex items-center gap-0.5 px-1.5 py-1`}>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
        className={[btnBase, editor.isActive("bold") ? btnActive : btnInactive].join(" ")} aria-label="Bold">
        <Bold size={13} />
      </button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}
        className={[btnBase, editor.isActive("italic") ? btnActive : btnInactive].join(" ")} aria-label="Italic">
        <Italic size={13} />
      </button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run() }}
        className={[btnBase, editor.isActive("underline") ? btnActive : btnInactive].join(" ")} aria-label="Underline">
        <UnderlineIcon size={13} />
      </button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run() }}
        className={[btnBase, editor.isActive("strike") ? btnActive : btnInactive].join(" ")} aria-label="Strikethrough">
        <Strikethrough size={13} />
      </button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCode().run() }}
        className={[btnBase, editor.isActive("code") ? btnActive : btnInactive].join(" ")} aria-label="Code">
        <Code size={13} />
      </button>

      <div className="mx-1 h-4 w-px bg-(--dk-ink)/15" />

      {isLink ? (
        <button type="button" onMouseDown={(e) => { e.preventDefault(); openLinkEdit() }}
          className={[btnBase, btnActive].join(" ")} aria-label="Edit link">
          <LinkIcon size={13} />
        </button>
      ) : (
        <button type="button" onMouseDown={(e) => { e.preventDefault(); openLinkEdit() }}
          className={[btnBase, btnInactive].join(" ")} aria-label="Add link">
          <LinkIcon size={13} />
        </button>
      )}
    </div>
  )
}

// ── Main TiptapEditor ─────────────────────────────────────────────────────

interface Props {
  content: string
  onChange: (html: string) => void
  onSlashCommand: (type: SlashCommandType) => void
  onBackspaceOnEmpty?: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEditorFocus?: (editor: any) => void
  onSelectionChange?: () => void
  onArrowDown?: () => void
  onArrowUp?: () => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

const TiptapEditor = forwardRef<TiptapEditorHandle, Props>(function TiptapEditor(
  {
    content,
    onChange,
    onSlashCommand,
    onBackspaceOnEmpty,
    onEditorFocus,
    onSelectionChange,
    onArrowDown,
    onArrowUp,
    placeholder = "Write something…",
    className,
    autoFocus = false,
  },
  ref,
) {
  const [dropdown, setDropdown] = useState<DropdownState>(EMPTY_DROPDOWN)
  const dropdownRef = useRef<DropdownState>(dropdown)
  dropdownRef.current = dropdown

  const cb = useRef<SuggestionCallbacks>({
    setState: null,
    getState: null,
    selectItem: null,
    onCommand: null,
  })
  cb.current.setState = setDropdown
  cb.current.getState = () => dropdownRef.current

  const handleSlashCommand = useCallback(
    (type: SlashCommandType) => {
      setDropdown(EMPTY_DROPDOWN)
      onSlashCommand(type)
    },
    [onSlashCommand],
  )
  cb.current.onCommand = handleSlashCommand

  const onBackspaceOnEmptyRef = useRef(onBackspaceOnEmpty)
  onBackspaceOnEmptyRef.current = onBackspaceOnEmpty
  const onEditorFocusRef = useRef(onEditorFocus)
  onEditorFocusRef.current = onEditorFocus
  const onSelectionChangeRef = useRef(onSelectionChange)
  onSelectionChangeRef.current = onSelectionChange
  const onArrowDownRef = useRef(onArrowDown)
  onArrowDownRef.current = onArrowDown
  const onArrowUpRef = useRef(onArrowUp)
  onArrowUpRef.current = onArrowUp

  const slashExt = useMemo(() => buildSlashExtension(cb.current), [])

  const backspaceExt = useMemo(
    () =>
      Extension.create({
        name: "backspaceOnEmpty",
        addKeyboardShortcuts() {
          return {
            Backspace: ({ editor }) => {
              if (!editor.isEmpty) return false
              onBackspaceOnEmptyRef.current?.()
              return true
            },
          }
        },
      }),
    [],
  )

  const arrowNavExt = useMemo(
    () =>
      Extension.create({
        name: "arrowNavigation",
        addKeyboardShortcuts() {
          return {
            ArrowDown: ({ editor }) => {
              const { $head, empty } = editor.state.selection
              if (!empty) return false
              const inLastBlock = $head.index(0) === editor.state.doc.childCount - 1
              const atEndOfBlock = $head.parentOffset === $head.parent.content.size
              if (inLastBlock && atEndOfBlock) {
                onArrowDownRef.current?.()
                return true
              }
              return false
            },
            ArrowUp: ({ editor }) => {
              const { $head, empty } = editor.state.selection
              if (!empty) return false
              const inFirstBlock = $head.index(0) === 0
              const atStartOfBlock = $head.parentOffset === 0
              if (inFirstBlock && atStartOfBlock) {
                onArrowUpRef.current?.()
                return true
              }
              return false
            },
          }
        },
      }),
    [],
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ hardBreak: false }),
      Underline,
      Link.extend({ inclusive: false }).configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { class: "tiptap-link", rel: "noopener noreferrer", target: "_blank" },
      }),
      Placeholder.configure({ placeholder }),
      slashExt,
      backspaceExt,
      arrowNavExt,
    ],
    content: content || "",
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        class: [
          "outline-none min-h-[1.5rem]",
          "text-[15px] leading-relaxed text-(--dk-ink)",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" "),
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML()
      onChange(html === "<p></p>" ? "" : html)
    },
  })

  useImperativeHandle(
    ref,
    () => ({ focus: () => { editor?.commands.focus("end") } }),
    [editor],
  )

  useEffect(() => {
    if (!editor) return
    const handleFocus = () => onEditorFocusRef.current?.(editor)
    const handleSelection = () => {
      onEditorFocusRef.current?.(editor)
      onSelectionChangeRef.current?.()
    }
    editor.on("focus", handleFocus)
    editor.on("selectionUpdate", handleSelection)
    return () => {
      editor.off("focus", handleFocus)
      editor.off("selectionUpdate", handleSelection)
    }
  }, [editor])

  if (!editor) return null

  return (
    <div className="tiptap-editor relative">
      <BubbleMenu
        editor={editor}
        tippyOptions={{ zIndex: 9999 }}
        shouldShow={({ editor, state }: { editor: any; state: any }) => {
          if (editor.isActive("codeBlock")) return false
          const { from, to } = state.selection
          return from !== to || editor.isActive("link")
        }}
      >
        <FormatBubbleMenu editor={editor} />
      </BubbleMenu>

      <EditorContent editor={editor} />

      {dropdown.items.length > 0 && dropdown.rect && (
        <SlashDropdown
          items={dropdown.items}
          activeIndex={dropdown.activeIndex}
          rect={dropdown.rect}
          onSelect={(item) => cb.current.selectItem?.(item)}
        />
      )}
    </div>
  )
})

export default TiptapEditor
