import { Loader2 } from "lucide-react"

export function LoadingSpinner({
  size = 18,
  className = "",
}: {
  size?: number
  className?: string
}) {
  return (
    <span
      role="status"
      aria-label="Please wait"
      className={["inline-flex items-center justify-center", className].join(" ")}
    >
      <Loader2
        size={size}
        aria-hidden="true"
        className="animate-spin text-current"
      />
    </span>
  )
}

export function CenteredSpinner({
  size = 20,
  className = "",
}: {
  size?: number
  className?: string
}) {
  return (
    <div
      className={["flex items-center justify-center", className].join(" ")}
    >
      <LoadingSpinner size={size} />
    </div>
  )
}
