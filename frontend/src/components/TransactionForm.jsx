import { useState, useEffect, useCallback, useRef } from "react";
import {
  addTransaction,
  updateTransaction,
  getSummary,
  suggestCategory,
  scanReceipt,
} from "../services/api";
import { useCategories } from "../context/CategoriesContext";
import { useAppRefresh } from "../context/AppRefreshContext";
import { useCurrency } from "../context/CurrencyContext";
import CategorySelect from "./CategorySelect";

const OVERRIDES_STORAGE_KEY = "expense_tracker_category_overrides";

function getLocalCategoryOverride(description) {
  if (!description) return null;
  try {
    const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    const key = description.trim().toLowerCase();
    if (map[key]) return map[key];
    for (const [merchant, cat] of Object.entries(map)) {
      if (key.includes(merchant) || merchant.includes(key)) {
        return cat;
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

function saveLocalCategoryOverride(description, categoryName) {
  if (!description || !categoryName) return;
  try {
    const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const key = description.trim().toLowerCase();
    map[key] = categoryName;
    localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {}
}

export default function TransactionForm({ transaction = null, onSuccess, onCancel }) {
  const { categories } = useCategories();
  const { triggerRefresh, refreshKeys } = useAppRefresh();
  const { baseCurrency, currencies, getExchangeRate, formatCurrency, displayMoney } = useCurrency();
  const isEditing = Boolean(transaction);

  const [title, setTitle] = useState(transaction?.title || "");
  const [currencyCode, setCurrencyCode] = useState(
    () => transaction?.currency || baseCurrency || "INR"
  );
  const [amount, setAmount] = useState(
    transaction?.original_amount ?? transaction?.amount ?? ""
  );
  const [customRate, setCustomRate] = useState(
    transaction?.exchange_rate ? String(transaction.exchange_rate) : ""
  );
  const [showRateInput, setShowRateInput] = useState(false);
  const [category, setCategory] = useState(transaction?.category || "");
  const [type, setType] = useState(transaction?.type || "expense");
  const [date, setDate] = useState(() => {
    if (transaction?.date) return transaction.date.slice(0, 10);
    return new Date().toISOString().slice(0, 10);
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [spent, setSpent] = useState(0);

  // Auto-suggestion state
  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [suggestionConfidence, setSuggestionConfidence] = useState(0);
  const [suggestionSource, setSuggestionSource] = useState(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isUserOverridden, setIsUserOverridden] = useState(false);
  const titleTouchedRef = useRef(false);

  // Receipt scan state
  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState(null);
  const [lowConfidenceFields, setLowConfidenceFields] = useState([]);
  const fileInputRef = useRef(null);

  // Recurring options for new transactions
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState("monthly");
  const [endDate, setEndDate] = useState("");

  const BUDGET_LIMIT = 25000;

  useEffect(() => {
    if (transaction) {
      setTitle(transaction.title || "");
      setCurrencyCode(transaction.currency || baseCurrency || "INR");
      setAmount(transaction.original_amount ?? transaction.amount ?? "");
      setCustomRate(transaction.exchange_rate ? String(transaction.exchange_rate) : "");
      setShowRateInput(false);
      setCategory(transaction.category || "");
      setType(transaction.type || "expense");
      setDate(transaction.date ? transaction.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setIsRecurring(Boolean(transaction.is_recurring));
      setIsUserOverridden(true);
      titleTouchedRef.current = false;
      setScanNotice(null);
      setLowConfidenceFields([]);
    } else {
      setTitle("");
      setCurrencyCode(baseCurrency || "INR");
      setAmount("");
      setCustomRate("");
      setShowRateInput(false);
      setCategory("");
      setType("expense");
      setDate(new Date().toISOString().slice(0, 10));
      setIsRecurring(false);
      setFrequency("monthly");
      setEndDate("");
      setSuggestedCategory(null);
      setSuggestionConfidence(0);
      setSuggestionSource(null);
      setIsUserOverridden(false);
      titleTouchedRef.current = false;
      setScanNotice(null);
      setLowConfidenceFields([]);
    }
  }, [transaction, baseCurrency]);

  const applyExtractedReceipt = (data, source = "OCR") => {
    if (data.merchant) {
      setTitle(data.merchant);
      titleTouchedRef.current = true;
    }
    if (data.amount !== null && data.amount !== undefined) {
      setAmount(data.amount);
    }
    if (data.date) {
      setDate(data.date);
    }
    if (data.category) {
      setCategory(data.category);
      setSuggestedCategory(data.category);
      setSuggestionConfidence(data.confidences?.category || 0.85);
    }
    if (data.type) {
      setType(data.type);
    }

    const lowConf = data.low_confidence_fields || [];
    setLowConfidenceFields(lowConf);

    if (lowConf.length > 0) {
      setScanNotice({
        type: "warning",
        message: `Receipt scanned (${source}). Please double-check highlighted ${lowConf.join(", ")} before saving.`,
      });
    } else {
      setScanNotice({
        type: "success",
        message: `Receipt scanned (${source}) and fields prefilled.`,
      });
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    // Max 5MB validation
    if (file.size > 5 * 1024 * 1024) {
      setScanNotice({
        type: "error",
        message: "Receipt image exceeds 5MB limit. Please upload a smaller image.",
      });
      return;
    }

    setScanning(true);
    setScanNotice(null);
    setLowConfidenceFields([]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await scanReceipt(formData);
      const data = res.data;

      if (data?.success) {
        applyExtractedReceipt(data, "Server OCR");
        return;
      }

      // If server OCR is unavailable on this host, try client-side browser OCR fallback
      if (data?.tesseract_missing) {
        setScanNotice({
          type: "info",
          message: "Host OCR unavailable. Scanning receipt locally in browser...",
        });

        try {
          const { createWorker } = await import(
            /* @vite-ignore */ "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js"
          );
          const worker = await createWorker("eng");
          const ret = await worker.recognize(file);
          await worker.terminate();

          const extractedText = ret?.data?.text;
          if (extractedText && extractedText.trim().length >= 5) {
            const textRes = await scanReceipt({ text: extractedText });
            const textData = textRes.data;
            if (textData?.success) {
              applyExtractedReceipt(textData, "Browser OCR");
              return;
            }
          }
        } catch (clientOcrErr) {
          console.warn("Client-side OCR fallback failed:", clientOcrErr);
        }
      }

      setScanNotice({
        type: "warning",
        message:
          data?.friendly_message ||
          data?.error ||
          "Could not extract text from receipt. You can enter details manually.",
      });
    } catch (err) {
      console.error("Receipt scan failed:", err);

      // Try browser OCR fallback if server error occurs
      try {
        setScanNotice({
          type: "info",
          message: "Server scan error. Attempting local scan in browser...",
        });
        const { createWorker } = await import(
          /* @vite-ignore */ "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js"
        );
        const worker = await createWorker("eng");
        const ret = await worker.recognize(file);
        await worker.terminate();

        const extractedText = ret?.data?.text;
        if (extractedText && extractedText.trim().length >= 5) {
          const textRes = await scanReceipt({ text: extractedText });
          const textData = textRes.data;
          if (textData?.success) {
            applyExtractedReceipt(textData, "Browser OCR");
            return;
          }
        }
      } catch (browserErr) {
        // Fall through to error notice
      }

      setScanNotice({
        type: "warning",
        message:
          err.response?.data?.friendly_message ||
          "Receipt scanning service error. Please enter details manually.",
      });
    } finally {
      setScanning(false);
    }
  };

  // Debounced auto-suggestion when title changes
  useEffect(() => {
    const trimmedTitle = title.trim();

    // If editing and user hasn't actively edited title, do not auto-suggest
    if (isEditing && !titleTouchedRef.current) {
      return;
    }

    if (trimmedTitle.length < 2) {
      setSuggestedCategory(null);
      setSuggestionConfidence(0);
      setSuggestionSource(null);
      return;
    }

    // 1. Instant local override check (remembers user's previous overrides)
    const localOverride = getLocalCategoryOverride(trimmedTitle);
    if (localOverride) {
      setSuggestedCategory(localOverride);
      setSuggestionConfidence(0.99);
      setSuggestionSource("saved_preference");
      if (!isUserOverridden) {
        setCategory(localOverride);
      }
      return;
    }

    // 2. Debounced backend API lookup
    let isCancelled = false;
    setIsSuggesting(true);

    const timer = setTimeout(async () => {
      try {
        const res = await suggestCategory(trimmedTitle);
        if (isCancelled) return;

        const candidate = res.data?.suggested_category;
        const conf = res.data?.confidence || 0;
        const source = res.data?.source || null;

        if (candidate) {
          setSuggestedCategory(candidate);
          setSuggestionConfidence(conf);
          setSuggestionSource(source);

          if (!isUserOverridden) {
            setCategory(candidate);
          }
        } else {
          setSuggestedCategory(null);
          setSuggestionConfidence(0);
          setSuggestionSource(null);
        }
      } catch (err) {
        if (!isCancelled) {
          setSuggestedCategory(null);
          setSuggestionConfidence(0);
        }
      } finally {
        if (!isCancelled) {
          setIsSuggesting(false);
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [title, isEditing, isUserOverridden]);

  const handleTitleChange = (e) => {
    titleTouchedRef.current = true;
    setTitle(e.target.value);
    // If the category was previously auto-suggested or empty, reset override flag so new suggestion applies
    if (!category || category === suggestedCategory) {
      setIsUserOverridden(false);
    }
  };

  const handleCategoryChange = (e) => {
    const selected = e.target.value;
    setCategory(selected);
    setIsUserOverridden(true);
    setLowConfidenceFields((prev) => prev.filter((f) => f !== "category"));

    // When the user overrides or manually chooses a category, remember that choice for next time!
    if (title.trim()) {
      saveLocalCategoryOverride(title.trim(), selected);
    }
  };

  const fetchBudgetStatus = useCallback(async () => {
    try {
      const response = await getSummary();
      setSpent(response.data.expense || 0);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchBudgetStatus();
  }, [fetchBudgetStatus, refreshKeys.transactions]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        amount: Number(amount),
        currency: currencyCode,
        category,
        type,
        date,
      };

      if (currencyCode !== baseCurrency && customRate && Number(customRate) > 0) {
        payload.exchange_rate = Number(customRate);
      }

      if (!isEditing && isRecurring) {
        payload.is_recurring = true;
        payload.frequency = frequency;
        if (endDate) payload.end_date = endDate;
      }

      // Remember merchant-to-category choice for future suggestions
      if (title.trim() && category) {
        saveLocalCategoryOverride(title.trim(), category);
      }

      let res;
      if (isEditing) {
        res = await updateTransaction(transaction.id, payload);
      } else {
        res = await addTransaction(payload);
      }

      if (res.data?.budget_alert) {
        const alert = res.data.budget_alert;
        showToast(
          alert.level === "exceeded" ? "error" : "warning",
          alert.message
        );
      } else {
        showToast(
          "success",
          isEditing
            ? "Transaction updated successfully."
            : isRecurring
            ? "Transaction recorded and recurring rule established."
            : "Transaction recorded successfully."
        );
      }

      triggerRefresh("transactions");
      triggerRefresh("dashboard");
      triggerRefresh("budgets");
      if (isRecurring) {
        triggerRefresh("recurring");
      }

      if (!isEditing) {
        setTitle("");
        setAmount("");
        setCategory("");
        setType("expense");
        setDate(new Date().toISOString().slice(0, 10));
        setIsRecurring(false);
        setFrequency("monthly");
        setEndDate("");
        setSuggestedCategory(null);
        setSuggestionConfidence(0);
        setSuggestionSource(null);
        setIsUserOverridden(false);
        titleTouchedRef.current = false;
        setScanNotice(null);
        setLowConfidenceFields([]);
      }

      if (onSuccess) {
        setTimeout(onSuccess, 600);
      }
    } catch (error) {
      console.error(error);
      showToast(
        "error",
        isEditing ? "Failed to update transaction." : "Failed to record transaction."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = categories.length > 0 && category;
  const percentage = Math.min(Math.round((spent / BUDGET_LIMIT) * 100), 100);

  const getProgressColor = () => {
    if (percentage > 90) return "var(--expense)";
    if (percentage > 70) return "var(--accent)";
    return "var(--accent)";
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <span className="section-label" style={{ color: "var(--text-muted)" }}>
          {isEditing ? "Modify" : "Record"}
        </span>
        <h3 className="text-base font-semibold tracking-tight m-0 mt-1" style={{ color: "var(--text)" }}>
          {isEditing ? "Edit Transaction" : "New Transaction"}
        </h3>
        <p className="text-xs m-0 mt-0.5" style={{ color: "var(--text-muted)" }}>
          {isEditing ? "Update transaction details" : "Record income or expenditure"}
        </p>
      </div>

      {toast && (
        <div className={`toast ${toast.type === "success" ? "toast-success" : "toast-error"}`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Scan Receipt Action (Desktop file upload + Mobile rear camera capture) */}
      {!isEditing && (
        <div
          className="p-3 rounded-xl flex items-center justify-between gap-3 transition-all"
          style={{
            backgroundColor: "var(--surface-2)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--accent)",
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold block truncate" style={{ color: "var(--text)" }}>
                Scan receipt
              </span>
              <span className="text-[11px] block truncate" style={{ color: "var(--text-muted)" }}>
                Upload photo or take picture to prefill fields
              </span>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
            id="receipt-file-input"
          />

          <button
            type="button"
            disabled={scanning}
            onClick={() => fileInputRef.current?.click()}
            className="btn-outline text-xs py-1.5 px-3 cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            {scanning ? (
              <>
                <span
                  className="w-2.5 h-2.5 rounded-full border-2 border-t-transparent animate-spin inline-block"
                  style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
                />
                <span>Scanning...</span>
              </>
            ) : (
              <span>Upload / Camera</span>
            )}
          </button>
        </div>
      )}

      {/* OCR Scan Feedback Banner */}
      {scanNotice && (
        <div
          className="p-3 rounded-lg text-xs flex items-start justify-between gap-2 animate-fade-in"
          style={{
            backgroundColor:
              scanNotice.type === "error"
                ? "rgba(224, 122, 107, 0.12)"
                : scanNotice.type === "warning"
                ? "rgba(212, 180, 131, 0.12)"
                : scanNotice.type === "info"
                ? "rgba(212, 180, 131, 0.08)"
                : "rgba(107, 191, 142, 0.12)",
            border:
              scanNotice.type === "error"
                ? "1px solid rgba(224, 122, 107, 0.3)"
                : scanNotice.type === "warning"
                ? "1px solid rgba(212, 180, 131, 0.3)"
                : scanNotice.type === "info"
                ? "1px solid var(--border)"
                : "1px solid rgba(107, 191, 142, 0.3)",
            color:
              scanNotice.type === "error"
                ? "var(--expense)"
                : scanNotice.type === "warning"
                ? "var(--accent)"
                : scanNotice.type === "info"
                ? "var(--text)"
                : "var(--income)",
          }}
        >
          <span className="leading-relaxed">{scanNotice.message}</span>
          <button
            type="button"
            onClick={() => setScanNotice(null)}
            className="opacity-60 hover:opacity-100 text-xs cursor-pointer ml-1"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="tx-form-title" className="form-label mb-0">
              Title / Description
            </label>
            {lowConfidenceFields.includes("merchant") && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.2 rounded"
                style={{
                  backgroundColor: "rgba(212, 180, 131, 0.12)",
                  border: "1px solid rgba(212, 180, 131, 0.3)",
                  color: "var(--accent)",
                }}
              >
                Needs verification
              </span>
            )}
          </div>
          <input
            id="tx-form-title"
            type="text"
            placeholder="e.g. Starbucks, Swiggy, Uber ride, electricity bill..."
            className="input-field"
            style={{
              borderColor: lowConfidenceFields.includes("merchant")
                ? "var(--accent)"
                : undefined,
            }}
            value={title}
            onChange={(e) => {
              handleTitleChange(e);
              setLowConfidenceFields((prev) => prev.filter((f) => f !== "merchant"));
            }}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="tx-form-amount" className="form-label mb-0">
                Amount ({((currencies || []).find((c) => c.code === currencyCode))?.symbol || "₹"})
              </label>
              {lowConfidenceFields.includes("amount") && (
                <span
                  className="text-[10px] font-medium px-1.5 py-0.2 rounded"
                  style={{
                    backgroundColor: "rgba(212, 180, 131, 0.12)",
                    border: "1px solid rgba(212, 180, 131, 0.3)",
                    color: "var(--accent)",
                  }}
                >
                  Verify
                </span>
              )}
            </div>

            <div className="flex gap-1.5">
              <select
                id="tx-form-currency"
                className="input-field text-xs font-semibold py-1.5 px-2 w-[82px] shrink-0 cursor-pointer"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
                value={currencyCode}
                onChange={(e) => {
                  setCurrencyCode(e.target.value);
                  setCustomRate("");
                }}
              >
                {(currencies || []).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code}
                  </option>
                ))}
              </select>

              <input
                id="tx-form-amount"
                type="number"
                placeholder="0.00"
                min="0.01"
                step="0.01"
                className="input-field tabular-nums flex-1"
                style={{
                  borderColor: lowConfidenceFields.includes("amount")
                    ? "var(--accent)"
                    : undefined,
                }}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setLowConfidenceFields((prev) => prev.filter((f) => f !== "amount"));
                }}
                required
              />
            </div>

            {currencyCode !== baseCurrency && (
              <div className="mt-1 space-y-1">
                <div
                  className="flex items-center justify-between text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  <span className="truncate">
                    ≈{" "}
                    {formatCurrency(
                      (Number(amount) || 0) *
                        (customRate && Number(customRate) > 0
                          ? Number(customRate)
                          : getExchangeRate(currencyCode, baseCurrency))
                    )}{" "}
                    <span className="opacity-75">
                      (1 {currencyCode} ={" "}
                      {Number(
                        customRate && Number(customRate) > 0
                          ? Number(customRate)
                          : getExchangeRate(currencyCode, baseCurrency)
                      ).toFixed(2)}{" "}
                      {baseCurrency})
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRateInput(!showRateInput)}
                    className="text-[10px] underline ml-1 shrink-0 cursor-pointer"
                    style={{ color: "var(--accent)" }}
                  >
                    {showRateInput ? "Auto" : "Rate"}
                  </button>
                </div>

                {showRateInput && (
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>
                      1 {currencyCode} =
                    </span>
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      placeholder={String(getExchangeRate(currencyCode, baseCurrency))}
                      value={customRate}
                      onChange={(e) => setCustomRate(e.target.value)}
                      className="input-field tabular-nums text-[11px] py-0.5 px-2 flex-1"
                    />
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {baseCurrency}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="tx-form-date" className="form-label mb-0">
                Date
              </label>
              {lowConfidenceFields.includes("date") && (
                <span
                  className="text-[10px] font-medium px-1.5 py-0.2 rounded"
                  style={{
                    backgroundColor: "rgba(212, 180, 131, 0.12)",
                    border: "1px solid rgba(212, 180, 131, 0.3)",
                    color: "var(--accent)",
                  }}
                >
                  Verify
                </span>
              )}
            </div>
            <input
              id="tx-form-date"
              type="date"
              className="input-field"
              style={{
                borderColor: lowConfidenceFields.includes("date")
                  ? "var(--accent)"
                  : undefined,
              }}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setLowConfidenceFields((prev) => prev.filter((f) => f !== "date"));
              }}
              required
            />
          </div>

          <div>
            <label htmlFor="tx-form-type" className="form-label mb-1">
              Type
            </label>
            <select
              id="tx-form-type"
              className="input-field"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="tx-form-category" className="form-label mb-0">
              Category
            </label>

            {/* Subtle Suggested badge when current category was auto-suggested */}
            {suggestedCategory && category === suggestedCategory && (
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 transition-all animate-fade-in"
                style={{
                  backgroundColor: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--accent)",
                }}
                title={
                  suggestionSource === "history" || suggestionSource === "saved_preference"
                    ? "Suggested from your past preferences"
                    : `Suggested by keyword match (${Math.round(suggestionConfidence * 100)}% confidence)`
                }
              >
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ backgroundColor: "var(--accent)" }}
                />
                <span>Suggested</span>
              </span>
            )}

            {isSuggesting && !suggestedCategory && (
              <span
                className="text-[10px] font-normal"
                style={{ color: "var(--text-muted)" }}
              >
                Suggesting...
              </span>
            )}
          </div>

          <CategorySelect
            id="tx-form-category"
            value={category}
            onChange={handleCategoryChange}
          />

          {/* User override indicator with option to revert */}
          {suggestedCategory && category !== suggestedCategory && (
            <div
              className="text-[11px] mt-1.5 flex items-center justify-between animate-fade-in"
              style={{ color: "var(--text-muted)" }}
            >
              <span>
                Suggested was{" "}
                <button
                  type="button"
                  onClick={() => {
                    setCategory(suggestedCategory);
                    setIsUserOverridden(false);
                  }}
                  className="underline hover:opacity-80 cursor-pointer font-medium"
                  style={{ color: "var(--accent)" }}
                >
                  {suggestedCategory}
                </button>
              </span>
              <span className="text-[10px] opacity-75">Preference remembered</span>
            </div>
          )}
        </div>

        {/* Option to mark as recurring (for new transactions) */}
        {!isEditing && (
          <div
            className="p-3 rounded-lg space-y-2.5"
            style={{
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
            }}
          >
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="accent-[var(--accent)] cursor-pointer"
                id="checkbox-is-recurring"
              />
              <span style={{ color: "var(--text)" }}>Repeat this transaction (recurring rule)</span>
            </label>

            {isRecurring && (
              <div className="grid grid-cols-2 gap-2.5 pt-1 animate-fade-in">
                <div>
                  <label htmlFor="tx-recurring-freq" className="form-label text-[10px]">
                    Frequency
                  </label>
                  <select
                    id="tx-recurring-freq"
                    className="input-field text-xs py-1.5"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="tx-recurring-end" className="form-label text-[10px]">
                    End Date (Optional)
                  </label>
                  <input
                    id="tx-recurring-end"
                    type="date"
                    className="input-field text-xs py-1.5"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}


        <div className="flex items-center gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn-outline flex-1 py-2.5"
              disabled={submitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className={`btn-accent ${onCancel ? "flex-1" : "w-full"} py-2.5`}
          >
            {submitting
              ? "Processing..."
              : isEditing
              ? "Save Changes"
              : "Add Transaction"}
          </button>
        </div>
      </form>

      {/* Budget Limit Tracker Widget */}
      <div
        className="pt-4 space-y-2"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between text-xs font-medium">
          <span style={{ color: "var(--text-muted)" }}>Monthly Budget Target</span>
          <span className="tabular-nums" style={{ color: "var(--text)" }}>{percentage}%</span>
        </div>
        <div className="budget-progress-track">
          <div
            className="budget-progress-fill"
            style={{
              width: `${percentage}%`,
              backgroundColor: getProgressColor(),
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>
          <span>{displayMoney(spent)} spent</span>
          <span>Limit: {displayMoney(BUDGET_LIMIT)}</span>
        </div>
      </div>
    </div>
  );
}
