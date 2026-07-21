import { cookies } from "next/headers"
import { randomUUID } from "crypto"

const isProd = process.env.NODE_ENV === "production"

// A stable per-browser identifier used for new-device detection and trusted
// devices. Long-lived, httpOnly so client JS can't read or tamper with it.
export const deviceCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 400 * 24 * 60 * 60, // ~400 days (browser cap)
}

// Returns the existing device id from the cookie, or a freshly generated one.
// When `isNew` is true the caller must persist it on the response via
// out.cookies.set("dk_device", deviceId, deviceCookieOptions).
export async function getOrCreateDeviceId(): Promise<{
  deviceId: string
  isNew: boolean
}> {
  const store = await cookies()
  const existing = store.get("dk_device")?.value
  if (existing) return { deviceId: existing, isNew: false }
  return { deviceId: randomUUID(), isNew: true }
}
