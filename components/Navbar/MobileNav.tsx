"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, Search, Bell, User } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { useMe } from "@/lib/useMe"
import { useNotifications } from "@/hooks/useNotifications"
import CreateMenuButton from "@/components/Navbar/CreateMenuButton"

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(href + "/")
}

type NavItem = {
  href: string
  icon: LucideIcon | null
  isCreate?: boolean
  isProfile?: boolean
}

export default function MobileNav() {
  const pathname = usePathname()
  const me = useMe()
  const { unreadCount } = useNotifications()

  const NAV: NavItem[] = [
    ...(me ? [{ href: `/${me.username}`, icon: User, isProfile: true }] : []),
    { href: "/feed", icon: Users },
    { href: "/search", icon: Search },
    { href: "/post/create", icon: null, isCreate: true },
    { href: "/notifications", icon: Bell },
  ]

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-(--dk-paper) border-t border-(--dk-ink)/10 z-20">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href)

          const showDot = item.href === "/notifications" && unreadCount > 0

          if (item.isCreate) {
            return <CreateMenuButton key="mobile-create" variant="mobile" />
          }

          const Icon = item.icon
          if (!Icon) return null

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "flex items-center justify-center p-3 rounded-xl transition-all",
                active
                  ? "text-(--dk-sky)"
                  : "text-(--dk-slate) hover:text-(--dk-ink)",
              ].join(" ")}
            >
              <span className="relative">
                <Icon
                  size={24}
                  className={active ? "stroke-[2.4]" : "stroke-2"}
                />
                {showDot ? (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-(--dk-sky)" />
                ) : null}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
