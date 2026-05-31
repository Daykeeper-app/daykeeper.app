"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, Search, Bell, User, BookOpen } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { useMe } from "@/lib/useMe"
import { useNotifications } from "@/hooks/useNotifications"

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(href + "/")
}

type NavItem = {
  href: string
  icon: LucideIcon
  isProfile?: boolean
}

export default function MobileNav() {
  const pathname = usePathname()
  const me = useMe()
  const { unreadCount } = useNotifications()

  const LEFT: NavItem[] = [
    { href: "/feed", icon: Users },
    { href: "/search", icon: Search },
  ]

  const RIGHT: NavItem[] = [
    { href: "/notifications", icon: Bell },
    ...(me ? [{ href: `/${me.username}`, icon: User, isProfile: true }] : []),
  ]

  const dayActive = isActive(pathname, "/day")

  function NavLink({ item }: { item: NavItem }) {
    const active = isActive(pathname, item.href)
    const showDot = item.href === "/notifications" && unreadCount > 0
    const Icon = item.icon
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={[
          "flex flex-1 items-center justify-center p-3 rounded-xl transition-all",
          active ? "text-(--dk-sky)" : "text-(--dk-slate) hover:text-(--dk-ink)",
        ].join(" ")}
      >
        <span className="relative">
          <Icon size={24} className={active ? "stroke-[2.4]" : "stroke-2"} />
          {showDot ? (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-(--dk-sky)" />
          ) : null}
        </span>
      </Link>
    )
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-(--dk-paper) border-t border-(--dk-ink)/10 z-20">
      <div className="flex items-center px-2 py-2">
        {LEFT.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        {/* Center — Day hero button */}
        <div className="flex flex-1 items-center justify-center">
          <Link
            href="/day"
            aria-current={dayActive ? "page" : undefined}
            className={[
              "flex items-center justify-center w-12 h-12 rounded-2xl transition-all",
              dayActive
                ? "bg-(--dk-sky) text-white shadow-lg shadow-(--dk-sky)/30"
                : "bg-(--dk-sky)/12 text-(--dk-sky) hover:bg-(--dk-sky)/20",
            ].join(" ")}
            aria-label="Day page"
          >
            <BookOpen size={22} className={dayActive ? "stroke-[2.4]" : "stroke-2"} />
          </Link>
        </div>

        {RIGHT.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>
    </nav>
  )
}
