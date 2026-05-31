"use client"

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  createRef,
} from "react"
import {
  CheckSquare,
  Calendar,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Play,
  List,
  Link as LinkIcon,
  Link2Off,
  X,
  Check,
  RotateCcw,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"
import PrivacyPicker, { type PrivacyValue } from "@/components/common/PrivacyPicker"
import TiptapEditor, { type TiptapEditorHandle, type SlashCommandType } from "@/components/common/TiptapEditor"

type BlockType = "text" | "task" | "event" | "image"

type EditorBlock = {
  stableKey: string  // stable React key; never changes after block creation
  _id?: string
  type: BlockType
  order: number
  content?: string
  title?: string
  completed?: boolean
  description?: string
  dateStart?: string
  dateEnd?: string
  mediaId?: string
  mediaUrl?: string
  mediaType?: "image" | "video"
  uploading?: boolean
}

type Props = {
  dateParam: string
  initialPage: any
}

const MAX_MEDIA = 5

let _tempId = 0
function newTempId() {
  return `_new_${++_tempId}`
}

function isPersistedId(id?: string) {
  return !!id && !id.startsWith("_new_")
}

function ToolbarBtn({
  active,
  onMouseDown,
  title,
  children,
  wide,
}: {
  active: boolean
  onMouseDown: (e: React.MouseEvent) => void
  title: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <button
      type="button"
      onMouseDown={onMouseDown}
      title={title}
      className={[
        "flex items-center justify-center rounded transition-colors",
        wide ? "px-1.5 h-6 text-[11px] font-bold" : "h-6 w-6",
        active
          ? "bg-(--dk-sky)/15 text-(--dk-sky)"
          : "text-(--dk-slate) hover:bg-(--dk-mist) hover:text-(--dk-ink)",
      ].join(" ")}
    >
      {children}
    </button>
  )
}

function blockFromRaw(raw: any, idx: number): EditorBlock {
  const id = raw._id ?? raw.id ?? newTempId()
  return {
    stableKey: id,
    _id: id,
    type: raw.type ?? "text",
    order: typeof raw.order === "number" ? raw.order : idx,
    content: raw.content,
    title: raw.title,
    completed: !!raw.completed,
    description: raw.description,
    dateStart: raw.dateStart,
    dateEnd: raw.dateEnd,
    mediaId: raw.mediaId,
    mediaUrl: raw.media?.urls?.main ?? raw.media?.url ?? undefined,
    mediaType: raw.media?.type === "video" ? "video" : "image",
  }
}

function makeTempBlock(type: BlockType, order: number, extras?: Partial<EditorBlock>): EditorBlock {
  const tempId = newTempId()
  return {
    stableKey: tempId,
    _id: tempId,
    type,
    order,
    content: type === "text" ? "" : undefined,
    title: type === "task" || type === "event" ? "" : undefined,
    completed: type === "task" ? false : undefined,
    description: type === "event" ? "" : undefined,
    ...extras,
  }
}


export default function DayPageEditor({ dateParam, initialPage }: Props) {
  const qc = useQueryClient()
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const savingRef = useRef(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blocksRef = useRef<EditorBlock[]>([])
  const privacyRef = useRef<PrivacyValue>("public")

  const [blocks, setBlocks] = useState<EditorBlock[]>(() => {
    const raw: any[] = initialPage?.blocks ?? []
    const sorted = [...raw].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(blockFromRaw)
    // Always provide at least one editable text block at the top
    const hasEditableBlock = sorted.some((b) => b.type !== "image")
    if (!hasEditableBlock) {
      return [makeTempBlock("text", 0), ...sorted.map((b) => ({ ...b, order: b.order + 1 }))]
    }
    return sorted
  })
  const [privacy, setPrivacy] = useState<PrivacyValue>(
    (initialPage?.privacy as PrivacyValue) ?? "public",
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedOk, setSavedOk] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [, forceToolbarUpdate] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragCounterRef = useRef(0)
  const undoStack = useRef<EditorBlock[][]>([])
  const [canUndo, setCanUndo] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeEditorRef = useRef<any>(null)
  const linkBtnRef = useRef<HTMLButtonElement>(null)
  const [linkPopup, setLinkPopup] = useState<{ title: string; url: string; rect: DOMRect } | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputRefs = useRef<Array<React.RefObject<any>>>([])

  blocksRef.current = blocks
  privacyRef.current = privacy

  // Keep inputRefs in sync with blocks length
  while (inputRefs.current.length < blocks.length) {
    inputRefs.current.push(createRef())
  }
  inputRefs.current.length = blocks.length

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [])

  // ── Save ──────────────────────────────────────────────────────────────────

  const doSave = useCallback(async () => {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setSaveError(null)

    try {
      let imagesSeen = 0
      const payload = {
        privacy: privacyRef.current,
        blocks: blocksRef.current
          .filter((b) => {
            if (b.uploading) return false
            if (b.type === "image") {
              if (imagesSeen >= MAX_MEDIA) return false
              imagesSeen++
            }
            return true
          })
          .map((b, i) => {
            const out: Record<string, unknown> = { type: b.type, order: i }
            if (isPersistedId(b._id)) out._id = b._id
            if (b.type === "text") out.content = b.content ?? ""
            if (b.type === "task") {
              out.title = b.title ?? ""
              out.completed = b.completed ?? false
            }
            if (b.type === "event") {
              out.title = b.title ?? ""
              out.description = b.description ?? ""
              if (b.dateStart) out.dateStart = b.dateStart
              if (b.dateEnd) out.dateEnd = b.dateEnd
            }
            if (b.type === "image" && b.mediaId) out.mediaId = b.mediaId
            return out
          }),
      }

      const res = await apiFetch(
        `${API_URL}/day-pages/${encodeURIComponent(dateParam)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      )

      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.message || `Failed (${res.status})`)
      }

      const json = await res.json().catch(() => null)
      const savedBlocks: any[] = json?.data?.blocks ?? []
      const serverSorted = [...savedBlocks]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(blockFromRaw)

      // Background merge: update _id (temp → real) and image metadata only.
      // Never replace content/title/etc. so in-flight edits and editor focus
      // are fully preserved (Notion / Google Docs style).
      setBlocks((prev) =>
        prev.map((prevBlock, i) => {
          const s = serverSorted[i]
          if (!s) return prevBlock
          return {
            ...prevBlock,
            _id: s._id,
            // stableKey intentionally unchanged — preserves the React key so
            // Tiptap never unmounts/remounts and focus is never lost.
            ...(prevBlock.type === "image"
              ? { mediaUrl: s.mediaUrl, mediaType: s.mediaType, mediaId: s.mediaId, uploading: false }
              : {}),
          }
        }),
      )
      setSavedOk(true)
      setIsDirty(false)
      void qc.invalidateQueries({ queryKey: ["dayPage"] })
      void qc.invalidateQueries({ queryKey: ["feed"] })
    } catch (err: any) {
      setSaveError(err?.message || "Failed to save. Please try again.")
    } finally {
      setSaving(false)
      savingRef.current = false
    }
  }, [dateParam, qc])

  const scheduleSave = useCallback(() => {
    setIsDirty(true)
    setSavedOk(false)
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(doSave, 1000)
  }, [doSave])

  // ── Undo ──────────────────────────────────────────────────────────────────

  const pushUndo = useCallback((snapshot: EditorBlock[]) => {
    undoStack.current = [...undoStack.current.slice(-19), [...snapshot]]
    setCanUndo(true)
  }, [])

  const handleUndo = useCallback(() => {
    const prev = undoStack.current.pop()
    if (!prev) return
    setBlocks(prev)
    scheduleSave()
    setCanUndo(undoStack.current.length > 0)
  }, [scheduleSave])

  // ── Block mutations ───────────────────────────────────────────────────────

  const update = useCallback(
    (idx: number, patch: Partial<EditorBlock>) => {
      setBlocks((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)))
      scheduleSave()
    },
    [scheduleSave],
  )

  function openLinkPopup() {
    const ae = activeEditorRef.current
    const rect = linkBtnRef.current?.getBoundingClientRect()
    if (!rect) return
    const { from, to } = ae?.state?.selection ?? { from: 0, to: 0 }
    const selectedText = ae && from !== to ? ae.state.doc.textBetween(from, to, "") : ""
    const existingHref = ae?.isActive?.("link") ? (ae.getAttributes("link").href ?? "") : ""
    setLinkPopup({ title: selectedText, url: existingHref, rect })
  }

  function applyLink(title: string, url: string) {
    const ae = activeEditorRef.current
    if (!ae) { setLinkPopup(null); return }
    const trimUrl = url.trim()
    if (!trimUrl) { setLinkPopup(null); return }
    const href =
      trimUrl.startsWith("http://") || trimUrl.startsWith("https://") || trimUrl.startsWith("mailto:")
        ? trimUrl
        : `https://${trimUrl}`
    const trimTitle = title.trim()
    if (trimTitle) {
      ae.chain().focus()
        .deleteSelection()
        .insertContent({ type: "text", text: trimTitle, marks: [{ type: "link", attrs: { href, target: "_blank" } }] })
        .run()
    } else {
      ae.chain().focus().setLink({ href, target: "_blank" }).run()
    }
    setLinkPopup(null)
    scheduleSave()
  }

  const insertAfter = useCallback(
    (idx: number, type: BlockType = "text") => {
      setBlocks((prev) => {
        const newBlock = makeTempBlock(type, idx + 1)
        const next = [
          ...prev.slice(0, idx + 1),
          newBlock,
          ...prev.slice(idx + 1),
        ].map((b, i) => ({ ...b, order: i }))
        return next
      })
      scheduleSave()
      setTimeout(() => {
        inputRefs.current[idx + 1]?.current?.focus()
      }, 20)
    },
    [scheduleSave],
  )

  const remove = useCallback(
    (idx: number, focusPrev = true) => {
      pushUndo(blocksRef.current)
      setBlocks((prev) => {
        if (prev.length <= 1) {
          return [makeTempBlock("text", 0)]
        }
        return prev.filter((_, i) => i !== idx).map((b, i) => ({ ...b, order: i }))
      })
      scheduleSave()
      if (focusPrev && idx > 0) {
        setTimeout(() => {
          const target = inputRefs.current[idx - 1]?.current
          if (target) {
            target.focus()
            if ("setSelectionRange" in target) {
              const len = (target as HTMLTextAreaElement).value.length
              target.setSelectionRange(len, len)
            }
          }
        }, 20)
      }
    },
    [scheduleSave, pushUndo],
  )

  const removeById = useCallback(
    (id: string) => {
      pushUndo(blocksRef.current)
      setBlocks((prev) => {
        const idx = prev.findIndex((b) => b._id === id)
        if (idx === -1) return prev
        if (prev.length <= 1) {
          return [makeTempBlock("text", 0)]
        }
        return prev.filter((_, i) => i !== idx).map((b, i) => ({ ...b, order: i }))
      })
      scheduleSave()
    },
    [scheduleSave, pushUndo],
  )

  const addBlock = useCallback(
    (type: BlockType) => {
      const idx = blocksRef.current.length
      setBlocks((prev) => [...prev, makeTempBlock(type, idx)])
      scheduleSave()
      setTimeout(() => {
        inputRefs.current[idx]?.current?.focus()
      }, 20)
    },
    [scheduleSave],
  )

  // ── Task toggle ───────────────────────────────────────────────────────────

  async function toggleTask(idx: number) {
    const block = blocks[idx]
    if (!block) return
    const newCompleted = !block.completed
    update(idx, { completed: newCompleted })
    if (isPersistedId(block._id)) {
      await apiFetch(
        `${API_URL}/day-pages/${encodeURIComponent(dateParam)}/blocks/${block._id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: newCompleted }),
        },
      ).catch(() => {})
    }
  }

  // ── Media upload ──────────────────────────────────────────────────────────

  const imageBlocks = blocks.filter((b) => b.type === "image")
  // Only count blocks that have a working URL — broken/stranded blocks shouldn't
  // permanently prevent new uploads (they'll be purged on the next save anyway).
  const canAddMedia = imageBlocks.filter((b) => !b.uploading && b.mediaUrl).length < MAX_MEDIA

  async function handleMediaFiles(files: FileList | File[]) {
    const fileArr = Array.from(files)
    const persistedCount = imageBlocks.filter((b) => !b.uploading).length
    const uploadingCount = imageBlocks.filter((b) => b.uploading).length
    const slotsLeft = MAX_MEDIA - persistedCount - uploadingCount
    if (slotsLeft <= 0) return

    const toUpload = fileArr.slice(0, slotsLeft)
    const placeholderKeys = toUpload.map(() => newTempId())

    setBlocks((prev) => [
      ...prev,
      ...placeholderKeys.map((key, i) =>
        makeTempBlock("image", prev.length + i, { _id: key, stableKey: key, uploading: true }),
      ),
    ])

    try {
      const formData = new FormData()
      toUpload.forEach((f) => formData.append("files", f))
      const res = await apiFetch(
        `${API_URL}/day-pages/${encodeURIComponent(dateParam)}/media`,
        { method: "POST", body: formData },
      )
      if (!res.ok) throw new Error("Upload failed")
      const json = await res.json().catch(() => null)
      const updatedBlocks: any[] = json?.data?.blocks ?? []
      if (updatedBlocks.length > 0) {
        const serverSorted = [...updatedBlocks]
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map(blockFromRaw)
        // Find newly added image blocks in the server response
        setBlocks((prev) => {
          const prevIds = new Set(prev.map((b) => b._id).filter(Boolean))
          const newImageBlocks = serverSorted.filter(
            (b) => b.type === "image" && !prevIds.has(b._id),
          )
          let newIdx = 0
          return prev.map((b) => {
            if (b.type === "image" && b.uploading && placeholderKeys.includes(b._id!)) {
              return newImageBlocks[newIdx++] ?? b
            }
            return b
          })
        })
        setSavedOk(true)
        setIsDirty(false)
        void qc.invalidateQueries({ queryKey: ["dayPage"] })
        void qc.invalidateQueries({ queryKey: ["feed"] })
      }
    } catch {
      setBlocks((prev) => prev.filter((b) => !placeholderKeys.includes(b._id!)))
      setSaveError("Upload failed. Please try again.")
    }
  }

  // ── Keyboard handlers ─────────────────────────────────────────────────────

  function handleTaskKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      const block = blocksRef.current[idx]
      if (!block?.title) {
        setBlocks((prev) =>
          prev.map((b, i) =>
            i === idx
              ? { ...b, type: "text" as BlockType, content: "", title: undefined, completed: undefined }
              : b,
          ),
        )
        scheduleSave()
        setTimeout(() => inputRefs.current[idx]?.current?.focus(), 50)
      } else {
        insertAfter(idx, "task")
      }
    } else if (e.key === "Backspace") {
      const block = blocksRef.current[idx]
      if (!block?.title) {
        e.preventDefault()
        remove(idx)
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      focusNextBlock(idx)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      focusPrevBlock(idx)
    }
  }

  function handleEventTitleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      const block = blocksRef.current[idx]
      if (!block?.title) {
        setBlocks((prev) =>
          prev.map((b, i) =>
            i === idx
              ? { ...b, type: "text" as BlockType, content: "", title: undefined, description: undefined, dateStart: undefined, dateEnd: undefined }
              : b,
          ),
        )
        scheduleSave()
        setTimeout(() => inputRefs.current[idx]?.current?.focus(), 50)
      } else {
        const descInput = document.querySelector<HTMLInputElement>(
          `[data-event-desc="${block.stableKey}"]`,
        )
        descInput?.focus()
      }
    } else if (e.key === "Backspace") {
      const block = blocksRef.current[idx]
      if (!block?.title) {
        e.preventDefault()
        remove(idx)
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      focusNextBlock(idx)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      focusPrevBlock(idx)
    }
  }

  function handleEventDescKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      insertAfter(idx, "text")
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      focusNextBlock(idx)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      focusPrevBlock(idx)
    }
  }

  // ── Block reorder ─────────────────────────────────────────────────────────

  function moveBlockUp(idx: number) {
    let prevIdx = idx - 1
    while (prevIdx >= 0 && blocksRef.current[prevIdx]?.type === "image") prevIdx--
    if (prevIdx < 0) return
    pushUndo(blocksRef.current)
    setBlocks((prev) => {
      const next = [...prev]
      ;[next[idx], next[prevIdx]] = [next[prevIdx], next[idx]]
      return next.map((b, i) => ({ ...b, order: i }))
    })
    scheduleSave()
  }

  function moveBlockDown(idx: number) {
    let nextIdx = idx + 1
    while (nextIdx < blocksRef.current.length && blocksRef.current[nextIdx]?.type === "image") nextIdx++
    if (nextIdx >= blocksRef.current.length) return
    pushUndo(blocksRef.current)
    setBlocks((prev) => {
      const next = [...prev]
      ;[next[idx], next[nextIdx]] = [next[nextIdx], next[idx]]
      return next.map((b, i) => ({ ...b, order: i }))
    })
    scheduleSave()
  }

  // ── Block focus helpers ───────────────────────────────────────────────────

  function focusNextBlock(fromIdx: number) {
    for (let i = fromIdx + 1; i < blocksRef.current.length; i++) {
      if (blocksRef.current[i]?.type === "image") continue
      const ref = inputRefs.current[i]?.current
      if (ref) { ref.focus(); return }
    }
  }

  function focusPrevBlock(fromIdx: number) {
    for (let i = fromIdx - 1; i >= 0; i--) {
      if (blocksRef.current[i]?.type === "image") continue
      const ref = inputRefs.current[i]?.current
      if (ref) { ref.focus(); return }
    }
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setIsDragging(false)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setIsDragging(false)
    if (!canAddMedia) return
    const files = e.dataTransfer.files
    if (files.length) handleMediaFiles(files)
  }

  function saveNow() {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    doSave()
  }

  const saveStatus = saving
    ? "Saving…"
    : saveError
    ? saveError
    : savedOk && !isDirty
    ? "Saved"
    : isDirty
    ? "Unsaved changes"
    : ""

  const contentBlocks = blocks.filter((b) => b.type !== "image")
  const hasContent =
    contentBlocks.some(
      (b) =>
        (b.type === "text" && b.content) ||
        (b.type === "task" && b.title) ||
        (b.type === "event" && b.title),
    ) || imageBlocks.length > 0

  return (
    <div>
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleMediaFiles(e.target.files)
          e.target.value = ""
        }}
      />

      {/* Top bar: formatting toolbar + save */}
      <div className="flex items-center gap-2 px-3 py-2 sm:px-5 border-b border-(--dk-ink)/8 min-w-0">
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none min-w-0 flex-1">
          {(() => {
            const ae = activeEditorRef.current
            const btn = (active: boolean, onMD: () => void, t: string, children: React.ReactNode, wide?: boolean) => (
              <ToolbarBtn active={active} onMouseDown={(e) => { e.preventDefault(); onMD() }} title={t} wide={wide}>
                {children}
              </ToolbarBtn>
            )
            const isLink = ae?.isActive("link") ?? false
            return (
              <>
                {btn(ae?.isActive("bold") ?? false, () => ae?.chain().focus().toggleBold().run(), "Bold (⌘B)", <Bold size={12} strokeWidth={2.5} />)}
                {btn(ae?.isActive("italic") ?? false, () => ae?.chain().focus().toggleItalic().run(), "Italic (⌘I)", <Italic size={12} strokeWidth={2.5} />)}
                {btn(ae?.isActive("underline") ?? false, () => ae?.chain().focus().toggleUnderline().run(), "Underline (⌘U)", <UnderlineIcon size={12} strokeWidth={2.5} />)}
                {btn(ae?.isActive("strike") ?? false, () => ae?.chain().focus().toggleStrike().run(), "Strikethrough", <Strikethrough size={12} strokeWidth={2.5} />)}
                <div className="mx-1 h-3.5 w-px bg-(--dk-ink)/12" />
                {btn(ae?.isActive("code") ?? false, () => ae?.chain().focus().toggleCode().run(), "Inline code", <Code size={12} strokeWidth={2.5} />)}
                {btn(ae?.isActive("bulletList") ?? false, () => ae?.chain().focus().toggleBulletList().run(), "Bullet list", <List size={12} strokeWidth={2.5} />)}
                <div className="mx-1 h-3.5 w-px bg-(--dk-ink)/12" />
                {btn(ae?.isActive("heading", { level: 1 }) ?? false, () => ae?.chain().focus().toggleHeading({ level: 1 }).run(), "Heading 1", "H1", true)}
                {btn(ae?.isActive("heading", { level: 2 }) ?? false, () => ae?.chain().focus().toggleHeading({ level: 2 }).run(), "Heading 2", "H2", true)}
                <div className="mx-1 h-3.5 w-px bg-(--dk-ink)/12" />
                <button
                  ref={linkBtnRef}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); isLink ? ae?.chain().focus().unsetLink().run() : openLinkPopup() }}
                  title={isLink ? "Remove link" : "Insert link (/link)"}
                  className={[
                    "flex h-6 w-6 items-center justify-center rounded transition-colors",
                    isLink ? "bg-(--dk-sky)/15 text-(--dk-sky)" : "text-(--dk-slate) hover:bg-(--dk-mist) hover:text-(--dk-ink)",
                  ].join(" ")}
                >
                  {isLink ? <Link2Off size={12} strokeWidth={2.5} /> : <LinkIcon size={12} strokeWidth={2.5} />}
                </button>
              </>
            )
          })()}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            className="flex h-6 w-6 items-center justify-center rounded transition text-(--dk-slate) hover:bg-(--dk-mist) hover:text-(--dk-ink) disabled:opacity-20 disabled:cursor-default"
          >
            <RotateCcw size={13} />
          </button>
          {saveStatus && (
            <span
              className={[
                "text-xs",
                saveError
                  ? "text-(--dk-error)"
                  : savedOk && !isDirty
                  ? "text-(--dk-sky)"
                  : "text-(--dk-slate)",
              ].join(" ")}
            >
              {saveStatus}
            </span>
          )}
          <button
            type="button"
            onClick={saveNow}
            disabled={saving || !isDirty}
            className="rounded-md bg-(--dk-sky) px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-(--dk-sky)/90 disabled:opacity-30"
          >
            Save
          </button>
        </div>
      </div>

      {/* Document body — text/task/event blocks only */}
      <div className="px-3 py-3 sm:px-4">
        {blocks.map((block, idx) => {
          if (block.type === "image") return null

          const ref = inputRefs.current[idx] as React.RefObject<any>

          const contentBlocks = blocks.filter((b) => b.type !== "image")
          const posInContent = contentBlocks.findIndex((b) => b.stableKey === block.stableKey)
          const isFirst = posInContent === 0
          const isLast = posInContent === contentBlocks.length - 1

          const moveButtons = (
            <div className="shrink-0 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                tabIndex={-1}
                onClick={() => moveBlockUp(idx)}
                disabled={isFirst}
                className="flex h-4 w-4 items-center justify-center rounded text-(--dk-slate) hover:text-(--dk-ink) hover:bg-(--dk-mist) disabled:opacity-20 disabled:cursor-default transition"
                aria-label="Move up"
              >
                <ChevronUp size={12} />
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => moveBlockDown(idx)}
                disabled={isLast}
                className="flex h-4 w-4 items-center justify-center rounded text-(--dk-slate) hover:text-(--dk-ink) hover:bg-(--dk-mist) disabled:opacity-20 disabled:cursor-default transition"
                aria-label="Move down"
              >
                <ChevronDown size={12} />
              </button>
            </div>
          )

          if (block.type === "text") {
            return (
              <div key={block.stableKey} className="group flex items-start gap-1 py-1">
                <div className="mt-1">{moveButtons}</div>
                <div className="relative flex-1 min-w-0">
                  <TiptapEditor
                    ref={ref as React.RefObject<TiptapEditorHandle | null>}
                    content={block.content ?? ""}
                    onChange={(html) => update(idx, { content: html })}
                    onSlashCommand={(type: SlashCommandType) => {
                      if (type === "image") {
                        mediaInputRef.current?.click()
                      } else if (type === "list") {
                        activeEditorRef.current?.chain().focus().toggleBulletList().run()
                      } else if (type === "link") {
                        setTimeout(openLinkPopup, 0)
                      } else {
                        const isEmpty = activeEditorRef.current?.isEmpty ?? false
                        if (isEmpty) {
                          setBlocks((prev) =>
                            prev.map((b, i) =>
                              i === idx
                                ? {
                                    ...b,
                                    type: type as BlockType,
                                    content: undefined,
                                    title: type === "task" || type === "event" ? "" : undefined,
                                    completed: type === "task" ? false : undefined,
                                    description: type === "event" ? "" : undefined,
                                  }
                                : b,
                            ),
                          )
                          scheduleSave()
                          setTimeout(() => inputRefs.current[idx]?.current?.focus(), 50)
                        } else {
                          insertAfter(idx, type as BlockType)
                        }
                      }
                    }}
                    onBackspaceOnEmpty={() => remove(idx)}
                    onEditorFocus={(editor) => { activeEditorRef.current = editor }}
                    onSelectionChange={() => forceToolbarUpdate((v) => v + 1)}
                    onArrowDown={() => focusNextBlock(idx)}
                    onArrowUp={() => focusPrevBlock(idx)}
                    placeholder="Write something…"
                  />
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="absolute right-0 top-0 rounded p-1 text-(--dk-slate) opacity-0 transition hover:text-(--dk-error) group-hover:opacity-40 hover:!opacity-100"
                    aria-label="Remove"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )
          }

          if (block.type === "task") {
            return (
              <div key={block.stableKey} className="group flex items-center gap-1 py-1">
                {moveButtons}
                <button
                  type="button"
                  onClick={() => toggleTask(idx)}
                  className="shrink-0 focus:outline-none ml-0.5"
                  aria-label={block.completed ? "Mark incomplete" : "Mark complete"}
                >
                  {block.completed ? (
                    <CheckSquare size={17} className="text-(--dk-sky)" />
                  ) : (
                    <div className="h-[17px] w-[17px] rounded-[4px] border-2 border-(--dk-slate)/50" />
                  )}
                </button>
                <input
                  ref={ref}
                  type="text"
                  value={block.title ?? ""}
                  onChange={(e) => update(idx, { title: e.target.value })}
                  onKeyDown={(e) => handleTaskKeyDown(idx, e)}
                  placeholder="Task…"
                  className={[
                    "flex-1 bg-transparent text-[15px] outline-none mx-1.5",
                    block.completed ? "text-(--dk-slate) line-through" : "text-(--dk-ink)",
                  ].join(" ")}
                />
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="shrink-0 rounded p-1 text-(--dk-slate) opacity-0 transition hover:text-(--dk-error) group-hover:opacity-40 hover:!opacity-100"
                  aria-label="Remove"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )
          }

          if (block.type === "event") {
            return (
              <div key={block.stableKey} className="group flex items-start gap-1 my-1">
                <div className="mt-3">{moveButtons}</div>
                <div className="flex-1 rounded-lg bg-(--dk-mist)/40 px-3 py-2.5">
                  <div className="flex items-start gap-2.5">
                    <Calendar size={14} className="shrink-0 text-(--dk-sky) mt-0.5" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <input
                        ref={ref}
                        type="text"
                        value={block.title ?? ""}
                        onChange={(e) => update(idx, { title: e.target.value })}
                        onKeyDown={(e) => handleEventTitleKeyDown(idx, e)}
                        placeholder="Event title…"
                        className="w-full bg-transparent text-[15px] font-medium text-(--dk-ink) outline-none placeholder:text-(--dk-slate)/40"
                      />
                      <input
                        type="text"
                        data-event-desc={block.stableKey}
                        value={block.description ?? ""}
                        onChange={(e) => update(idx, { description: e.target.value })}
                        onKeyDown={(e) => handleEventDescKeyDown(idx, e)}
                        placeholder="Details (optional)…"
                        className="w-full bg-transparent text-xs text-(--dk-slate) outline-none placeholder:text-(--dk-slate)/40"
                      />
                      <div className="flex flex-wrap gap-3">
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[10px] uppercase tracking-wide text-(--dk-slate)/70">Start</label>
                          <input
                            type="datetime-local"
                            value={block.dateStart ? block.dateStart.slice(0, 16) : ""}
                            onChange={(e) =>
                              update(idx, {
                                dateStart: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                              })
                            }
                            className="rounded-md bg-(--dk-paper) px-2 py-1 text-xs text-(--dk-ink) outline-none border border-(--dk-ink)/10"
                          />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[10px] uppercase tracking-wide text-(--dk-slate)/70">End</label>
                          <input
                            type="datetime-local"
                            value={block.dateEnd ? block.dateEnd.slice(0, 16) : ""}
                            onChange={(e) =>
                              update(idx, {
                                dateEnd: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                              })
                            }
                            className="rounded-md bg-(--dk-paper) px-2 py-1 text-xs text-(--dk-ink) outline-none border border-(--dk-ink)/10"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      className="shrink-0 rounded p-1 text-(--dk-slate) opacity-0 transition hover:text-(--dk-error) group-hover:opacity-40 hover:!opacity-100"
                      aria-label="Remove"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )
          }

          return null
        })}
      </div>

      {/* Media gallery */}
      {(imageBlocks.length > 0 || canAddMedia) && (
        <div
          className="px-4 sm:px-5 pb-3 border-t border-(--dk-ink)/8 pt-3"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-medium text-(--dk-slate)">Photos &amp; Videos</span>
            <span className="text-[11px] text-(--dk-slate)/50">
              {imageBlocks.filter((b) => !b.uploading && b.mediaUrl).length}/{MAX_MEDIA}
            </span>
          </div>

          {imageBlocks.length === 0 ? (
            /* Empty drop zone */
            <button
              type="button"
              onClick={() => mediaInputRef.current?.click()}
              className={[
                "w-full rounded-xl border-2 border-dashed py-8 flex flex-col items-center justify-center gap-2 transition-all",
                isDragging
                  ? "border-(--dk-sky) bg-(--dk-sky)/8 text-(--dk-sky) scale-[1.01]"
                  : "border-(--dk-sky)/25 bg-(--dk-sky)/4 text-(--dk-sky)/60 hover:border-(--dk-sky)/55 hover:bg-(--dk-sky)/8 hover:text-(--dk-sky)",
              ].join(" ")}
            >
              <ImageIcon size={26} strokeWidth={1.5} />
              <div className="text-center">
                <p className="text-sm font-medium">
                  {isDragging ? "Drop to upload" : "Add photos & videos"}
                </p>
                <p className="text-xs opacity-60 mt-0.5">or drag and drop</p>
              </div>
            </button>
          ) : (
            /* Thumbnail row */
            <div className="relative">
              {isDragging && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-(--dk-sky)/10 border-2 border-dashed border-(--dk-sky) pointer-events-none">
                  <div className="flex flex-col items-center gap-1.5 text-(--dk-sky)">
                    <ImageIcon size={22} strokeWidth={1.5} />
                    <span className="text-sm font-medium">Drop to upload</span>
                  </div>
                </div>
              )}
              <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {imageBlocks.map((block) => {
                  if (block.uploading) {
                    return (
                      <div
                        key={block.stableKey}
                        className="shrink-0 h-28 w-28 rounded-xl border-2 border-dashed border-(--dk-sky)/30 bg-(--dk-sky)/5 flex flex-col items-center justify-center gap-1.5"
                      >
                        <Loader2 size={18} className="animate-spin text-(--dk-sky)" />
                        <span className="text-[10px] text-(--dk-sky)/60">Uploading…</span>
                      </div>
                    )
                  }
                  if (!block.mediaUrl) {
                    return (
                      <div
                        key={block.stableKey}
                        className="group relative shrink-0 h-28 w-28 rounded-xl bg-(--dk-mist)/60 flex items-center justify-center"
                      >
                        <ImageIcon size={20} className="text-(--dk-slate)/30" />
                        <button
                          type="button"
                          onClick={() => removeById(block._id!)}
                          className="absolute right-1 top-1 rounded-lg bg-(--dk-paper)/80 p-1 text-(--dk-slate) opacity-0 backdrop-blur-sm transition hover:text-(--dk-error) group-hover:opacity-100"
                          aria-label="Remove"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )
                  }
                  return (
                    <div key={block.stableKey} className="group relative shrink-0 h-28 w-28">
                      {block.mediaType === "video" ? (
                        <>
                          <video
                            src={block.mediaUrl}
                            className="h-28 w-28 rounded-xl object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/20 pointer-events-none">
                            <Play size={18} className="text-white" fill="white" />
                          </div>
                        </>
                      ) : (
                        <img
                          src={block.mediaUrl}
                          alt=""
                          className="h-28 w-28 rounded-xl object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeById(block._id!)}
                        className="absolute right-1 top-1 rounded-lg bg-(--dk-paper)/80 p-1 text-(--dk-slate) opacity-0 backdrop-blur-sm transition hover:text-(--dk-error) group-hover:opacity-100"
                        aria-label="Remove"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )
                })}

                {canAddMedia && (
                  <button
                    type="button"
                    onClick={() => mediaInputRef.current?.click()}
                    className="shrink-0 h-28 w-28 rounded-xl border-2 border-dashed border-(--dk-sky)/30 bg-(--dk-sky)/5 flex flex-col items-center justify-center gap-1.5 text-(--dk-sky)/60 hover:border-(--dk-sky)/60 hover:bg-(--dk-sky)/10 hover:text-(--dk-sky) transition-all"
                  >
                    <ImageIcon size={18} strokeWidth={1.5} />
                    <span className="text-[10px] font-medium">Add</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add bar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 sm:px-5 border-t border-(--dk-ink)/8">
        <div className="flex items-center gap-0.5">
          <span className="mr-1 text-(--dk-slate)/50">
            <Plus size={12} />
          </span>
          <button
            type="button"
            onClick={() => addBlock("task")}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-(--dk-slate) transition hover:bg-(--dk-mist) hover:text-(--dk-ink)"
          >
            <CheckSquare size={12} />
            Task
          </button>
          <button
            type="button"
            onClick={() => addBlock("event")}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-(--dk-slate) transition hover:bg-(--dk-mist) hover:text-(--dk-ink)"
          >
            <Calendar size={12} />
            Event
          </button>
        </div>
        <PrivacyPicker
          compact
          value={privacy}
          onChange={(v) => {
            setPrivacy(v)
            scheduleSave()
          }}
        />
      </div>

      {/* Link popup */}
      {linkPopup && (
        <LinkPopup
          rect={linkPopup.rect}
          initialTitle={linkPopup.title}
          initialUrl={linkPopup.url}
          onApply={applyLink}
          onClose={() => setLinkPopup(null)}
        />
      )}

    </div>
  )
}

// ── Link popup component ───────────────────────────────────────────────────

function LinkPopup({
  rect,
  initialTitle,
  initialUrl,
  onApply,
  onClose,
}: {
  rect: DOMRect
  initialTitle: string
  initialUrl: string
  onApply: (title: string, url: string) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(initialTitle)
  const [url, setUrl] = useState(initialUrl)
  const urlRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  // Auto-focus URL if title is pre-filled, otherwise title
  useEffect(() => {
    if (initialTitle) {
      urlRef.current?.focus()
      urlRef.current?.select()
    } else {
      titleRef.current?.focus()
    }
  }, [initialTitle])

  const left = Math.min(
    rect.left,
    typeof window !== "undefined" ? window.innerWidth - 300 : rect.left,
  )
  const top = rect.bottom + 6

  function submit() {
    if (!url.trim()) return
    onApply(title, url)
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popup */}
      <div
        className="fixed z-50 w-72 rounded-xl border border-(--dk-ink)/12 bg-(--dk-paper) shadow-xl p-3 space-y-2"
        style={{ top, left }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-(--dk-slate)/60">
          Insert link
        </p>

        {/* Title */}
        <div className="space-y-0.5">
          <label className="text-[11px] text-(--dk-slate)">Text</label>
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); urlRef.current?.focus() } if (e.key === "Escape") onClose() }}
            placeholder="Link text"
            className="w-full rounded-lg border border-(--dk-ink)/10 bg-(--dk-mist)/40 px-2.5 py-1.5 text-sm text-(--dk-ink) outline-none placeholder:text-(--dk-slate)/40 focus:border-(--dk-sky)/50 transition"
          />
        </div>

        {/* URL */}
        <div className="space-y-0.5">
          <label className="text-[11px] text-(--dk-slate)">URL</label>
          <input
            ref={urlRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit() } if (e.key === "Escape") onClose() }}
            placeholder="https://example.com"
            className="w-full rounded-lg border border-(--dk-ink)/10 bg-(--dk-mist)/40 px-2.5 py-1.5 text-sm text-(--dk-ink) outline-none placeholder:text-(--dk-slate)/40 focus:border-(--dk-sky)/50 transition"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-(--dk-slate) hover:bg-(--dk-mist) transition"
            aria-label="Cancel"
          >
            <X size={14} />
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!url.trim()}
            className="flex h-7 items-center gap-1.5 rounded-lg bg-(--dk-sky) px-3 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            <Check size={12} />
            Apply
          </button>
        </div>
      </div>
    </>
  )
}
