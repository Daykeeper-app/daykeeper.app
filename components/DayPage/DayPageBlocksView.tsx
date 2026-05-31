"use client"

import { CheckSquare, Square, CalendarDays, Play } from "lucide-react"
import type { DayPageBlock } from "@/lib/feedTypes"

function formatDateShort(iso?: string) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

type Props = {
  blocks: DayPageBlock[]
  maxBlocks?: number
}

export default function DayPageBlocksView({ blocks, maxBlocks }: Props) {
  const sorted = [...blocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const contentBlocks = sorted.filter((b) => b.type !== "image")
  const imageBlocks = sorted.filter((b) => b.type === "image")

  const visibleContent = maxBlocks != null ? contentBlocks.slice(0, maxBlocks) : contentBlocks
  const hiddenCount = contentBlocks.length - visibleContent.length

  const isEmpty = visibleContent.length === 0 && imageBlocks.length === 0

  if (isEmpty) {
    return (
      <div className="px-4 py-5 text-sm italic text-(--dk-slate)">
        Nothing written for this day yet.
      </div>
    )
  }

  return (
    <div className="py-1">
      {/* Content blocks: text / task / event */}
      {visibleContent.length > 0 && (
        <div className="space-y-0.5">
          {visibleContent.map((block, idx) => {
            const key = block._id || String(idx)

            if (block.type === "text") {
              return (
                <div
                  key={key}
                  className="tiptap-content px-4 py-1 text-[14px] leading-relaxed text-(--dk-ink)"
                  dangerouslySetInnerHTML={{ __html: block.content ?? "" }}
                />
              )
            }

            if (block.type === "task") {
              return (
                <div key={key} className="flex items-center gap-2.5 px-4 py-1">
                  {block.completed ? (
                    <CheckSquare size={14} className="shrink-0 text-(--dk-sky)" />
                  ) : (
                    <Square size={14} className="shrink-0 text-(--dk-slate)/60" />
                  )}
                  <span
                    className={[
                      "text-[14px]",
                      block.completed
                        ? "line-through text-(--dk-slate)"
                        : "text-(--dk-ink)",
                    ].join(" ")}
                  >
                    {block.title || "Untitled task"}
                  </span>
                </div>
              )
            }

            if (block.type === "event") {
              return (
                <div key={key} className="mx-4 my-1 rounded-lg bg-(--dk-mist)/50 px-3 py-2">
                  <div className="flex items-start gap-2">
                    <CalendarDays size={13} className="shrink-0 text-(--dk-sky) mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium text-(--dk-ink)">
                        {block.title || "Untitled event"}
                      </div>
                      {block.description ? (
                        <div className="text-xs text-(--dk-slate) mt-0.5 line-clamp-1">
                          {block.description}
                        </div>
                      ) : null}
                      {block.dateStart ? (
                        <div className="text-xs text-(--dk-slate) mt-0.5">
                          {formatDateShort(block.dateStart)}
                          {block.dateEnd ? ` → ${formatDateShort(block.dateEnd)}` : ""}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            }

            return null
          })}
        </div>
      )}

      {hiddenCount > 0 && (
        <p className="px-4 pt-1.5 text-xs text-(--dk-slate)">
          +{hiddenCount} more…
        </p>
      )}

      {/* Image / video gallery */}
      {imageBlocks.length > 0 && (
        <div className="mt-2 px-4">
          <div
            className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {imageBlocks.map((block, idx) => {
              const imgUrl = block.media?.urls?.main
              if (!imgUrl) return null
              const isVideo = (block.media as any)?.type === "video"

              return (
                <div
                  key={block._id || String(idx)}
                  className="relative shrink-0 h-36 w-36 rounded-xl overflow-hidden bg-(--dk-mist)"
                >
                  {isVideo ? (
                    <>
                      <video
                        src={imgUrl}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                        <Play size={20} className="text-white" fill="white" />
                      </div>
                    </>
                  ) : (
                    <img
                      src={imgUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
