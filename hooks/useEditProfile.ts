"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/authClient"
import { API_URL } from "@/config"

import type { ApiAuthUser } from "@/lib/types/edit_profile"
import { resolveProfilePictureUrl } from "@/lib/media"
import {
  formDataHasAnyField,
  readJsonSafe,
  safeApiMessage,
  sameString,
} from "@/lib/utils/edit_profile"

const DEFAULT_PFP = "/defaultPFP.jpg"

export function useEditProfile() {
  const router = useRouter()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [user, setUser] = useState<ApiAuthUser["user"] | null>(null)

  // server snapshot
  const serverUsername = useMemo(
    () => String(user?.username || ""),
    [user?.username]
  )
  const serverDisplayName = useMemo(
    () => String(user?.displayName || ""),
    [user?.displayName]
  )
  const serverBio = useMemo(() => String(user?.bio || ""), [user?.bio])
  const serverTZ = useMemo(() => String(user?.timeZone || ""), [user?.timeZone])
  const serverAvatarUrl = useMemo(
    () => resolveProfilePictureUrl(user, ""),
    [user]
  )

  // draft
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [timeZone, setTimeZone] = useState("")

  // avatar draft (preview only until Save)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarResetQueued, setAvatarResetQueued] = useState(false)

  const avatarSrc = useMemo(() => {
    if (avatarPreview) return avatarPreview
    if (avatarResetQueued) return DEFAULT_PFP
    return serverAvatarUrl || DEFAULT_PFP
  }, [avatarPreview, avatarResetQueued, serverAvatarUrl])

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setError(null)
      setSuccess(null)

      try {
        const res = await apiFetch(`${API_URL}/auth/user`, { method: "GET" })
        const json = await readJsonSafe<ApiAuthUser>(res)
        if (!res.ok) throw new Error(json?.message || "Failed to load user.")

        const u = json?.user || null
        if (!mounted) return

        setUser(u)
        setUsername(String(u?.username || ""))
        setDisplayName(String(u?.displayName || ""))
        setBio(String(u?.bio || ""))
        setTimeZone(String(u?.timeZone || ""))

        setAvatarFile(null)
        if (avatarPreview && avatarPreview.startsWith("blob:")) {
          URL.revokeObjectURL(avatarPreview)
        }
        setAvatarPreview(null)
        setAvatarResetQueued(false)
        if (fileRef.current) fileRef.current.value = ""
      } catch (e: any) {
        if (!mounted) return
        setError(safeApiMessage(e))
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  function pickAvatar() {
    fileRef.current?.click()
  }

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.")
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("Image is too big. Max 8MB.")
      return
    }

    setError(null)
    setSuccess(null)

    if (avatarPreview && avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview)
    }

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setAvatarResetQueued(false)
  }

  function queueResetAvatar() {
    setError(null)
    setSuccess(null)

    setAvatarFile(null)
    if (avatarPreview && avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview)
    }
    setAvatarPreview(null)
    if (fileRef.current) fileRef.current.value = ""
    setAvatarResetQueued(true)
  }

  function undoAvatarChange() {
    setError(null)
    setSuccess(null)

    setAvatarFile(null)
    if (avatarPreview && avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview)
    }
    setAvatarPreview(null)
    if (fileRef.current) fileRef.current.value = ""
    setAvatarResetQueued(false)
  }

  function buildFormDataOnlyChanges() {
    const fd = new FormData()

    if (!sameString(username, serverUsername))
      fd.append("username", username.trim())
    if (!sameString(displayName, serverDisplayName))
      fd.append("displayName", displayName.trim())
    if (!sameString(bio, serverBio)) fd.append("bio", bio.trim())
    if (!sameString(timeZone, serverTZ) && timeZone.trim())
      fd.append("timeZone", timeZone.trim())
    if (avatarFile) fd.append("file", avatarFile)

    return fd
  }

  const dirty = useMemo(() => {
    const profileDirty =
      !sameString(username, serverUsername) ||
      !sameString(displayName, serverDisplayName) ||
      !sameString(bio, serverBio) ||
      (!!timeZone.trim() && !sameString(timeZone, serverTZ))

    const avatarDirty = !!avatarFile || avatarResetQueued
    return profileDirty || avatarDirty
  }, [
    username,
    displayName,
    bio,
    timeZone,
    avatarFile,
    avatarResetQueued,
    serverUsername,
    serverDisplayName,
    serverBio,
    serverTZ,
  ])

  function discardAll() {
    setUsername(serverUsername)
    setDisplayName(serverDisplayName)
    setBio(serverBio)
    setTimeZone(serverTZ)
    undoAvatarChange()
    setError(null)
    setSuccess(null)
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      if (avatarResetQueued) {
        const resReset = await apiFetch(`${API_URL}/reset_profile_picture`, {
          method: "PUT",
        })
        const jsonReset = await readJsonSafe<{ message?: string }>(resReset)
        if (!resReset.ok) {
          throw new Error(
            jsonReset?.message || "Failed to reset profile picture."
          )
        }
      }

      const fd = buildFormDataOnlyChanges()
      const hasUpdates = formDataHasAnyField(fd)

      if (hasUpdates) {
        const res = await apiFetch(`${API_URL}/user`, {
          method: "PUT",
          body: fd,
        })
        const json = await readJsonSafe<{ message?: string }>(res)
        if (!res.ok)
          throw new Error(json?.message || "Failed to update profile.")
      }

      const resMe = await apiFetch(`${API_URL}/auth/user`, { method: "GET" })
      const jsonMe = await readJsonSafe<ApiAuthUser>(resMe)
      if (!resMe.ok)
        throw new Error(jsonMe?.message || "Failed to reload user.")

      const fresh = jsonMe?.user || null
      setUser(fresh)

      setUsername(String(fresh?.username || ""))
      setDisplayName(String(fresh?.displayName || ""))
      setBio(String(fresh?.bio || ""))
      setTimeZone(String(fresh?.timeZone || ""))

      setAvatarFile(null)
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview)
      }
      setAvatarPreview(null)
      setAvatarResetQueued(false)
      if (fileRef.current) fileRef.current.value = ""

      setSuccess(
        hasUpdates || avatarResetQueued ? "Saved!" : "Nothing changed."
      )

      // reset some caches
      qc.invalidateQueries({ queryKey: ["me"] })
      qc.invalidateQueries({ queryKey: ["userProfile"] })
      qc.invalidateQueries({ queryKey: ["feed"] })
      qc.invalidateQueries({ queryKey: ["userDay"] })
      qc.invalidateQueries({ queryKey: ["postDetail"] })

      router.push(`/${username}`)
    } catch (e: any) {
      setError(safeApiMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return {
    // state
    loading,
    saving,
    error,
    success,
    dirty,

    // form fields
    username,
    setUsername,
    displayName,
    setDisplayName,
    bio,
    setBio,
    timeZone,
    setTimeZone,

    // avatar
    fileRef,
    avatarSrc,
    avatarFile,
    avatarResetQueued,
    pickAvatar,
    onAvatarChange,
    queueResetAvatar,
    undoAvatarChange,

    // actions
    discardAll,
    onSave,
    goBack: () => router.back(),
  }
}
