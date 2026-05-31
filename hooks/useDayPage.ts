"use client"

import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"

// Own page — returns empty shell if not yet created for the day
export function useOwnDayPage(dateParam: string) {
  return useQuery({
    queryKey: ["dayPage", "own", dateParam],
    enabled: !!dateParam,
    queryFn: async () => {
      const res = await apiFetch(
        `${API_URL}/day-pages/${encodeURIComponent(dateParam)}`,
        { method: "GET", cache: "no-store" },
      )
      if (!res.ok) return null
      const json = await res.json().catch(() => null)
      return json?.data ?? null
    },
    staleTime: 30_000,
  })
}

// Another user's page (includes likesCount, commentsCount, userLiked, isOwner)
export function useUserDayPage(username: string | null, dateParam: string) {
  return useQuery({
    queryKey: ["dayPage", username, dateParam],
    enabled: !!username && !!dateParam,
    queryFn: async () => {
      const res = await apiFetch(
        `${API_URL}/day-pages/user/${encodeURIComponent(username!)}/${encodeURIComponent(dateParam)}`,
        { method: "GET", cache: "no-store" },
      )
      if (!res.ok) return null
      const json = await res.json().catch(() => null)
      return json?.data ?? null
    },
    staleTime: 30_000,
  })
}
