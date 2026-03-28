"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type {
  Account,
  Category,
  LineItem,
  ParsedReceipt,
  UploadStep,
} from "./types";

export function useReceiptUpload() {
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

  const populateParsedData = useCallback((parsed: ParsedReceipt) => {
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
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ];
      if (!allowedTypes.includes(file.type)) {
        setError(
          "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image."
        );
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError("File too large. Maximum size is 10MB.");
        return;
      }

      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setStep("parsing");

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
        }
        setStep("review");
      } catch {
        setError("Network error. Please try again.");
        setStep("upload");
      }
    },
    [populateParsedData]
  );

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

  const handleReParse = useCallback(async () => {
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
  }, [receiptId, populateParsedData]);

  const fetchCategorySuggestion = useCallback(
    async (index: number) => {
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
    },
    [lineItems, categories]
  );

  const suggestAllCategories = useCallback(async () => {
    for (let i = 0; i < lineItems.length; i++) {
      if (lineItems[i].selected && !lineItems[i].categoryId) {
        await fetchCategorySuggestion(i);
      }
    }
  }, [lineItems, fetchCategorySuggestion]);

  const updateLineItem = useCallback(
    (index: number, field: keyof LineItem, value: unknown) => {
      setLineItems((prev) =>
        prev.map((item, i) => {
          if (i !== index) return item;
          const updated = { ...item, [field]: value };
          if (field === "quantity" || field === "unitPrice") {
            updated.totalPrice =
              (updated.quantity || 0) * (updated.unitPrice || 0);
          }
          return updated;
        })
      );
    },
    []
  );

  const removeLineItem = useCallback((index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addLineItem = useCallback(() => {
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
  }, []);

  const selectedTotal = lineItems
    .filter((li) => li.selected)
    .reduce((sum, li) => sum + li.totalPrice, 0);

  const selectedCount = lineItems.filter((li) => li.selected).length;

  const handleCreateTransactions = useCallback(async () => {
    setError(null);

    if (!accountId) {
      setError("Please select an account");
      return;
    }

    const selectedItems = lineItems.filter(
      (li) => li.selected && li.totalPrice > 0
    );
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
          throw new Error(
            data.error || `Failed to create transaction for "${item.name}"`
          );
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
  }, [
    accountId,
    lineItems,
    accounts,
    currency,
    merchant,
    receiptDate,
    receiptId,
    router,
  ]);

  const resetForm = useCallback(() => {
    setStep("upload");
    setPreviewUrl(null);
    setReceiptId(null);
    setLineItems([]);
    setMerchant("");
    setError(null);
    setWarning(null);
  }, []);

  return {
    // State
    step,
    dragActive,
    previewUrl,
    error,
    warning,
    fileInputRef,
    receiptId,
    merchant,
    setMerchant,
    receiptDate,
    setReceiptDate,
    currency,
    setCurrency,
    lineItems,
    subtotal,
    tax,
    total,
    accountId,
    setAccountId,
    accounts,
    categories,
    loading,
    submitting,
    reParsing,
    suggestingIndex,
    selectedTotal,
    selectedCount,

    // Actions
    handleDrag,
    handleDrop,
    handleFileInput,
    handleReParse,
    fetchCategorySuggestion,
    suggestAllCategories,
    updateLineItem,
    removeLineItem,
    addLineItem,
    handleCreateTransactions,
    resetForm,
  };
}
