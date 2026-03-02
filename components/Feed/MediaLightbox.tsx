"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import type { FeedMedia } from "@/lib/feedTypes"
import {
  resolveMainMediaUrl,
  resolvePlayableVideoUrl,
  resolveThumbMediaUrl,
} from "@/lib/media"
import { useMediaUrlRecovery } from "@/hooks/useMediaUrlRecovery"

type Props = {
  open: boolean
  media: FeedMedia[]
  index: number
  onRefreshMedia?: (() => void | Promise<unknown>) | null
  entityKey?: string
  onClose: () => void
  onChangeIndex: (next: number) => void
}

export default function MediaLightbox({
  open,
  media,
  index,
  onRefreshMedia,
  entityKey = "media-lightbox",
  onClose,
  onChangeIndex,
}: Props) {
  const count = media.length
  const item = media[index]
  const rawUrl =
    item?.type === "video" ? resolvePlayableVideoUrl(item) : resolveMainMediaUrl(item)
  const poster = resolveThumbMediaUrl(item)
  const recovery = useMediaUrlRecovery({
    url: rawUrl,
    onRefresh: onRefreshMedia,
    entityKey: `${entityKey}:${item?._id || index}`,
  })

  // --- swipe state ---
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") onChangeIndex((index - 1 + count) % count)
      if (e.key === "ArrowRight") onChangeIndex((index + 1) % count)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, index, count, onClose, onChangeIndex])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || !item) return null

  function prev() {
    onChangeIndex((index - 1 + count) % count)
  }
  function next() {
    onChangeIndex((index + 1) % count)
  }

  // Swipe handlers (mobile)
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    startX.current = t.clientX
    startY.current = t.clientY
  }

  function onTouchEnd(e: React.TouchEvent) {
    const sx = startX.current
    const sy = startY.current
    startX.current = null
    startY.current = null
    if (sx == null || sy == null) return

    const t = e.changedTouches[0]
    const dx = t.clientX - sx
    const dy = t.clientY - sy

    // ignore mostly-vertical swipes (so scrolling doesn’t trigger)
    if (Math.abs(dy) > Math.abs(dx)) return

    const THRESH = 50
    if (dx > THRESH) prev()
    if (dx < -THRESH) next()
  }

  return (
    // BACKDROP (click closes)
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* IMPORTANT: this container does NOT stop clicks */}
      <div className="min-h-full w-full flex items-center justify-center p-4">
        {/* CONTENT BOX: stops click so it won’t close */}
        <div
          className="relative w-full max-w-5xl"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* top bar */}
          <div className="absolute -top-12 left-0 right-0 flex items-center justify-between">
            <div className="text-white/80 text-sm">
              {index + 1} / {count}
            </div>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onClose()
              }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* arrows */}
          {count > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  prev()
                }}
                className="absolute -left-12 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                aria-label="Previous media"
              >
                <ChevronLeft size={22} />
              </button>

              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  next()
                }}
                className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                aria-label="Next media"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}

          {/* media */}
          <div className="relative w-full overflow-hidden rounded-2xl bg-black">
            <div className="relative aspect-4/3 sm:aspect-video">
              {item.type === "video" ? (
                recovery.src ? (
                  <video
                    className="absolute inset-0 h-full w-full object-contain"
                    src={recovery.src}
                    poster={poster || undefined}
                    controls
                    autoPlay
                    onLoadedData={recovery.onLoad}
                    onError={() => {
                      void recovery.onError()
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-sm text-white/70">
                    Video unavailable
                  </div>
                )
              ) : (
                recovery.src ? (
                  <Image
                    src={recovery.src}
                    alt={item.title || "Media"}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 1000px"
                    priority
                    onLoad={recovery.onLoad}
                    onError={() => {
                      void recovery.onError()
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-sm text-white/70">
                    Media unavailable
                  </div>
                )
              )}
            </div>
          </div>

          {/* tiny hint for mobile */}
          {count > 1 ? (
            <div className="mt-3 text-center text-xs text-white/60">
              Swipe to change
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
