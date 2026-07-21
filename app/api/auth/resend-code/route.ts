import { NextResponse } from "next/server"

import { API_URL } from "@/config"
import { checkRateLimit } from "@/lib/server/rateLimit"

export async function POST(req: Request) {
  const limited = checkRateLimit(req, "auth:resend-code", 3, 2 * 60_000)
  if (limited) return limited

  const body = await req.json().catch(() => null)
  const email = (body?.email as string | undefined)?.trim().toLowerCase()

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 })
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}/auth/resend_code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, type: "verify" }),
    })
  } catch {
    return NextResponse.json(
      { error: "Email service is temporarily unavailable" },
      { status: 503 },
    )
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    return NextResponse.json(
      { error: data?.message || data?.error || "Could not resend code" },
      { status: res.status },
    )
  }

  return NextResponse.json(
    { message: data?.message || "A new confirmation code was sent" },
    { status: 200 },
  )
}
