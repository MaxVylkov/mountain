function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-mountain-border/40 ${className}`} />
}

export default function TrainingLoading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-44" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-mountain-border bg-mountain-border/40 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
