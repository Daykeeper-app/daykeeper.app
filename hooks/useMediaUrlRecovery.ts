"use client"

import { useCallback, useMemo, useState } from "react"
import { hasCloudFrontSignature, logMediaEvent } from "@/lib/media"

type Params = {
  url: string | null
  entityKey: string
  onRefresh?: (() => void | Promise<unknown>) | null
}

function appendRetryParam(raw: string): string {
  try {
    const u = new URL(raw)
    u.searchParams.set("dk_retry", String(Date.now()))
    return u.toString()
  } catch {
    const sep = raw.includes("?") ? "&" : "?"
    return `${raw}${sep}dk_retry=${Date.now()}`
  }
}

export function useMediaUrlRecovery({ url, entityKey, onRefresh }: Params) {
  const [attemptedFor, setAttemptedFor] = useState<string | null>(null)
  const [failedFor, setFailedFor] = useState<string | null>(null)
  const [successLoggedFor, setSuccessLoggedFor] = useState<string | null>(null)
  const [retryUrl, setRetryUrl] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const failed = !!url && failedFor === url

  const src = useMemo(() => {
    if (!url || failed) return null
    if (attemptedFor === url && retryUrl) return retryUrl
    return url
  }, [attemptedFor, failed, retryUrl, url])

  const onLoad = useCallback(() => {
    if (!url) return
    if (attemptedFor !== url) return
    if (failedFor === url) return
    if (successLoggedFor === url) return

    logMediaEvent("media_url_retry_success", {
      entityKey,
      signed: hasCloudFrontSignature(url),
    })
    setSuccessLoggedFor(url)
  }, [attemptedFor, entityKey, failedFor, successLoggedFor, url])

  const onError = useCallback(async () => {
    if (!url || refreshing) return

    // First failure: refresh owner resource once.
    if (attemptedFor !== url) {
      setAttemptedFor(url)
      setFailedFor(null)
      setSuccessLoggedFor(null)
      setRetryUrl(appendRetryParam(url))
      logMediaEvent("media_url_expired_retry", {
        entityKey,
        signed: hasCloudFrontSignature(url),
      })

      setRefreshing(true)
      try {
        if (onRefresh) await onRefresh()
      } catch {}
      setRefreshing(false)
      return
    }

    // Second failure: stop retrying and show fallback.
    setFailedFor(url)
    logMediaEvent("media_url_retry_failed", {
      entityKey,
      signed: hasCloudFrontSignature(url),
    })
  }, [attemptedFor, entityKey, onRefresh, refreshing, url])

  return {
    src,
    failed,
    onLoad,
    onError,
  }
}
