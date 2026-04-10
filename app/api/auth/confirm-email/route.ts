import { NextResponse } from "next/server"
import { API_URL } from "@/config"
import { checkRateLimit } from "@/lib/server/rateLimit"

export async function POST(req: Request) {
  const limited = checkRateLimit(req, "auth:confirm-email", 10, 60_000)
  if (limited) return limited

  const body = await req.json().catch(() => null)
  const email = (body?.email as string | undefined)?.trim()
  const code = (
    (body?.verificationCode as string | undefined) ??
    (body?.code as string | undefined)
  )?.trim()
  const deviceId = (body?.deviceId as string | undefined)?.trim()

  if (!email || !code) {
    return NextResponse.json(
      { error: "Missing email or code" },
      { status: 400 }
    )
  }

  const res = await fetch(`${API_URL}/auth/confirm-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      verificationCode: code,
      ...(deviceId ? { deviceId } : {}),
    }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    return NextResponse.json(
      { error: data?.message || data?.error || "Confirm failed" },
      { status: res.status }
    )
  }

  return NextResponse.json(
    { message: data?.message || "Email confirmed successfully" },
    { status: 200 }
  )
}
