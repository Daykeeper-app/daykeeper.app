"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useMe } from "@/lib/useMe"
import ProfileHeaderSkeleton from "@/components/User/ProfileHeaderSkeleton"
import ProfileDaySkeleton from "@/components/User/ProfileDaySkeleton"

export default function AppEntryPage() {
  const router = useRouter()
  const me = useMe()

  useEffect(() => {
    if (!me?.username) return
    router.replace(`/${me.username}`)
  }, [me?.username, router])

  return (
    <main className="pb-20 lg:pb-0">
      <div className="mx-auto min-h-screen max-w-3xl bg-(--dk-paper) lg:border-x lg:border-(--dk-ink)/10">
        <ProfileHeaderSkeleton />
        <ProfileDaySkeleton />
      </div>
    </main>
  )
}
