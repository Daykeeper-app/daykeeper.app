"use client"

import { useMemo } from "react"
import { UploadCloud, CheckCircle2, XCircle } from "lucide-react"
import { useUploadQueue } from "@/lib/uploadQueue"

export default function UploadStatusBar() {
  const { jobs } = useUploadQueue()

  const active = useMemo(
    () => jobs.filter((j) => j.status === "uploading"),
    [jobs]
  )
  const success = useMemo(
    () => jobs.filter((j) => j.status === "success"),
    [jobs]
  )
  const error = useMemo(
    () => jobs.find((j) => j.status === "error"),
    [jobs]
  )

  if (!jobs.length) return null

  const text = active.length
    ? `Uploading ${active.length} post${active.length > 1 ? "s" : ""}...`
    : success.length
      ? (success[0].message ?? "Post uploaded")
      : (error?.message ?? "Upload failed")

  return (
    <div className="px-4 pt-4">
      <div className="rounded-xl border border-(--dk-ink)/10 bg-(--dk-paper) px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-medium text-(--dk-ink)">
          {active.length ? (
            <UploadCloud size={14} className="text-(--dk-sky)" />
          ) : error ? (
            <XCircle size={14} className="text-(--dk-error)" />
          ) : (
            <CheckCircle2 size={14} className="text-(--dk-success)" />
          )}
          {text}
        </div>

        <div className="mt-2 h-1 rounded-full bg-(--dk-mist)">
          <div
            className={[
              "h-1 rounded-full",
              active.length ? "bg-(--dk-sky) animate-pulse w-2/3" : "bg-(--dk-success) w-full",
            ].join(" ")}
          />
        </div>
      </div>
    </div>
  )
}
