function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-mountain-border/40 ${className}`} />
}

export default function TripsLoading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-mountain-border bg-mountain-border/40 p-4 space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}
