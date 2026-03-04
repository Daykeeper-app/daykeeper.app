"use client"

import Image from "next/image"

export default function AuthLoading() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        background: "var(--dk-paper)",
        color: "var(--dk-ink)",
      }}
    >
      <div className="flex flex-col items-center gap-2 animate-fade-in">
        <Image
          src="/logo-main.svg"
          alt="Daykeeper"
          width={64}
          height={64}
          priority
        />
      </div>
    </div>
  )
}
