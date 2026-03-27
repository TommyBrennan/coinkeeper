export default function SettingsLoading() {
  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
      <div className="h-8 w-28 bg-gray-200 dark:bg-gray-800 rounded mb-6" />
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 h-32"
          />
        ))}
      </div>
    </main>
  );
}
