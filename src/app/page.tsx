export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 mb-2">
          <svg
            className="w-8 h-8 text-emerald-600 dark:text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          CoinKeeper
        </h1>

        <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
          AI-powered personal finance management. Multi-currency accounts,
          receipt scanning, smart categorization, and deep spending analytics
          &mdash; all in one place.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Under development
          </span>
        </div>
      </div>
    </main>
  );
}
