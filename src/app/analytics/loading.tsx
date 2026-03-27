export default function AnalyticsLoading() {
  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
      <div className="h-8 w-36 bg-gray-200 dark:bg-gray-800 rounded mb-6" />
      <div className="space-y-6">
        {/* Chart skeletons */}
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6"
          >
            <div className="h-5 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
            <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg" />
          </div>
        ))}
      </div>
    </main>
  );
}
