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
  const limited = checkRateLimit(req, "auth:google", 10, 60_000)
  if (limited) return limited

  try {
    const body = await req.json().catch(() => null)
    const idToken = body?.idToken

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 })
    }

    const res = await fetch(`${API_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.message || "Google sign-in failed" },
        { status: res.status }
      )
    }

    const refreshToken = data?.refreshToken
    if (!refreshToken) {
      return NextResponse.json(
        { error: "Missing refreshToken from API" },
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
        accessToken: data?.accessToken,
      },
      { status: 200 }
    )

    out.cookies.set("refreshToken", refreshToken, refreshCookieOptions)

    return out
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
