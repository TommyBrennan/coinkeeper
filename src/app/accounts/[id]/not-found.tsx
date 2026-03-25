import Link from "next/link";

export default function AccountNotFound() {
  return (
    <main className="flex-1 w-full max-w-xl mx-auto px-4 py-16 text-center">
      <svg
        className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
        />
      </svg>
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Account not found
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        This account doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link
        href="/accounts"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
      >
        Back to Accounts
      </Link>
    </main>
  );
}
