"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { usePostDetail } from "@/hooks/usePostDetail"
import { useMe } from "@/lib/useMe"
import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"

import FormField from "@/components/Form/FormField"
import FormButton from "@/components/Form/FormButton"
import PrivacyPicker, {
  type PrivacyValue,
} from "@/components/common/PrivacyPicker"
import EditMediaDropzone from "@/components/Post/Edit/EditMediaDropzone"
import { resolveMainMediaUrl } from "@/lib/media"

const MAX_MEDIA = 5

type ExistingMedia = {
  _id: string
  url: string
  type: "image" | "video"
}

type PrivacyUi = PrivacyValue
type PrivacyApi = "public" | "close friends" | "private"

function uiToApiPrivacy(p: PrivacyUi): PrivacyApi {
  if (p === "close friends") return "close friends"
  return p
}

function apiToUiPrivacy(p: any): PrivacyUi {
  if (p === "close friends") return "close friends"
  return (p as PrivacyUi) || "public"
}

export default function EditPostPage() {
  const { postId } = useParams<{ postId: string }>()
  const router = useRouter()

  const q = usePostDetail(postId)
  const me = useMe()

  const post = q.data?.post
  const user = q.data?.user

  const isOwner =
    !!me?._id && !!user?._id && String(me._id) === String(user._id)

  const [content, setContent] = useState("")
  const [privacyUi, setPrivacyUi] = useState<PrivacyUi>("public")

  const [existingMedia, setExistingMedia] = useState<ExistingMedia[]>([])
  const [keepMediaIds, setKeepMediaIds] = useState<Set<string>>(new Set())

  const [newFiles, setNewFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // init from post
  useEffect(() => {
    if (!post) return

    setContent(post.content || "")
    setPrivacyUi(apiToUiPrivacy(post.privacy))

    const media: any = (post.media || [])
      .filter(Boolean)
      .map((m: any) => ({
        _id: String(m._id),
        url: String(resolveMainMediaUrl(m) || ""),
        type: m.type === "video" ? "video" : "image",
      }))
      .filter((m) => m._id && m.url)

    setExistingMedia(media)
    setKeepMediaIds(new Set(media.map((m: any) => m._id)))
    setNewFiles([])
    setError(null)
    setBusy(false)
  }, [post])

  const keptExisting = useMemo(
    () => existingMedia.filter((m) => keepMediaIds.has(m._id)),
    [existingMedia, keepMediaIds],
  )

  const totalAfter = useMemo(
    () => keepMediaIds.size + newFiles.length,
    [keepMediaIds.size, newFiles.length],
  )

  function openPicker() {
    fileInputRef.current?.click()
  }

  function removeExisting(mediaId: string) {
    setKeepMediaIds((prev) => {
      const next = new Set(prev)
      next.delete(String(mediaId))
      return next
    })
  }

  function removeNewFile(idx: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  function addNewFiles(incoming: File[]) {
    if (!incoming.length) return
    setError(null)

    const room = MAX_MEDIA - keepMediaIds.size - newFiles.length
    if (room <= 0) {
      setError(`You can only upload up to ${MAX_MEDIA} media items.`)
      return
    }

    setNewFiles((prev) => [...prev, ...incoming.slice(0, room)])
  }

  function onFilesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files || [])
    e.target.value = ""
    addNewFiles(list)
  }

  async function save() {
    if (!postId) return
    if (busy) return

    setBusy(true)
    setError(null)

    try {
      if (!content.trim() && totalAfter === 0) {
        throw new Error("Add some text or keep at least one media file.")
      }
      if (totalAfter > MAX_MEDIA) {
        throw new Error(`You can only upload up to ${MAX_MEDIA} media items.`)
      }

      const fd = new FormData()
      fd.append("data", content.trim())
      fd.append("privacy", uiToApiPrivacy(privacyUi))

      // backend expects stringified array
      fd.append("keepMediaIds", JSON.stringify(Array.from(keepMediaIds)))

      for (const f of newFiles) fd.append("files", f)

      const res = await apiFetch(`${API_URL}/post/${postId}`, {
        method: "PUT",
        body: fd,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Failed to update post (${res.status})`)
      }

      router.push(`/post/${postId}`)
      router.refresh()
    } catch (err: any) {
      setError(err?.message || "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  if (q.isLoading) {
    return (
      <main className="pb-20 lg:pb-0">
        <div className="max-w-2xl mx-auto border-x border-(--dk-ink)/10 bg-(--dk-paper) min-h-screen">
          <div className="px-4 py-6 text-sm text-(--dk-slate)">Loading…</div>
        </div>
      </main>
    )
  }

  if (!post || !user || !isOwner) {
    return (
      <main className="pb-20 lg:pb-0">
        <div className="max-w-2xl mx-auto border-x border-(--dk-ink)/10 bg-(--dk-paper) min-h-screen">
          <div className="px-4 py-6 text-sm text-red-500">
            You don’t have permission to edit this post.
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="pb-20 lg:pb-0">
      <div className="max-w-2xl mx-auto border-x border-(--dk-ink)/10 bg-(--dk-paper) min-h-screen">
        {/* top bar */}
        <div className="sticky top-0 bg-(--dk-paper)/95 backdrop-blur-md z-10">
          <div className="h-1 w-full bg-(--dk-sky)/70" />
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-(--dk-mist) transition"
              aria-label="Back"
            >
              <ArrowLeft size={18} className="text-(--dk-ink)" />
            </button>

            <div className="leading-tight">
              <div className="text-sm font-semibold text-(--dk-ink)">
                Edit post
              </div>
              <div className="text-xs text-(--dk-slate)">Make changes</div>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-5">
          {error ? (
            <div className="rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) p-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          {/* hidden input lives at page level */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={onFilesPicked}
          />

          <EditMediaDropzone
            keptExisting={keptExisting}
            keepMediaIds={keepMediaIds}
            newFiles={newFiles}
            maxMedia={MAX_MEDIA}
            onPick={openPicker}
            onAddNewFiles={addNewFiles}
            onRemoveExisting={removeExisting}
            onRemoveNewFile={removeNewFile}
          />

          <FormField
            label="Post"
            multiline
            maxLength={1000}
            textareaProps={{
              value: content,
              onChange: (e) => setContent(e.target.value),
              placeholder: "Update your post…",
            }}
          />

          <PrivacyPicker value={privacyUi} onChange={setPrivacyUi} />

          <FormButton
            type="button"
            onClick={save}
            disabled={busy || totalAfter > MAX_MEDIA}
          >
            {busy ? "Saving..." : "Save changes"}
          </FormButton>
        </div>
      </div>
    </main>
  )
}
