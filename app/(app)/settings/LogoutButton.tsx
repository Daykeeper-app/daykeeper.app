"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoadingSpinner } from "@/components/common/LoadingIndicator"

export default function LogoutButton({
  className,
  children = "Logout",
}: {
  className?: string
  children?: React.ReactNode
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const onLogout = async () => {
    if (loading) return
    setLoading(true)

    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.replace("/login")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={onLogout}
      disabled={loading}
      className={[
        className ?? "",
        loading ? "opacity-60 cursor-not-allowed" : "",
      ].join(" ")}
      type="button"
    >
      {loading ? <LoadingSpinner size={16} /> : children}
    </button>
  )
}
