import { NextResponse } from "next/server"

import { API_URL } from "@/config"
import { checkRateLimit } from "@/lib/server/rateLimit"

export async function POST(req: Request) {
  const limited = checkRateLimit(req, "auth:2fa-resend", 5, 60_000)
  if (limited) return limited

  try {
    const body = await req.json()

    const res = await fetch(`${API_URL}/auth/2fa/resend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId: body?.challengeId }),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.message || "Could not resend code" },
        { status: res.status }
      )
    }

    return NextResponse.json({ message: data?.message }, { status: 200 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
