import { NextResponse } from "next/server"
import { headers } from "next/headers"

import { API_URL } from "@/config"
import { checkRateLimit } from "@/lib/server/rateLimit"
import { getOrCreateDeviceId, deviceCookieOptions } from "@/lib/server/deviceId"

const isProd = process.env.NODE_ENV === "production"
const refreshCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 30 * 24 * 60 * 60,
}

export async function POST(req: Request) {
  const limited = checkRateLimit(req, "auth:2fa-verify", 20, 60_000)
  if (limited) return limited

  try {
    const body = await req.json()
    const { deviceId, isNew: deviceIsNew } = await getOrCreateDeviceId()
    const h = await headers()

    const res = await fetch(`${API_URL}/auth/2fa/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": h.get("user-agent") ?? "",
        "X-Forwarded-For": h.get("x-forwarded-for") ?? "",
      },
      body: JSON.stringify({
        challengeId: body?.challengeId,
        code: body?.code,
        trustDevice: body?.trustDevice === true,
        deviceId,
      }),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.message || "Verification failed" },
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
    if (deviceIsNew) out.cookies.set("dk_device", deviceId, deviceCookieOptions)

    return out
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
