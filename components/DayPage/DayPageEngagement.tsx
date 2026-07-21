"use client"

import { useCallback, useState } from "react"

import DayPageComments from "@/components/DayPage/DayPageComments"
import DayPageLikeBar from "@/components/DayPage/DayPageLikeBar"

type Props = {
  pageId: string
  pageOwnerUsername: string
  likesCount: number
  commentsCount: number
  userLiked: boolean
}

export default function DayPageEngagement({
  pageId,
  pageOwnerUsername,
  likesCount,
  commentsCount,
  userLiked,
}: Props) {
  const [visibleCommentsCount, setVisibleCommentsCount] = useState(commentsCount)
  const focusComments = useCallback(() => {
    const composer = document.getElementById("day-page-comments-composer")
    composer?.scrollIntoView({ behavior: "smooth", block: "center" })
    window.setTimeout(() => {
      composer?.querySelector<HTMLElement>("[contenteditable='true'], textarea")?.focus()
    }, 350)
  }, [])

  return (
    <div className="border-t border-(--dk-ink)/10">
      <DayPageLikeBar
        pageId={pageId}
        likesCount={likesCount}
        commentsCount={visibleCommentsCount}
        userLiked={userLiked}
        onCommentClick={focusComments}
      />
      <DayPageComments
        pageId={pageId}
        pageOwnerUsername={pageOwnerUsername}
        onCountChange={setVisibleCommentsCount}
      />
    </div>
  )
}
