export default function PricesLoading() {
  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
      <div className="h-8 w-36 bg-gray-200 dark:bg-gray-800 rounded mb-6" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 h-20"
          />
        ))}
      </div>
    </main>
  );
}
