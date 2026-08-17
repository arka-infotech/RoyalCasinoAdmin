export function PageSkeleton({
  showStats = true,
  showFilters = true,
  showTable = true,
  statsCount = 4,
}: {
  showStats?: boolean;
  showFilters?: boolean;
  showTable?: boolean;
  statsCount?: number;
}) {
  return (
    <div className="p-3 animate-pulse">
      <div className="max-w-7xl mx-auto bg-white p-3 md:p-6 rounded-lg shadow-sm">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-64" />
        </div>
        {showStats && (
          <div className={`grid grid-cols-2 md:grid-cols-${Math.min(statsCount, 4)} gap-4 mb-6`}>
            {Array.from({ length: statsCount }).map((_, i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-lg" />
            ))}
          </div>
        )}
        {showFilters && (
          <div className="flex gap-3 mb-4">
            <div className="h-10 bg-gray-200 rounded w-40" />
            <div className="h-10 bg-gray-200 rounded w-40" />
            <div className="h-10 bg-gray-200 rounded w-28" />
          </div>
        )}
        {showTable && (
          <div className="space-y-2">
            <div className="h-10 bg-gray-200 rounded" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
