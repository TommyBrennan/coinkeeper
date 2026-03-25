import { ScheduledTransferForm } from "@/components/scheduled-transfer-form";

export const metadata = {
  title: "New Scheduled Transfer — CoinKeeper",
};

export default function NewScheduledTransferPage() {
  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          New Scheduled Transfer
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Set up a recurring transfer between accounts.
        </p>
      </div>
      <ScheduledTransferForm />
    </main>
  );
}
