"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  BookOpen,
  HelpCircle,
  Lock,
  LogOut,
  Monitor,
  Moon,
  Shield,
  ShieldCheck,
  Smartphone,
  Sun,
  Users,
} from "lucide-react"

import LogoutButton from "./LogoutButton"
import TutorialOverlay from "@/components/common/TutorialOverlay"
import { getTheme, setTheme, type ThemeMode } from "@/lib/theme"

function SectionBlock({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-(--dk-ink)/10 bg-(--dk-paper)">
      <div className="px-4 py-3">
        <div className="text-sm font-semibold text-(--dk-ink)">{title}</div>
        {subtitle ? (
          <div className="text-xs text-(--dk-slate)">{subtitle}</div>
        ) : null}
      </div>
      <div className="divide-y divide-(--dk-ink)/10 border-t border-(--dk-ink)/10">
        {children}
      </div>
    </section>
  )
}

function SettingsRow({
  title,
  subtitle,
  href,
  icon,
}: {
  title: string
  subtitle?: string
  href: string
  icon?: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-4 hover:bg-(--dk-sky)/8 transition"
    >
      <div className="h-9 w-9 rounded-xl bg-(--dk-sky)/15 text-(--dk-ink) flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-(--dk-ink)">{title}</div>
        {subtitle ? (
          <div className="text-xs text-(--dk-slate)">{subtitle}</div>
        ) : null}
      </div>
      <ArrowRight size={16} className="text-(--dk-slate)" />
    </Link>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [mode, setMode] = useState<ThemeMode>("system")
  const [showTutorial, setShowTutorial] = useState(false)
  useEffect(() => setMode(getTheme()), [])

  return (
    <main className="pb-20 lg:pb-0">
      <div className="max-w-3xl mx-auto lg:border-x lg:border-(--dk-ink)/10 bg-(--dk-paper) min-h-screen">
        <div className="sticky top-0 bg-(--dk-paper)/95 backdrop-blur-md z-20">
          <div className="h-0.5 w-full bg-(--dk-sky)/65" />
          <div className="flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl hover:bg-(--dk-mist)/70 transition"
              aria-label="Go back"
            >
              <ArrowLeft size={18} className="text-(--dk-ink)" />
            </button>
            <div>
              <div className="text-sm font-semibold text-(--dk-ink)">Settings</div>
              <div className="text-xs text-(--dk-slate)">Account, privacy &amp; appearance</div>
            </div>
          </div>
        </div>

        <div className="pb-8">
          <SectionBlock
            title="Account"
            subtitle="Security, privacy, and connections"
          >
            <SettingsRow
              title="Change password"
              subtitle="Update your login credentials"
              href="/settings/change-password"
              icon={<Lock size={18} />}
            />
            <SettingsRow
              title="Two-factor authentication"
              subtitle="Add a second step at login"
              href="/settings/two-factor"
              icon={<ShieldCheck size={18} />}
            />
            <SettingsRow
              title="Privacy"
              subtitle="Public or private account"
              href="/settings/privacy"
              icon={<Shield size={18} />}
            />
            <SettingsRow
              title="Close friends"
              subtitle="Manage who sees close-friends posts"
              href="/settings/close-friends"
              icon={<Users size={18} />}
            />
            <SettingsRow
              title="Blocks"
              subtitle="Blocked users and content"
              href="/settings/blocks"
              icon={<Ban size={18} />}
            />
            <SettingsRow
              title="Devices"
              subtitle="Active sessions and device tokens"
              href="/settings/devices"
              icon={<Smartphone size={18} />}
            />
          </SectionBlock>

          <SectionBlock title="Appearance" subtitle="Theme preferences">
            <div className="px-4 py-4">
              <div className="text-sm font-semibold text-(--dk-ink)">
                Theme
              </div>
              <div className="text-xs text-(--dk-slate)">
                Choose how Daykeeper looks on this device.
              </div>

              <div className="mt-3 flex gap-2 flex-wrap">
                {(["light", "dark", "system"] as ThemeMode[]).map((m) => {
                  const active = mode === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMode(m)
                        setTheme(m)
                      }}
                      className={[
                        "px-3 py-2 rounded-xl border text-sm font-medium transition",
                        "border-(--dk-ink)/10 text-(--dk-ink)",
                        active
                          ? "bg-(--dk-sky)/20 border-(--dk-sky)"
                          : "bg-(--dk-paper) hover:bg-(--dk-mist)",
                      ].join(" ")}
                    >
                      <span className="inline-flex items-center gap-2">
                        {m === "light" ? (
                          <Sun size={16} />
                        ) : m === "dark" ? (
                          <Moon size={16} />
                        ) : (
                          <Monitor size={16} />
                        )}
                        {m}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </SectionBlock>

          <SectionBlock title="Support" subtitle="Guides and help">
            <button
              type="button"
              onClick={() => setShowTutorial(true)}
              className="flex items-center gap-3 px-4 py-4 hover:bg-(--dk-sky)/8 transition w-full text-left"
            >
              <div className="h-9 w-9 rounded-xl bg-(--dk-sky)/15 text-(--dk-ink) flex items-center justify-center">
                <BookOpen size={18} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-(--dk-ink)">Tutorial</div>
                <div className="text-xs text-(--dk-slate)">Replay the getting started guide</div>
              </div>
              <ArrowRight size={16} className="text-(--dk-slate)" />
            </button>
            <SettingsRow
              title="Help & FAQ"
              subtitle="Common questions and contact info"
              href="/settings/help"
              icon={<HelpCircle size={18} />}
            />
          </SectionBlock>

          <SectionBlock
            title="Danger zone"
            subtitle="Irreversible actions"
          >
            <SettingsRow
              title="Delete account"
              subtitle="Request a code and confirm with your password"
              href="/settings/delete-account"
              icon={<Ban size={18} />}
            />
            <div className="px-4 py-4 border-t border-(--dk-ink)/10">
              <div className="text-sm font-semibold text-(--dk-ink)">
                Logout
              </div>
              <div className="text-xs text-(--dk-slate)">
                End your current session on this device.
              </div>
              <div className="mt-3">
                <LogoutButton className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium bg-(--dk-sky) text-white hover:brightness-95 transition w-full sm:w-auto">
                  <LogOut size={16} /> Logout
                </LogoutButton>
              </div>
            </div>
          </SectionBlock>
        </div>
      </div>

      <TutorialOverlay
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </main>
  )
}
