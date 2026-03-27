export default function CurrenciesLoading() {
  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
      <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 h-20"
          />
        ))}
      </div>
    </main>
  );
}
