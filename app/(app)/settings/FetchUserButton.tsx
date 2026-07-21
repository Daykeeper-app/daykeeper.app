"use client"

import { useState } from "react"
import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"
import { LoadingSpinner } from "@/components/common/LoadingIndicator"

export default function FetchUserButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  const fetchUser = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await apiFetch(`${API_URL}/auth/user`)

      if (!res.ok) {
        throw new Error("Failed to fetch user")
      }

      const data = await res.json()
      setUser(data.user ?? data)
    } catch (err: any) {
      setError(err.message || "Error fetching user")
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={fetchUser}
        disabled={loading}
        className={[
          "rounded-md border px-4 py-2 text-sm font-medium transition cursor-pointer",
          "border-(--dk-ink)/10 bg-(--dk-paper) text-(--dk-ink)",
          "hover:bg-(--dk-mist)",
          loading ? "opacity-60 cursor-not-allowed" : "",
        ].join(" ")}
        type="button"
      >
        {loading ? <LoadingSpinner size={16} /> : "Fetch logged user"}
      </button>

      {error && (
        <div className="text-sm">
          <span className="font-semibold text-(--dk-ink)">Error:</span>{" "}
          <span className="text-(--dk-slate)">{error}</span>
        </div>
      )}

      {user && (
        <pre className="rounded-md border border-(--dk-ink)/10 bg-(--dk-mist) p-4 text-xs overflow-auto text-(--dk-ink)">
          {JSON.stringify(user, null, 2)}
        </pre>
      )}
    </div>
  )
}
