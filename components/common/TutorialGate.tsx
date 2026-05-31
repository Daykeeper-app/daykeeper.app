"use client"

import { useEffect, useState } from "react"
import TutorialOverlay from "./TutorialOverlay"

export default function TutorialGate() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem("dk-tutorial-seen")) {
      setOpen(true)
    }
  }, [])

  return <TutorialOverlay open={open} onClose={() => setOpen(false)} />
}
