import { TransferForm } from "@/components/transfer-form";

export const metadata = {
  title: "New Transfer — CoinKeeper",
};

export default function NewTransferPage() {
  return (
    <main className="flex-1 w-full max-w-xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          New Transfer
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Move money between your accounts
        </p>
      </div>
      <TransferForm />
    </main>
  );
}
