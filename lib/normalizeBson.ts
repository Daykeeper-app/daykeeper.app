function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false
  return Object.getPrototypeOf(value) === Object.prototype
}

function bytesToHex(bytes: number[]): string {
  return bytes.map((n) => Number(n).toString(16).padStart(2, "0")).join("")
}

function isBufferLike(value: unknown): value is { type: "Buffer"; data: unknown[] } {
  if (!isPlainObject(value)) return false
  return value.type === "Buffer" && Array.isArray(value.data)
}

function isOidLike(value: unknown): value is { $oid: unknown } {
  if (!isPlainObject(value)) return false
  return "$oid" in value
}

export function normalizeBsonIds<T>(input: T): T {
  const seen = new WeakMap<object, unknown>()

  const walk = (value: unknown): unknown => {
    if (value == null) return value
    if (typeof value !== "object") return value

    if (isOidLike(value)) {
      const oid = (value as { $oid?: unknown }).$oid
      if (typeof oid === "string" || typeof oid === "number") return String(oid)
    }

    if (isBufferLike(value)) {
      const bytes = value.data.filter((n) => Number.isFinite(n)) as number[]
      if (!bytes.length) return ""
      return bytesToHex(bytes)
    }

    if (Array.isArray(value)) {
      return value.map((v) => walk(v))
    }

    if (!isPlainObject(value)) return value

    if (seen.has(value)) return seen.get(value)

    const out: Record<string, unknown> = {}
    seen.set(value, out)

    for (const [k, v] of Object.entries(value)) {
      out[k] = walk(v)
    }

    return out
  }

  return walk(input) as T
}

