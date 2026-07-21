// app/(app)/post/create/page.tsx
"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { ArrowLeft } from "lucide-react"

import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"
import RichTextarea from "@/components/common/RichTextarea"
import FormButton from "@/components/Form/FormButton"
import MediaDropzone from "@/components/Post/Create/MediaDropzone"
import PrivacyPicker, {
  type PrivacyValue,
} from "@/components/common/PrivacyPicker"
import { useUploadQueue } from "@/lib/uploadQueue"
import { toDDMMYYYY } from "@/lib/date"
import { LoadingSpinner } from "@/components/common/LoadingIndicator"

const MAX_FILES = 5

export default function CreatePostPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { enqueuePostUpload } = useUploadQueue()

  const [data, setData] = useState("")
  const [privacy, setPrivacy] = useState<PrivacyValue>("public")
  const [files, setFiles] = useState<File[]>([])

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmedData = data.trim()

  function goToTodayFeed() {
    router.replace(`/?date=${encodeURIComponent(toDDMMYYYY(new Date()))}`)
  }

  function openPicker() {
    fileInputRef.current?.click()
  }

  function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files || [])
    e.target.value = ""
    if (!list.length) return
    setError(null)

    const room = MAX_FILES - files.length
    if (room <= 0) {
      setError(`You can only upload up to ${MAX_FILES} files.`)
      return
    }

    setFiles((prev) => [...prev, ...list.slice(0, room)])
  }

  function addFiles(incoming: File[]) {
    if (!incoming.length) return
    setError(null)

    const room = MAX_FILES - files.length
    if (room <= 0) {
      setError(`You can only upload up to ${MAX_FILES} files.`)
      return
    }

    setFiles((prev) => [...prev, ...incoming.slice(0, room)])
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function submit() {
    if (busy) return
    setBusy(true)
    setError(null)

    try {
      if (!trimmedData) throw new Error("Post text is required.")
      if (files.length > MAX_FILES) {
        throw new Error(`You can only upload up to ${MAX_FILES} files.`)
      }

      if (files.length > 0) {
        enqueuePostUpload({ data, privacy, files })
        goToTodayFeed()
        return
      }

      const fd = new FormData()
      fd.append("data", trimmedData)
      fd.append("privacy", privacy)
      for (const f of files) fd.append("files", f)

      const res = await apiFetch(`${API_URL}/post/create`, {
        method: "POST",
        body: fd,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Request failed (${res.status})`)
      }

      goToTodayFeed()
    } catch (err: any) {
      setError(err?.message || "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="pb-20 lg:pb-0">
      <div className="mx-auto min-h-screen max-w-3xl bg-(--dk-paper) lg:border-x lg:border-(--dk-ink)/10">
        {/* top bar */}
        <div className="sticky top-0 z-10 border-b border-(--dk-ink)/10 bg-(--dk-paper)/96 backdrop-blur-md">
          <div className="h-0.5 w-full bg-(--dk-sky)/65" />
          <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <button
              onClick={() => router.back()}
              className="rounded-lg p-2 transition hover:bg-(--dk-mist)/75"
              aria-label="Back"
            >
              <ArrowLeft size={18} className="text-(--dk-ink)" />
            </button>

            <div className="leading-tight">
              <div className="text-sm font-semibold text-(--dk-ink)">
                Create post
              </div>
              <div className="text-xs text-(--dk-slate)">
                Text, media, privacy
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-4 py-4 sm:px-5">
          {error ? (
            <div className="rounded-lg bg-(--dk-mist)/45 p-3 text-sm text-(--dk-error)">
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
            onChange={onFilesSelected}
          />

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-(--dk-ink)">Post</label>
              <div className="text-xs text-(--dk-slate)">
                {data.length}/1000
              </div>
            </div>
            <div className="mt-2">
              <RichTextarea
                value={data}
                onChange={(value) => {
                  setData(value)
                  if (error && value.trim()) setError(null)
                }}
                placeholder="What happened today?"
                rows={4}
                maxLength={1000}
                showCount={false}
                renderPreview={false}
              />
            </div>
          </div>

          <MediaDropzone
            files={files}
            maxFiles={MAX_FILES}
            onPick={openPicker}
            onAddFiles={addFiles}
            onRemoveFile={removeFile}
          />

          <PrivacyPicker value={privacy} onChange={setPrivacy} />

          <FormButton
            type="button"
            onClick={submit}
            disabled={busy || files.length > MAX_FILES || !trimmedData}
          >
            {busy ? <LoadingSpinner /> : "Create post"}
          </FormButton>
        </div>
      </div>
    </main>
  )
}
