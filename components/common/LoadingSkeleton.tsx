export function LoadingRows({
  rows = 4,
  className = "",
}: {
  rows?: number
  className?: string
}) {
  return (
    <div
      role="status"
      aria-label="Please wait"
      className={["animate-pulse space-y-3 px-4 py-6 sm:px-5", className].join(
        " ",
      )}
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 rounded-lg bg-(--dk-mist)" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-2/5 rounded bg-(--dk-mist)" />
            <div className="h-3 w-3/4 rounded bg-(--dk-mist)" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Please wait" className="animate-pulse">
      <div className="border-b border-(--dk-ink)/10 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-(--dk-mist)" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-(--dk-mist)" />
            <div className="h-3 w-20 rounded bg-(--dk-mist)" />
          </div>
        </div>
      </div>
      <div className="space-y-5 px-4 py-6 sm:px-5">
        <div className="h-10 rounded-lg bg-(--dk-mist)" />
        <div className="h-24 rounded-xl bg-(--dk-mist)" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-10 rounded-lg bg-(--dk-mist)" />
          <div className="h-10 rounded-lg bg-(--dk-mist)" />
        </div>
        <div className="h-10 rounded-lg bg-(--dk-mist)" />
      </div>
    </div>
  )
}
