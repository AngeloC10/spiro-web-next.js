export default function StoreLoading() {
  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-8">
        <div className="h-10 bg-[rgba(255,255,255,0.1)] w-48 rounded-lg mb-4 animate-pulse"></div>
        <div className="h-5 bg-[rgba(255,255,255,0.05)] w-96 rounded-lg animate-pulse"></div>
      </div>
      
      {/* Filters skeleton */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 mb-8 h-24 animate-pulse flex flex-col md:flex-row gap-6"></div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-80 bg-[rgba(255,255,255,0.02)] border border-[var(--border)] rounded-2xl animate-pulse flex flex-col overflow-hidden">
            <div className="h-48 bg-[rgba(255,255,255,0.05)] w-full"></div>
            <div className="p-5 flex flex-col flex-1 gap-4">
              <div className="h-6 bg-[rgba(255,255,255,0.1)] rounded w-3/4"></div>
              <div className="h-4 bg-[rgba(255,255,255,0.05)] rounded w-full"></div>
              <div className="h-10 bg-[rgba(255,255,255,0.08)] rounded w-full mt-auto"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
