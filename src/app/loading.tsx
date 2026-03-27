export default function Loading() {
  return (
    <main className="flex-1 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-8 animate-pulse">
        {/* Title skeleton */}
        <div className="h-8 w-40 bg-gray-200 dark:bg-gray-800 rounded-lg" />

        {/* Balance card skeleton */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-3" />
          <div className="h-10 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 h-20"
            />
          ))}
        </div>

        {/* List skeleton */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-800" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-1" />
                <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
              </div>
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
