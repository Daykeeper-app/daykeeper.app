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
// @ts-ignore — BubbleMenu lives in @tiptap/react/menus in this version
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
  Heading1,
  Heading2,
  Heading3,
  Quote,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────

export type SlashCommandType = "task" | "event" | "image" | "list" | "link"

export interface TiptapEditorHandle {
  focus: () => void
  /** Insert HTML at the end of the doc and leave the cursor after it. */
  insertHtmlAtEnd: (html: string) => void
}

interface SlashItemBase {
  title: string
  aliases: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: any
}

interface SlashItemBlock extends SlashItemBase {
  kind: "block"
  type: SlashCommandType
}

interface SlashItemFormat extends SlashItemBase {
  kind: "format"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (editor: any) => void
}

type SlashItem = SlashItemBlock | SlashItemFormat

// ── Slash item definitions ────────────────────────────────────────────────

const SLASH_ITEMS: SlashItem[] = [
  { kind: "block", title: "Task",        aliases: ["task", "todo", "checkbox"], type: "task",  Icon: CheckSquare },
  { kind: "block", title: "Event",       aliases: ["event", "calendar"],        type: "event", Icon: CalendarDays },
  { kind: "block", title: "Bullet list", aliases: ["list", "bullet", "ul"],     type: "list",  Icon: List },
  { kind: "block", title: "Link",        aliases: ["link", "url", "href"],      type: "link",  Icon: LinkIcon },
  { kind: "block", title: "Photo",       aliases: ["photo", "image", "video"],  type: "image", Icon: ImageIcon },

  { kind: "format", title: "Bold",          aliases: ["bold", "b", "strong"],            Icon: Bold,          execute: (e) => e.chain().focus().toggleBold().run() },
  { kind: "format", title: "Italic",        aliases: ["italic", "i", "em"],              Icon: Italic,        execute: (e) => e.chain().focus().toggleItalic().run() },
  { kind: "format", title: "Underline",     aliases: ["underline", "u"],                 Icon: UnderlineIcon, execute: (e) => e.chain().focus().toggleUnderline().run() },
  { kind: "format", title: "Strikethrough", aliases: ["strike", "strikethrough", "del"], Icon: Strikethrough, execute: (e) => e.chain().focus().toggleStrike().run() },
  { kind: "format", title: "Code",          aliases: ["code", "mono"],                   Icon: Code,          execute: (e) => e.chain().focus().toggleCode().run() },
  { kind: "format", title: "Heading 1",     aliases: ["h1", "heading1"],                 Icon: Heading1,      execute: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { kind: "format", title: "Heading 2",     aliases: ["h2", "heading2"],                 Icon: Heading2,      execute: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { kind: "format", title: "Heading 3",     aliases: ["h3", "heading3"],                 Icon: Heading3,      execute: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { kind: "format", title: "Quote",         aliases: ["quote", "blockquote"],            Icon: Quote,         execute: (e) => e.chain().focus().toggleBlockquote().run() },
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

// ── Suggestion callbacks ──────────────────────────────────────────────────

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          command({ editor, range, props }: { editor: any; range: any; props: SlashItem }) {
            editor.chain().focus().deleteRange(range).run()
            if (props.kind === "format") {
              props.execute(editor)
            } else {
              cb.onCommand?.(props.type)
            }
          },
          render() {
            return {
              onStart(props: any) {
                cb.selectItem = (item) => props.command(item)
                cb.setState?.({ items: props.items, activeIndex: 0, rect: props.clientRect?.() ?? null })
              },
              onUpdate(props: any) {
                cb.selectItem = (item) => props.command(item)
                cb.setState?.({ items: props.items, activeIndex: 0, rect: props.clientRect?.() ?? null })
              },
              onKeyDown({ event }: { event: KeyboardEvent }) {
                const state = cb.getState?.()
                if (!state || state.items.length === 0) return false
                const { items, activeIndex } = state
                if (event.key === "ArrowDown") {
                  event.preventDefault()
                  cb.setState?.({ ...state, activeIndex: (activeIndex + 1) % items.length })
                  return true
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault()
                  cb.setState?.({ ...state, activeIndex: (activeIndex - 1 + items.length) % items.length })
                  return true
                }
                if (event.key === "Enter") {
                  const item = items[activeIndex]
                  if (item) {
                    event.preventDefault()
                    cb.selectItem?.(item)
                    return true
                  }
                }
                if (event.key === "Escape") {
                  event.preventDefault()
                  cb.setState?.(EMPTY_DROPDOWN)
                  return true
                }
                return false
              },
              onExit() { cb.setState?.(EMPTY_DROPDOWN) },
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
  const activeItemRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  if (!rect || items.length === 0) return null

  // Split into two groups for display
  const blocks = items.filter((i) => i.kind === "block")
  const formats = items.filter((i) => i.kind === "format")

  const style: React.CSSProperties = {
    position: "fixed",
    top: rect.bottom + 6,
    left: Math.min(rect.left, (typeof window !== "undefined" ? window.innerWidth : 800) - 200),
    zIndex: 9999,
  }

  function renderItem(item: SlashItem, globalIdx: number) {
    const Icon = item.Icon
    const active = globalIdx === activeIndex
    return (
      <button
        key={item.title}
        id={`slash-command-${globalIdx}`}
        ref={active ? activeItemRef : undefined}
        type="button"
        role="option"
        aria-selected={active}
        onMouseDown={(e) => { e.preventDefault(); onSelect(item) }}
        className={[
          "flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors",
          active ? "bg-(--dk-mist)" : "hover:bg-(--dk-mist)/60",
        ].join(" ")}
      >
        <span className={[
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
          active ? "bg-(--dk-sky)/15 text-(--dk-sky)" : "bg-(--dk-mist) text-(--dk-slate)",
        ].join(" ")}>
          <Icon size={13} />
        </span>
        <span className="text-sm font-medium text-(--dk-ink)">{item.title}</span>
      </button>
    )
  }

  return createPortal(
    <div
      style={style}
      className="w-48 max-h-80 overflow-y-auto rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) shadow-xl shadow-black/10 py-1"
      role="listbox"
      aria-label="Editor commands"
      aria-activedescendant={`slash-command-${activeIndex}`}
    >
      {blocks.length > 0 && (
        <>
          <p className="px-2.5 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-(--dk-slate)/40">Blocks</p>
          {blocks.map((item, i) => renderItem(item, i))}
        </>
      )}
      {formats.length > 0 && (
        <>
          {blocks.length > 0 && <div className="my-1 border-t border-(--dk-ink)/8" />}
          <p className="px-2.5 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-(--dk-slate)/40">Format</p>
          {formats.map((item, i) => renderItem(item, blocks.length + i))}
        </>
      )}
    </div>,
    document.body,
  )
}

// ── Bubble menu ───────────────────────────────────────────────────────────

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

  useEffect(() => { if (!isLink) setLinkMode(false) }, [isLink])

  function openLinkEdit() {
    if (isLink) editor.chain().extendMarkRange("link").run()
    const { from: f, to: t } = editor.state.selection
    const text = editor.state.doc.textBetween(f, t, "")
    const href = editor.getAttributes("link").href ?? ""
    setLinkTitle(text)
    setLinkUrl(href)
    setLinkRange(f !== t ? { from: f, to: t } : null)
    setLinkHasPreselection(f !== t && !isLink)
    setLinkMode(true)
    setTimeout(() => { urlInputRef.current?.focus(); urlInputRef.current?.select() }, 10)
  }

  function applyLink() {
    const url = linkUrl.trim()
    const title = linkTitle.trim()
    const href = !url ? "" : (url.startsWith("http") || url.startsWith("mailto:") ? url : `https://${url}`)
    if (!href) {
      if (linkRange) editor.chain().focus().setTextSelection(linkRange).unsetLink().run()
      else editor.chain().focus().unsetLink().run()
    } else if (linkRange && title) {
      editor.chain().focus().setTextSelection(linkRange).insertContent([{ type: "text", text: title, marks: [{ type: "link", attrs: { href } }] }]).run()
    } else if (linkRange) {
      editor.chain().focus().setTextSelection(linkRange).setLink({ href }).run()
    } else {
      editor.chain().focus().setLink({ href }).run()
    }
    setLinkMode(false); setLinkUrl(""); setLinkTitle(""); setLinkRange(null)
  }

  function cancelLink() {
    setLinkMode(false); setLinkUrl(""); setLinkTitle(""); setLinkRange(null); setLinkHasPreselection(false)
    editor.chain().focus().run()
  }

  function removeLink() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run()
    setLinkMode(false)
  }

  const b = "flex h-8 w-8 items-center justify-center rounded-md transition"
  const on = "bg-(--dk-sky)/15 text-(--dk-sky)"
  const off = "text-(--dk-slate) hover:bg-(--dk-mist) hover:text-(--dk-ink)"
  const wrap = "rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) shadow-lg shadow-black/8"

  if (linkMode) {
    const row = "flex items-center gap-2 rounded-lg border border-(--dk-ink)/8 px-2 py-1.5"
    const inp = "flex-1 bg-transparent text-sm text-(--dk-ink) outline-none placeholder:text-(--dk-slate)/40 min-w-0"
    return (
      <div className={`${wrap} flex flex-col gap-1.5 p-2 w-64`}>
        {!linkHasPreselection && (
          <div className={row}>
            <span className="text-[10px] font-bold text-(--dk-slate)/40 w-5 text-center shrink-0">T</span>
            <input ref={titleInputRef} type="text" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); urlInputRef.current?.focus() } if (e.key === "Escape") cancelLink() }}
              placeholder="Link text" className={inp} />
          </div>
        )}
        <div className={row}>
          <LinkIcon size={11} className="shrink-0 text-(--dk-slate)/40" />
          <input ref={urlInputRef} type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyLink() } if (e.key === "Escape") cancelLink() }}
            placeholder="https://example.com" className={inp} />
        </div>
        <div className="flex justify-end gap-1 pt-0.5">
          <button type="button" onMouseDown={(e) => { e.preventDefault(); cancelLink() }}
            className="px-2 py-1 text-xs text-(--dk-slate) hover:text-(--dk-ink) rounded-md transition">Cancel</button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); applyLink() }}
            className="px-2.5 py-1 text-xs font-medium bg-(--dk-sky) text-white rounded-md hover:opacity-90 transition">Apply</button>
        </div>
      </div>
    )
  }

  if (isLink && !hasSelection) {
    const href = editor.getAttributes("link").href ?? ""
    const display = href.replace(/^https?:\/\//, "").replace(/\/$/, "")
    return (
      <div className={`${wrap} flex items-center gap-1.5 px-2 py-1.5`}>
        <LinkIcon size={12} className="shrink-0 text-(--dk-sky)" />
        <span className="max-w-[140px] truncate text-xs text-(--dk-sky)">{display || href}</span>
        <div className="mx-0.5 h-3.5 w-px bg-(--dk-ink)/15" />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); openLinkEdit() }}
          className="text-xs font-medium text-(--dk-slate) hover:text-(--dk-ink) transition px-1 py-0.5 rounded">Edit</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); removeLink() }}
          className={`${b} !h-7 !w-7 hover:text-(--dk-error) hover:bg-(--dk-mist)`} aria-label="Remove link">
          <LinkOff size={12} />
        </button>
      </div>
    )
  }

  return (
    <div className={`${wrap} flex items-center gap-0.5 px-1.5 py-1`}>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run() }} className={[b, editor.isActive("bold") ? on : off].join(" ")}><Bold size={14} /></button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }} className={[b, editor.isActive("italic") ? on : off].join(" ")}><Italic size={14} /></button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run() }} className={[b, editor.isActive("underline") ? on : off].join(" ")}><UnderlineIcon size={14} /></button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run() }} className={[b, editor.isActive("strike") ? on : off].join(" ")}><Strikethrough size={14} /></button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCode().run() }} className={[b, editor.isActive("code") ? on : off].join(" ")}><Code size={14} /></button>
      <div className="mx-1 h-4 w-px bg-(--dk-ink)/15" />
      <button type="button" onMouseDown={(e) => { e.preventDefault(); openLinkEdit() }} className={[b, isLink ? on : off].join(" ")}><LinkIcon size={14} /></button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────

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
  onPasteFiles?: (files: File[]) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

const TiptapEditor = forwardRef<TiptapEditorHandle, Props>(function TiptapEditor(
  { content, onChange, onSlashCommand, onBackspaceOnEmpty, onEditorFocus, onSelectionChange, onArrowDown, onArrowUp, onPasteFiles, placeholder = "Write something… (or type / for commands)", className, autoFocus = false },
  ref,
) {
  const [dropdown, setDropdown] = useState<DropdownState>(EMPTY_DROPDOWN)
  const dropdownRef = useRef<DropdownState>(dropdown)
  dropdownRef.current = dropdown

  const cb = useRef<SuggestionCallbacks>({ setState: null, getState: null, selectItem: null, onCommand: null })
  cb.current.setState = setDropdown
  cb.current.getState = () => dropdownRef.current

  const handleSlashCommand = useCallback((type: SlashCommandType) => { setDropdown(EMPTY_DROPDOWN); onSlashCommand(type) }, [onSlashCommand])
  cb.current.onCommand = handleSlashCommand

  const onBackspaceOnEmptyRef = useRef(onBackspaceOnEmpty); onBackspaceOnEmptyRef.current = onBackspaceOnEmpty
  const onEditorFocusRef = useRef(onEditorFocus); onEditorFocusRef.current = onEditorFocus
  const onSelectionChangeRef = useRef(onSelectionChange); onSelectionChangeRef.current = onSelectionChange
  const onArrowDownRef = useRef(onArrowDown); onArrowDownRef.current = onArrowDown
  const onArrowUpRef = useRef(onArrowUp); onArrowUpRef.current = onArrowUp

  const slashExt = useMemo(() => buildSlashExtension(cb.current), [])

  const backspaceExt = useMemo(() => Extension.create({
    name: "backspaceOnEmpty",
    addKeyboardShortcuts() {
      return { Backspace: ({ editor }) => { if (!editor.isEmpty) return false; onBackspaceOnEmptyRef.current?.(); return true } }
    },
  }), [])

  const arrowNavExt = useMemo(() => Extension.create({
    name: "arrowNavigation",
    addKeyboardShortcuts() {
      return {
        ArrowDown: ({ editor }) => {
          const { $head, empty } = editor.state.selection
          if (!empty) return false
          if ($head.index(0) === editor.state.doc.childCount - 1 && $head.parentOffset === $head.parent.content.size) { onArrowDownRef.current?.(); return true }
          return false
        },
        ArrowUp: ({ editor }) => {
          const { $head, empty } = editor.state.selection
          if (!empty) return false
          if ($head.index(0) === 0 && $head.parentOffset === 0) { onArrowUpRef.current?.(); return true }
          return false
        },
      }
    },
  }), [])

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
        class: ["outline-none min-h-[1.5rem]", "text-[15px] leading-relaxed text-(--dk-ink)", className ?? ""].filter(Boolean).join(" "),
      },
      handlePaste(_view, event) {
        const clipboard = event.clipboardData
        if (!clipboard) return false

        const itemFiles = Array.from(clipboard.items)
          .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
          .map((item) => item.getAsFile())
          .filter((file): file is File => file !== null)
        const imageFiles = itemFiles.length > 0
          ? itemFiles
          : Array.from(clipboard.files).filter((file) => file.type.startsWith("image/"))

        if (imageFiles.length === 0) return false
        event.preventDefault()
        onPasteFiles?.(imageFiles)
        return true
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML()
      onChange(html === "<p></p>" ? "" : html)
    },
  })

  useImperativeHandle(
    ref,
    () => ({
      focus: () => { editor?.commands.focus("end") },
      insertHtmlAtEnd: (html: string) => {
        editor?.chain().focus("end").insertContent(html).run()
      },
    }),
    [editor],
  )

  useEffect(() => {
    if (!editor) return
    const handleFocus = () => onEditorFocusRef.current?.(editor)
    const handleSelection = () => { onEditorFocusRef.current?.(editor); onSelectionChangeRef.current?.() }
    editor.on("focus", handleFocus)
    editor.on("selectionUpdate", handleSelection)
    return () => { editor.off("focus", handleFocus); editor.off("selectionUpdate", handleSelection) }
  }, [editor])

  if (!editor) return null

  return (
    <div className="tiptap-editor relative">
      <BubbleMenu
        editor={editor}
        style={{ zIndex: 9999 }}
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
        <SlashDropdown items={dropdown.items} activeIndex={dropdown.activeIndex} rect={dropdown.rect} onSelect={(item) => cb.current.selectItem?.(item)} />
      )}
    </div>
  )
})

export default TiptapEditor
