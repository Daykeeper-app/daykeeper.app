"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { GOOGLE_CLIENT_ID } from "@/config"

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any
  }
}

let gisPromise: Promise<void> | null = null

function loadGis(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.google?.accounts?.id) return Promise.resolve()
  if (gisPromise) return gisPromise

  gisPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("google-gsi-client")
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Identity Services"))
      )
      return
    }
    const s = document.createElement("script")
    s.id = "google-gsi-client"
    s.src = "https://accounts.google.com/gsi/client"
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () =>
      reject(new Error("Failed to load Google Identity Services"))
    document.head.appendChild(s)
  })

  return gisPromise
}

/*
  Renders the official Google Identity Services button. On a successful sign-in
  the GIS callback returns an ID token (credential) which we hand back to the
  parent via onCredential — the parent posts it to /api/auth/google.
*/
export default function GoogleSignInButton({
  onCredential,
  onError,
  text = "continue_with",
}: {
  onCredential: (idToken: string) => void | Promise<void>
  onError?: (msg: string) => void
  text?: "continue_with" | "signin_with" | "signup_with"
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  const handleCredential = useCallback(
    (resp: any) => {
      if (resp?.credential) onCredential(resp.credential)
      else onError?.("Google did not return a credential.")
    },
    [onCredential, onError]
  )

  useEffect(() => {
    let cancelled = false

    // Not configured: render nothing, stay silent (no user-facing error).
    if (!GOOGLE_CLIENT_ID) return

    loadGis()
      .then(() => {
        if (cancelled || !ref.current || !window.google?.accounts?.id) return

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredential,
          ux_mode: "popup",
        })

        ref.current.innerHTML = ""
        window.google.accounts.id.renderButton(ref.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text,
          shape: "pill",
          logo_alignment: "center",
          width: 320,
        })

        setReady(true)
      })
      .catch((e) => onError?.(e?.message || "Google sign-in failed to load"))

    return () => {
      cancelled = true
    }
  }, [handleCredential, onError, text])

  if (!GOOGLE_CLIENT_ID) return null

  return (
    <div
      ref={ref}
      aria-busy={!ready}
      className="flex w-full justify-center"
      style={{ minHeight: 44 }}
    />
  )
}
