import { queryClient } from "@/lib/queryClient"
import { normalizeBsonIds } from "@/lib/normalizeBson"

let accessToken: string | null = null
let refreshing: Promise<string | null> | null = null
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])
const KEEPALIVE_BODY_LIMIT_BYTES = 60_000

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

export async function logoutClient(reason?: string, redirect = true) {
  setAccessToken(null)
  await queryClient.cancelQueries()
  queryClient.clear()

  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    })
  } catch {}

  if (redirect) {
    window.location.href = "/login"
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshing) return refreshing

  refreshing = (async () => {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    })

    if (!res.ok) return null

    const data = await res.json().catch(() => null)
    const newToken = data?.accessToken as string | undefined
    if (!newToken) return null

    setAccessToken(newToken)
    return newToken
  })()

  try {
    return await refreshing
  } finally {
    refreshing = null
  }
}

function mergeHeaders(initHeaders?: HeadersInit): Headers {
  const h = new Headers(initHeaders || {})
  if (accessToken) h.set("Authorization", `Bearer ${accessToken}`)
  return h
}

function shouldResetCache(method?: string) {
  const normalized = (method || "GET").toUpperCase()
  return MUTATION_METHODS.has(normalized)
}

function getBodySize(body: RequestInit["body"]) {
  if (body == null) return 0
  if (typeof body === "string") return new TextEncoder().encode(body).length
  if (
    typeof URLSearchParams !== "undefined" &&
    body instanceof URLSearchParams
  ) {
    return new TextEncoder().encode(body.toString()).length
  }
  if (typeof Blob !== "undefined" && body instanceof Blob) return body.size
  if (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer) {
    return body.byteLength
  }
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(body)) {
    return body.byteLength
  }

  // FormData/ReadableStream are not safe candidates for keepalive here.
  return null
}

function shouldUseBackgroundKeepalive(
  method: string,
  init: RequestInit,
): boolean {
  if (!MUTATION_METHODS.has(method)) return false
  if (typeof window === "undefined") return false
  if (init.keepalive !== undefined) return init.keepalive

  const bodySize = getBodySize(init.body)
  if (bodySize == null) return false

  // Browsers enforce a small keepalive payload budget (~64 KB).
  return bodySize <= KEEPALIVE_BODY_LIMIT_BYTES
}

function withNormalizedJson<T extends Response>(res: T): T {
  return new Proxy(res, {
    get(target, prop) {
      if (prop === "json") {
        return async () => {
          const payload = await target.clone().json().catch(() => null)
          return normalizeBsonIds(payload)
        }
      }
      const value = Reflect.get(target, prop, target)
      if (typeof value === "function") return value.bind(target)
      return value
    },
  }) as T
}

// Use APi (ONLY for Post/Put/Delete) Use query for GET
export async function apiFetch(url: string, init: RequestInit = {}) {
  const requestMethod = (init.method || "GET").toUpperCase()
  const useKeepalive = shouldUseBackgroundKeepalive(requestMethod, init)
  const maybeResetCache = (res: Response) => {
    if (res.ok && shouldResetCache(requestMethod)) {
      // Global invalidation avoids stale UI after create/update/delete operations.
      void queryClient.invalidateQueries().catch(() => {})
    }
  }

  const doFetch = () =>
    fetch(url, {
      ...init,
      credentials: "include",
      keepalive: useKeepalive,
      headers: mergeHeaders(init.headers),
    })

  let res = await doFetch()
  if (res.status !== 401) {
    maybeResetCache(res)
    return withNormalizedJson(res)
  }

  const newToken = await refreshAccessToken()
  if (!newToken) {
    await logoutClient("Session expired")
    throw new Error("Session expired")
  }

  res = await doFetch()

  if (res.status === 401) {
    await logoutClient("Session expired")
    throw new Error("Session expired")
  }

  maybeResetCache(res)

  return withNormalizedJson(res)
}

export const authClient = { setAccessToken, getAccessToken }
