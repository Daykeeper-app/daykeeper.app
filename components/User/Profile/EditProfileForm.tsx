"use client"

import { ArrowLeft } from "lucide-react"
import FormField from "@/components/Form/FormField"
import FormButton from "@/components/Form/FormButton"
import FormAlert from "@/components/Form/FormAlert"

import AvatarPicker from "@/components/User/Profile/AvatarPicker"
import TimeZonePicker from "@/components/User/Profile/TimeZonePicker"
import { TIME_ZONES } from "@/lib/utils/timezones"
import { useEditProfile } from "@/hooks/useEditProfile"
import { LoadingRows } from "@/components/common/LoadingSkeleton"
import { LoadingSpinner } from "@/components/common/LoadingIndicator"

export default function EditProfileForm() {
  const p = useEditProfile()

  return (
    <main className="pb-20 lg:pb-0">
      <div className="mx-auto min-h-screen max-w-3xl bg-(--dk-paper) lg:border-x lg:border-(--dk-ink)/10">
        <div className="sticky top-0 z-10 border-b border-(--dk-ink)/10 bg-(--dk-paper)/96 backdrop-blur-md">
          <div className="h-0.5 w-full bg-(--dk-sky)/65" />
          <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <button
              onClick={p.goBack}
              className="rounded-lg p-2 transition hover:bg-(--dk-mist)/75"
              aria-label="Back"
              type="button"
            >
              <ArrowLeft size={18} className="text-(--dk-ink)" />
            </button>

            <div className="leading-tight">
              <div className="text-sm font-semibold text-(--dk-ink)">
                Edit profile
              </div>
              <div className="text-xs text-(--dk-slate)">
                Update your public info
              </div>
            </div>
          </div>
        </div>

        {p.loading && (
          <LoadingRows rows={4} />
        )}

        {!p.loading && p.error && (
          <div className="px-4 py-4 sm:px-5">
            <FormAlert>{p.error}</FormAlert>
          </div>
        )}

        {!p.loading && p.success && (
          <div className="px-4 py-4 sm:px-5">
            <div className="rounded-lg bg-(--dk-sky)/12 px-4 py-3 text-sm text-(--dk-sky)">
              {p.success}
            </div>
          </div>
        )}

        {!p.loading && !p.error && (
          <form className="space-y-5 px-4 py-5 sm:px-5" onSubmit={p.onSave}>
            <AvatarPicker
              fileRef={p.fileRef}
              avatarSrc={p.avatarSrc}
              avatarResetQueued={p.avatarResetQueued}
              avatarFile={p.avatarFile}
              onPick={p.pickAvatar}
              onChange={p.onAvatarChange}
              onReset={p.queueResetAvatar}
              onUndo={p.undoAvatarChange}
            />

            <div className="grid gap-4">
              <FormField
                label="Display name"
                maxLength={40}
                inputProps={{
                  type: "text",
                  autoComplete: "name",
                  placeholder: "How your name appears",
                  value: p.displayName,
                  onChange: (e: any) => p.setDisplayName(e.target.value),
                }}
              />

              <FormField
                label="Username"
                hint="Must be unique."
                maxLength={40}
                inputProps={{
                  type: "text",
                  autoComplete: "username",
                  placeholder: "yourhandle",
                  value: p.username,
                  onChange: (e: any) => p.setUsername(e.target.value),
                }}
              />

              <FormField
                label="Bio"
                maxLength={1000}
                inputProps={{
                  type: "text",
                  placeholder: "Write something about you",
                  value: p.bio,
                  onChange: (e: any) => p.setBio(e.target.value),
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-(--dk-ink)">
                Time zone
              </div>

              <TimeZonePicker
                value={p.timeZone}
                onChange={p.setTimeZone}
                options={TIME_ZONES}
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <FormButton
                type="button"
                variant="secondary"
                disabled={!p.dirty || p.saving}
                onClick={p.discardAll as any}
              >
                Discard
              </FormButton>

              <FormButton type="submit" disabled={!p.dirty || p.saving}>
                {p.saving ? <LoadingSpinner /> : "Save changes"}
              </FormButton>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
