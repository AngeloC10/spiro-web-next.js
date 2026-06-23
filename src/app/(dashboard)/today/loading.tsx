export default function TodayLoading() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <div className="h-8 bg-[rgba(255,255,255,0.1)] w-48 rounded-lg mb-4 animate-pulse"></div>
        <div className="h-4 bg-[rgba(255,255,255,0.05)] w-96 rounded-lg animate-pulse"></div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-[rgba(255,255,255,0.02)] border border-[var(--border)] rounded-2xl animate-pulse flex p-5">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-[rgba(255,255,255,0.05)] rounded w-full"></div>
                <div className="h-3 bg-[rgba(255,255,255,0.05)] rounded w-5/6"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
