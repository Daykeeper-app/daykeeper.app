"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import type { FeedMedia } from "@/lib/feedTypes"
import MediaLightbox from "./MediaLightbox"
import {
  resolveMainMediaUrl,
  resolvePlayableVideoUrl,
  resolveThumbMediaUrl,
} from "@/lib/media"
import { useMediaUrlRecovery } from "@/hooks/useMediaUrlRecovery"

export default function FeedPostMediaStrip({
  media,
  onRefreshMedia,
  entityKey = "media-strip",
}: {
  media?: FeedMedia[]
  onRefreshMedia?: (() => void | Promise<unknown>) | null
  entityKey?: string
}) {
  const items = useMemo(() => (Array.isArray(media) ? media : []), [media])
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  if (items.length === 0) return null

  const openAt = (i: number) => {
    setIndex(i)
    setOpen(true)
  }

  return (
    <div
      className="mt-3"
      // don’t preventDefault here; let scrolling work
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="
          flex gap-3 overflow-x-auto pb-2
          [-ms-overflow-style:none] [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden
          snap-x snap-mandatory
        "
      >
        {items.map((m, i) => (
          <MediaTile
            key={m._id || `${entityKey}-${i}`}
            media={m}
            onOpen={(e) => {
              e.preventDefault()
              e.stopPropagation()
              openAt(i)
            }}
            onRefreshMedia={onRefreshMedia}
            entityKey={`${entityKey}:${m._id || i}`}
          />
        ))}
      </div>

      <MediaLightbox
        open={open}
        media={items}
        onRefreshMedia={onRefreshMedia}
        entityKey={entityKey}
        index={index}
        onClose={() => setOpen(false)}
        onChangeIndex={(next) => setIndex(next)}
      />
    </div>
  )
}

function MediaTile({
  media,
  onOpen,
  onRefreshMedia,
  entityKey,
}: {
  media: FeedMedia
  onOpen: (e: React.MouseEvent<HTMLButtonElement>) => void
  onRefreshMedia?: (() => void | Promise<unknown>) | null
  entityKey: string
}) {
  const mediaUrl =
    media.type === "video"
      ? resolvePlayableVideoUrl(media)
      : resolveMainMediaUrl(media)
  const poster = resolveThumbMediaUrl(media)
  const isVideo = media.type === "video"
  const recovery = useMediaUrlRecovery({
    url: mediaUrl,
    onRefresh: onRefreshMedia,
    entityKey,
  })

  return (
    <button
      type="button"
      onClick={onOpen}
      className="
        relative shrink-0 snap-start
        h-44 w-72 sm:h-52 sm:w-80
        rounded-lg overflow-hidden
        border border-(--dk-ink)/10
        bg-(--dk-mist)
        focus:outline-none focus:ring-2 focus:ring-(--dk-sky)/60
        cursor-pointer
      "
      aria-label="Open media"
    >
      {recovery.src ? (
        isVideo ? (
          <video
            className="h-full w-full object-cover"
            src={recovery.src}
            poster={poster || undefined}
            muted
            playsInline
            preload="metadata"
            onLoadedData={recovery.onLoad}
            onError={() => {
              void recovery.onError()
            }}
          />
        ) : (
          <Image
            src={recovery.src}
            alt={media.title || "Post media"}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 288px, 320px"
            onLoad={recovery.onLoad}
            onError={() => {
              void recovery.onError()
            }}
          />
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-(--dk-mist) text-xs text-(--dk-slate)">
          Media unavailable
        </div>
      )}

      {isVideo ? <div className="absolute inset-0 bg-black/15" /> : null}
    </button>
  )
}
