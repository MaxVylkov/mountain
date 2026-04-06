function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-mountain-border/40 ${className}`} />
}

export default function KnotsLoading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-28" />
      {/* Level tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-32 rounded-full" />
        ))}
      </div>
      {/* Knot cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-mountain-border bg-mountain-border/40 p-4 space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  )
}
