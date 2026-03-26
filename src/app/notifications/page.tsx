import { requireUser } from "@/lib/auth";
import { NotificationCenter } from "@/components/notification-center";

export const metadata = {
  title: "Notifications — CoinKeeper",
};

export default async function NotificationsPage() {
  await requireUser();

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Notifications
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Stay updated on your financial activity
        </p>
      </div>

      <NotificationCenter />
    </main>
  );
}
