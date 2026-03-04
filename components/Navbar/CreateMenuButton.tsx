"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  CalendarPlus,
  CheckSquare2,
  PlusSquare,
  SquarePen,
  X,
} from "lucide-react"

type Variant = "mobile" | "desktop"

type CreateItem = {
  href: string
  label: string
  icon: any
  subtitle: string
}

const CREATE_ITEMS: CreateItem[] = [
  {
    href: "/post/create",
    label: "Post",
    icon: SquarePen,
    subtitle: "Share on timeline",
  },
  {
    href: "/day/events/create",
    label: "Event",
    icon: CalendarPlus,
    subtitle: "Schedule something",
  },
  {
    href: "/day/tasks/create",
    label: "Task",
    icon: CheckSquare2,
    subtitle: "Track a task",
  },
]

function isCreateRoute(pathname: string) {
  return CREATE_ITEMS.some((item) => pathname === item.href)
}

export default function CreateMenuButton({ variant }: { variant: Variant }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const active = useMemo(() => isCreateRoute(pathname), [pathname])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const el = panelRef.current
      if (!el) return
      if (el.contains(e.target as Node)) return
      setOpen(false)
    }

    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("touchstart", onPointerDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("touchstart", onPointerDown)
    }
  }, [open])

  if (variant === "mobile") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label="Create"
          className={[
            "flex items-center justify-center p-3 rounded-xl transition-all",
            active || open
              ? "text-(--dk-sky)"
              : "text-(--dk-slate) hover:text-(--dk-ink)",
          ].join(" ")}
        >
          <PlusSquare
            size={24}
            className={active || open ? "stroke-[2.4]" : "stroke-2"}
          />
        </button>

        {open ? (
          <div className="lg:hidden fixed inset-0 z-[2147483647]">
            <button
              type="button"
              aria-label="Close create menu"
              className="absolute inset-0 bg-black/20"
              onClick={() => setOpen(false)}
            />

            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-(--dk-paper) ring-1 ring-(--dk-ink)/10 p-4 pb-6"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-(--dk-ink)">
                  Create
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-lg hover:bg-(--dk-mist) text-(--dk-slate)"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {CREATE_ITEMS.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="rounded-xl bg-(--dk-mist)/45 p-3 text-left transition hover:bg-(--dk-sky)/12"
                    >
                      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-(--dk-paper) text-(--dk-sky)">
                        <Icon size={17} />
                      </div>
                      <div className="text-sm font-semibold text-(--dk-ink)">
                        {item.label}
                      </div>
                      <div className="text-xs text-(--dk-slate)">
                        {item.subtitle}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}
      </>
    )
  }

  const desktopPanel =
    open && typeof document !== "undefined" && triggerRef.current
      ? (() => {
          const rect = triggerRef.current.getBoundingClientRect()
          const top = rect.top + rect.height / 2
          const left = rect.right + 8

          return createPortal(
            <>
              <button
                type="button"
                aria-label="Close create menu"
                className="fixed inset-0 z-[2147483646]"
                onClick={() => setOpen(false)}
              />

              <div
                ref={panelRef}
                role="menu"
                className="fixed z-[2147483647] w-72 rounded-xl bg-(--dk-paper) ring-1 ring-(--dk-ink)/10 p-2"
                style={{
                  top,
                  left,
                  transform: "translateY(-50%)",
                }}
              >
                <div className="px-2 pb-2 pt-1 text-[11px] font-medium tracking-wide text-(--dk-slate)">
                  Create
                </div>
                {CREATE_ITEMS.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-(--dk-mist)/55"
                    >
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-(--dk-mist)/65 text-(--dk-sky)">
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-(--dk-ink)">
                          {item.label}
                        </span>
                        <span className="block text-xs text-(--dk-slate)">
                          {item.subtitle}
                        </span>
                      </span>
                    </Link>
                  )
                })}
              </div>
            </>,
            document.body
          )
        })()
      : null

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="w-full bg-(--dk-sky) text-white py-3.5 rounded-xl flex justify-center gap-2 hover:opacity-95 transition"
      >
        <PlusSquare size={20} />
        Create
      </button>

      {desktopPanel}
    </div>
  )
}
