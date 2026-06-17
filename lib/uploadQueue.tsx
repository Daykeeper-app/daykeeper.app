"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"

type UploadJob = {
  id: string
  status: "uploading" | "success" | "error"
  message?: string
  hasVideo?: boolean
  createdAt: number
}

type UploadQueueContextValue = {
  jobs: UploadJob[]
  enqueuePostUpload: (payload: {
    data: string
    privacy: string
    files: File[]
  }) => void
}

const UploadQueueContext = createContext<UploadQueueContextValue | null>(null)

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function UploadQueueProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient()
  const [jobs, setJobs] = useState<UploadJob[]>([])

  const enqueuePostUpload = useCallback(
    async ({ data, privacy, files }: { data: string; privacy: string; files: File[] }) => {
      const id = makeId()
      const hasVideo = files.some((f) => f.type.startsWith("video/"))
      const job: UploadJob = {
        id,
        status: "uploading",
        message: "Uploading post",
        hasVideo,
        createdAt: Date.now(),
      }

      setJobs((prev) => [job, ...prev])

      try {
        const fd = new FormData()
        fd.append("data", data.trim())
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

        setJobs((prev) =>
          prev.map((j) =>
            j.id === id
              ? {
                  ...j,
                  status: "success",
                  message: j.hasVideo ? "Post submitted — video under review" : "Post uploaded",
                }
              : j
          )
        )

        qc.invalidateQueries({ queryKey: ["feed"] })

        window.setTimeout(() => {
          setJobs((prev) => prev.filter((j) => j.id !== id))
        }, 2000)
      } catch (err: any) {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === id
              ? {
                  ...j,
                  status: "error",
                  message: err?.message || "Upload failed",
                }
              : j
          )
        )

        window.setTimeout(() => {
          setJobs((prev) => prev.filter((j) => j.id !== id))
        }, 4000)
      }
    },
    [qc]
  )

  const value = useMemo(
    () => ({ jobs, enqueuePostUpload }),
    [jobs, enqueuePostUpload]
  )

  return (
    <UploadQueueContext.Provider value={value}>
      {children}
    </UploadQueueContext.Provider>
  )
}

export function useUploadQueue() {
  const ctx = useContext(UploadQueueContext)
  if (!ctx) throw new Error("useUploadQueue must be used within UploadQueueProvider")
  return ctx
}
