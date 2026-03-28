"use client";

import { useReceiptUpload } from "./use-receipt-upload";
import { UploadZone } from "./upload-zone";
import { ParsingIndicator } from "./parsing-indicator";
import { ReceiptReview } from "./receipt-review";

export function ReceiptUploadForm() {
  const state = useReceiptUpload();

  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      </div>
    );
  }

  if (state.accounts.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
          No accounts yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          You need at least one account to create transactions from receipts.
        </p>
        <a
          href="/accounts/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
        >
          Create Account
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {state.error && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm"
        >
          {state.error}
        </div>
      )}

      {state.warning && (
        <div
          role="status"
          className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm"
        >
          {state.warning}
        </div>
      )}

      {state.step === "upload" && (
        <UploadZone
          dragActive={state.dragActive}
          fileInputRef={state.fileInputRef}
          onDrag={state.handleDrag}
          onDrop={state.handleDrop}
          onFileInput={state.handleFileInput}
        />
      )}

      {state.step === "parsing" && (
        <ParsingIndicator previewUrl={state.previewUrl} />
      )}

      {(state.step === "review" || state.step === "creating") && (
        <ReceiptReview
          previewUrl={state.previewUrl}
          merchant={state.merchant}
          setMerchant={state.setMerchant}
          receiptDate={state.receiptDate}
          setReceiptDate={state.setReceiptDate}
          currency={state.currency}
          setCurrency={state.setCurrency}
          lineItems={state.lineItems}
          subtotal={state.subtotal}
          tax={state.tax}
          total={state.total}
          selectedTotal={state.selectedTotal}
          selectedCount={state.selectedCount}
          accountId={state.accountId}
          setAccountId={state.setAccountId}
          accounts={state.accounts}
          categories={state.categories}
          suggestingIndex={state.suggestingIndex}
          submitting={state.submitting}
          reParsing={state.reParsing}
          receiptId={state.receiptId}
          onUpdateLineItem={state.updateLineItem}
          onRemoveLineItem={state.removeLineItem}
          onAddLineItem={state.addLineItem}
          onSuggestAllCategories={state.suggestAllCategories}
          onCreateTransactions={state.handleCreateTransactions}
          onReParse={state.handleReParse}
          onReset={state.resetForm}
        />
      )}
    </div>
  );
}
