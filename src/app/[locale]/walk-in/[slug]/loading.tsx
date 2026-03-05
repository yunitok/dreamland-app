export default function WalkInLoading() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background">
      {/* Header skeleton */}
      <div className="border-b bg-card px-5 pb-5 pt-8">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-36 animate-pulse rounded bg-muted" />
      </div>

      {/* Date bar skeleton */}
      <div className="flex items-center gap-2 border-b bg-card px-5 py-3">
        <div className="h-8 w-16 animate-pulse rounded-full bg-muted" />
        <div className="h-8 w-20 animate-pulse rounded-full bg-muted" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-4 p-4">
        {[0, 1].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border bg-card p-4">
            <div className="mb-3 h-4 w-24 rounded bg-muted" />
            <div className="mb-3 h-1.5 w-full rounded-full bg-muted" />
            <div className="space-y-2">
              {[0, 1, 2].map((j) => (
                <div key={j} className="h-12 rounded-lg bg-muted" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
