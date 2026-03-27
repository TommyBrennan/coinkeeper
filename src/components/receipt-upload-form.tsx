"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";

interface Account {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  color: string | null;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface LineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selected: boolean;
  categoryId: string;
  categoryName: string | null;
}

interface ParsedReceipt {
  merchant: string | null;
  date: string | null;
  currency: string | null;
  lineItems: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
}

type UploadStep = "upload" | "parsing" | "review" | "creating";

export function ReceiptUploadForm() {
  const router = useRouter();

  // Upload state
  const [step, setStep] = useState<UploadStep>("upload");
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Receipt data
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [merchant, setMerchant] = useState("");
  const [receiptDate, setReceiptDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [currency, setCurrency] = useState("USD");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [subtotal, setSubtotal] = useState<number | null>(null);
  const [tax, setTax] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // Form data
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reParsing, setReParsing] = useState(false);

  // AI suggestion state per line item
  const [suggestingIndex, setSuggestingIndex] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [accRes, catRes] = await Promise.all([
          fetch("/api/accounts"),
          fetch("/api/categories"),
        ]);
        const accs = await accRes.json();
        const cats = await catRes.json();
        setAccounts(accs);
        setCategories(cats);
        if (accs.length > 0) setAccountId(accs[0].id);
      } catch {
        setError("Failed to load accounts and categories");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setError(null);

    // Validate type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.");
      return;
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum size is 10MB.");
      return;
    }

    // Show preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setStep("parsing");

    // Upload
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/receipts", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Upload failed");
        setStep("upload");
        return;
      }

      const data = await res.json();
      const receipt = data.receipt;

      setReceiptId(receipt.id);
      if (data.warning) setWarning(data.warning);

      if (receipt.parsedData) {
        populateParsedData(receipt.parsedData);
        setStep("review");
      } else {
        // No parsed data — still show review with empty fields
        setStep("review");
      }
    } catch {
      setError("Network error. Please try again.");
      setStep("upload");
    }
  }, []);

  const populateParsedData = (parsed: ParsedReceipt) => {
    setMerchant(parsed.merchant || "");
    if (parsed.date) setReceiptDate(parsed.date);
    if (parsed.currency) setCurrency(parsed.currency);
    setSubtotal(parsed.subtotal);
    setTax(parsed.tax);
    setTotal(parsed.total);

    const items: LineItem[] = (parsed.lineItems || []).map((item) => ({
      ...item,
      selected: true,
      categoryId: "",
      categoryName: null,
    }));
    setLineItems(items);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile]
  );

  const handleReParse = async () => {
    if (!receiptId) return;
    setReParsing(true);
    setError(null);

    try {
      const res = await fetch(`/api/receipts/${receiptId}/parse`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Re-parse failed");
        return;
      }

      const data = await res.json();
      if (data.receipt?.parsedData) {
        populateParsedData(data.receipt.parsedData);
      }
    } catch {
      setError("Network error during re-parse.");
    } finally {
      setReParsing(false);
    }
  };

  const fetchCategorySuggestion = async (index: number) => {
    const item = lineItems[index];
    if (!item || !item.name.trim()) return;

    setSuggestingIndex(index);
    try {
      const res = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: item.name,
          amount: item.totalPrice,
        }),
      });

      if (!res.ok) return;

      const data = await res.json();
      if (data.categoryId && data.confidence !== "low") {
        const catName =
          data.suggestedName ||
          categories.find((c) => c.id === data.categoryId)?.name ||
          null;

        // Refresh categories if new one was created
        if (data.isNew) {
          const catRes = await fetch("/api/categories");
          if (catRes.ok) {
            const cats = await catRes.json();
            setCategories(cats);
          }
        }

        setLineItems((prev) =>
          prev.map((li, i) =>
            i === index
              ? { ...li, categoryId: data.categoryId, categoryName: catName }
              : li
          )
        );
      }
    } catch {
      // Silent failure
    } finally {
      setSuggestingIndex(null);
    }
  };

  const suggestAllCategories = async () => {
    for (let i = 0; i < lineItems.length; i++) {
      if (lineItems[i].selected && !lineItems[i].categoryId) {
        await fetchCategorySuggestion(i);
      }
    }
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: unknown) => {
    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        // Recalculate total if quantity or unit price changes
        if (field === "quantity" || field === "unitPrice") {
          updated.totalPrice = (updated.quantity || 0) * (updated.unitPrice || 0);
        }
        return updated;
      })
    );
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        name: "",
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        selected: true,
        categoryId: "",
        categoryName: null,
      },
    ]);
  };

  // Compute selected total
  const selectedTotal = lineItems
    .filter((li) => li.selected)
    .reduce((sum, li) => sum + li.totalPrice, 0);

  const handleCreateTransactions = async () => {
    setError(null);

    if (!accountId) {
      setError("Please select an account");
      return;
    }

    const selectedItems = lineItems.filter((li) => li.selected && li.totalPrice > 0);
    if (selectedItems.length === 0) {
      setError("No items selected for transaction creation");
      return;
    }

    const selectedAccount = accounts.find((a) => a.id === accountId);

    setSubmitting(true);
    setStep("creating");

    try {
      const results = [];
      for (const item of selectedItems) {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "expense",
            amount: item.totalPrice,
            currency: currency || selectedAccount?.currency || "USD",
            description: `${merchant ? merchant + " — " : ""}${item.name}`,
            date: new Date(receiptDate).toISOString(),
            categoryId: item.categoryId || null,
            fromAccountId: accountId,
            receiptId: receiptId,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Failed to create transaction for "${item.name}"`);
        }

        results.push(await res.json());
      }

      router.push("/transactions");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create transactions"
      );
      setStep("review");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
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
      {error && (
        <div role="alert" className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {warning && (
        <div role="status" className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm">
          {warning}
        </div>
      )}

      {/* Step 1: Upload zone */}
      {step === "upload" && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload receipt image — drag and drop or click to browse"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
          className={`relative flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            dragActive
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
              : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-900/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileInput}
            className="hidden"
            aria-label="Choose receipt image file"
          />
          <svg
            className={`w-12 h-12 mb-4 ${
              dragActive
                ? "text-emerald-500"
                : "text-gray-400 dark:text-gray-600"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {dragActive ? "Drop your receipt here" : "Upload a receipt image"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Drag & drop or click to browse. JPEG, PNG, WebP, GIF up to 10MB.
          </p>
        </div>
      )}

      {/* Step 2: Parsing */}
      {step === "parsing" && (
        <div className="flex flex-col items-center py-12 space-y-4" role="status" aria-label="Analyzing receipt">
          {previewUrl && (
            <div className="w-48 h-48 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-emerald-500 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Analyzing receipt with AI...
            </span>
          </div>
        </div>
      )}

      {/* Step 3: Review parsed data */}
      {(step === "review" || step === "creating") && (
        <div className="space-y-6">
          {/* Receipt image + info side by side */}
          <div className="flex gap-6">
            {previewUrl && (
              <div className="shrink-0 w-40 h-52 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Receipt"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 space-y-4">
              {/* Merchant */}
              <div>
                <label htmlFor="receipt-merchant" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Merchant
                </label>
                <input
                  id="receipt-merchant"
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder="Store name"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              {/* Date */}
              <div>
                <label htmlFor="receipt-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Date
                </label>
                <input
                  id="receipt-date"
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              {/* Currency */}
              <div>
                <label htmlFor="receipt-currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Currency
                </label>
                <input
                  id="receipt-currency"
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  maxLength={3}
                  placeholder="USD"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent uppercase"
                />
              </div>
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Line Items
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={suggestAllCategories}
                  disabled={suggestingIndex !== null}
                  className="text-xs px-2.5 py-1 rounded-md bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50 font-medium transition-colors disabled:opacity-50"
                >
                  {suggestingIndex !== null ? (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Suggesting...
                    </span>
                  ) : (
                    "AI Categorize All"
                  )}
                </button>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="text-xs px-2.5 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors"
                >
                  + Add Item
                </button>
              </div>
            </div>

            {lineItems.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  No line items parsed from receipt
                </p>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
                >
                  Add items manually
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {lineItems.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                      item.selected
                        ? "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                        : "border-gray-100 dark:border-gray-900 bg-gray-50 dark:bg-gray-950 opacity-60"
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="pt-2">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) =>
                          updateLineItem(index, "selected", e.target.checked)
                        }
                        aria-label={`Include ${item.name || `item ${index + 1}`} in transaction`}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Item details */}
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) =>
                            updateLineItem(index, "name", e.target.value)
                          }
                          placeholder="Item name"
                          aria-label={`Item ${index + 1} name`}
                          className="flex-1 px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(
                              index,
                              "quantity",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          min="0"
                          step="1"
                          aria-label={`Item ${index + 1} quantity`}
                          className="w-16 px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent text-sm text-gray-900 dark:text-gray-100 text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <input
                          type="number"
                          value={item.unitPrice || ""}
                          onChange={(e) =>
                            updateLineItem(
                              index,
                              "unitPrice",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          min="0"
                          step="0.01"
                          placeholder="Unit price"
                          aria-label={`Item ${index + 1} unit price`}
                          className="w-24 px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent text-sm text-gray-900 dark:text-gray-100 tabular-nums text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <div className="w-24 px-2 py-1.5 text-sm text-right tabular-nums font-medium text-gray-900 dark:text-gray-100">
                          {formatMoney(item.totalPrice, currency)}
                        </div>
                      </div>

                      {/* Category row */}
                      <div className="flex items-center gap-2">
                        <select
                          value={item.categoryId}
                          onChange={(e) =>
                            updateLineItem(index, "categoryId", e.target.value)
                          }
                          aria-label={`Category for ${item.name || `item ${index + 1}`}`}
                          className="flex-1 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="">No category</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        {item.categoryName && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                            AI: {item.categoryName}
                          </span>
                        )}
                        {suggestingIndex === index && (
                          <svg className="w-3 h-3 text-violet-500 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        )}
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          aria-label={`Remove ${item.name || `item ${index + 1}`}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals summary */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4 space-y-2">
            {subtotal !== null && (
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Subtotal (receipt)</span>
                <span className="tabular-nums">{formatMoney(subtotal, currency)}</span>
              </div>
            )}
            {tax !== null && (
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Tax (receipt)</span>
                <span className="tabular-nums">{formatMoney(tax, currency)}</span>
              </div>
            )}
            {total !== null && (
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Total (receipt)</span>
                <span className="tabular-nums font-medium">{formatMoney(total, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold text-gray-900 dark:text-gray-100 border-t border-gray-200 dark:border-gray-700 pt-2">
              <span>Selected items total</span>
              <span className="tabular-nums">{formatMoney(selectedTotal, currency)}</span>
            </div>
          </div>

          {/* Account selection */}
          <div>
            <label htmlFor="receipt-account" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Debit Account
            </label>
            <select
              id="receipt-account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency}) — {formatMoney(a.balance, a.currency)}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleCreateTransactions}
              disabled={submitting || lineItems.filter((li) => li.selected).length === 0}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Transactions...
                </span>
              ) : (
                `Create ${lineItems.filter((li) => li.selected).length} Transaction${
                  lineItems.filter((li) => li.selected).length !== 1 ? "s" : ""
                }`
              )}
            </button>
            <button
              type="button"
              onClick={handleReParse}
              disabled={reParsing || !receiptId}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {reParsing ? "Re-parsing..." : "Re-parse Receipt"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("upload");
                setPreviewUrl(null);
                setReceiptId(null);
                setLineItems([]);
                setMerchant("");
                setError(null);
                setWarning(null);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Upload Different
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
