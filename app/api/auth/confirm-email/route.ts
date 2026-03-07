import { NextResponse } from "next/server"
import { API_URL } from "@/config"
import { checkRateLimit } from "@/lib/server/rateLimit"

const isProd = process.env.NODE_ENV === "production"
const refreshCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 30 * 24 * 60 * 60, // seconds
}

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

  const refreshToken = data?.refreshToken as string | undefined
  const accessToken = data?.accessToken as string | undefined

  if (!refreshToken || !accessToken) {
    return NextResponse.json(
      { error: "Missing auth tokens from API" },
      { status: 500 }
    )
  }

  const rawUser = data?.user || null
  const normalizedUser = rawUser
    ? {
        ...rawUser,
        name: rawUser?.username ?? rawUser?.name,
        displayName: rawUser?.displayName ?? rawUser?.username ?? rawUser?.name,
      }
    : null

  const out = NextResponse.json(
    {
      message: data?.message,
      user: normalizedUser,
      accessToken,
    },
    { status: 200 }
  )

  out.cookies.set("refreshToken", refreshToken, refreshCookieOptions)

  return out
}
