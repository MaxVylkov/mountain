function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-mountain-border/40 ${className}`} />
}

export default function KnowledgeLoading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-48" />
      {/* Graph placeholder */}
      <div className="rounded-xl border border-mountain-border bg-mountain-border/40 p-6">
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    </div>
  )
}
