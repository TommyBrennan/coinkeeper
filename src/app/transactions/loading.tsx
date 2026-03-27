export default function TransactionsLoading() {
  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 animate-pulse">
      {/* Breadcrumb */}
      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
      {/* Title */}
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-6" />
      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      </div>
      {/* List */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-800" />
            <div className="flex-1">
              <div className="h-4 w-40 bg-gray-200 dark:bg-gray-800 rounded mb-1" />
              <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    </main>
  );
}
