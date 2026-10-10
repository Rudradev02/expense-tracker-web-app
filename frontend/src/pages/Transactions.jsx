import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  getTransactions,
  deleteTransaction,
  exportTransactions,
  loadSampleData,
} from "../services/api";

import { useCategories } from "../context/CategoriesContext";
import { useAppRefresh } from "../context/AppRefreshContext";
import { useCurrency } from "../context/CurrencyContext";
import TransactionTable from "../components/TransactionTable";
import TransactionForm from "../components/TransactionForm";

export default function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories } = useCategories();
  const { refreshKeys, triggerRefresh } = useAppRefresh();
  const { activeCurrencyInfo } = useCurrency();

  // Read URL query parameters
  const urlSearch = searchParams.get("search") || searchParams.get("q") || "";
  const urlType = searchParams.get("type") || "all";
  const urlCategoryParam = searchParams.get("category") || "";
  const urlCategories = useMemo(() => {
    return urlCategoryParam
      ? urlCategoryParam
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
      : [];
  }, [urlCategoryParam]);
  const urlStartDate = searchParams.get("start_date") || "";
  const urlEndDate = searchParams.get("end_date") || "";
  const urlMinAmount = searchParams.get("min_amount") || "";
  const urlMaxAmount = searchParams.get("max_amount") || "";
  const urlSortBy = searchParams.get("sort_by") || "date";
  const urlSortOrder = searchParams.get("sort_order") || "desc";

  // Local state for debounced search and controls
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalTransaction, setModalTransaction] = useState(null);
  const [showFilterDetails, setShowFilterDetails] = useState(false);

  // Export states
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState(null);

  // Soft delete state & ref
  const [deleteToast, setDeleteToast] = useState(null);
  const pendingDeleteRef = useRef(null);

  // Data fetching states
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const categoryDropdownRef = useRef(null);
  const exportDropdownRef = useRef(null);


  // Soft delete handler (6 seconds undo toast)
  const handleInitiateDelete = useCallback(
    (tx) => {
      // If there is already a pending delete, commit it immediately
      if (pendingDeleteRef.current) {
        const prev = pendingDeleteRef.current;
        clearTimeout(prev.timerId);
        deleteTransaction(prev.transaction.id)
          .then(() => {
            triggerRefresh("dashboard");
            triggerRefresh("budgets");
          })
          .catch(console.error);
      }

      // Soft delete: remove immediately from UI
      setTransactions((prev) => prev.filter((item) => item.id !== tx.id));

      // Set 6-second timer
      const timerId = setTimeout(async () => {
        try {
          await deleteTransaction(tx.id);
          triggerRefresh("dashboard");
          triggerRefresh("budgets");
        } catch (err) {
          console.error("Failed to delete transaction on server:", err);
          setTransactions((prev) => [tx, ...prev]);
        } finally {
          setDeleteToast(null);
          pendingDeleteRef.current = null;
        }
      }, 6000);

      const pending = { transaction: tx, timerId };
      pendingDeleteRef.current = pending;
      setDeleteToast(pending);
    },
    [triggerRefresh]
  );

  const handleUndoDelete = useCallback(() => {
    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timerId);
      const restored = pendingDeleteRef.current.transaction;
      setTransactions((prev) => [restored, ...prev]);
      pendingDeleteRef.current = null;
      setDeleteToast(null);
    }
  }, []);

  const handleDismissDeleteToast = useCallback(() => {
    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timerId);
      const tx = pendingDeleteRef.current.transaction;
      deleteTransaction(tx.id)
        .then(() => {
          triggerRefresh("dashboard");
          triggerRefresh("budgets");
        })
        .catch(console.error);
      pendingDeleteRef.current = null;
      setDeleteToast(null);
    }
  }, [triggerRefresh]);

  // Cleanup on unmount: ensure pending delete is executed on server
  useEffect(() => {
    return () => {
      if (pendingDeleteRef.current) {
        clearTimeout(pendingDeleteRef.current.timerId);
        deleteTransaction(pendingDeleteRef.current.transaction.id).catch(
          console.error
        );
      }
    };
  }, []);

  // Sync search input when URL changes (e.g. browser history or reset)
  useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch]);

  // Handle auto-focus search when triggered via shortcut (/ or Command Palette)
  useEffect(() => {
    if (searchParams.get("focusSearch") === "1") {
      const timer = setTimeout(() => {
        const el = document.getElementById("search-transactions-input");
        if (el) {
          el.focus();
          el.select?.();
        }
      }, 50);

      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("focusSearch");
          return next;
        },
        { replace: true }
      );

      return () => clearTimeout(timer);
    }
  }, [searchParams, setSearchParams]);

  // Helper to update URL params
  const updateFilterParams = useCallback(
    (updates) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);

          Object.entries(updates).forEach(([key, val]) => {
            if (
              val === undefined ||
              val === null ||
              val === "" ||
              (Array.isArray(val) && val.length === 0) ||
              (key === "type" && val === "all")
            ) {
              params.delete(key);
            } else if (Array.isArray(val)) {
              params.set(key, val.join(","));
            } else {
              params.set(key, String(val));
            }
          });

          return params;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // 300ms Debounce for search box
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== urlSearch) {
        updateFilterParams({ search: searchInput.trim() });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, urlSearch, updateFilterParams]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target)
      ) {
        setCategoryDropdownOpen(false);
      }
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target)
      ) {
        setExportDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-dismiss export feedback toast after 4 seconds
  useEffect(() => {
    if (exportFeedback) {
      const timer = setTimeout(() => {
        setExportFeedback(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [exportFeedback]);


  // Fetch transactions using query params
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (urlSearch) params.search = urlSearch;
      if (urlType && urlType !== "all") params.type = urlType;
      if (urlCategories.length > 0) params.category = urlCategories.join(",");
      if (urlStartDate) params.start_date = urlStartDate;
      if (urlEndDate) params.end_date = urlEndDate;
      if (urlMinAmount) params.min_amount = urlMinAmount;
      if (urlMaxAmount) params.max_amount = urlMaxAmount;
      params.sort_by = urlSortBy;
      params.sort_order = urlSortOrder;

      const response = await getTransactions(params);
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.items || [];
      setTransactions(data);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      setError("Unable to load transactions. Please check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }, [
    urlSearch,
    urlType,
    urlCategories,
    urlStartDate,
    urlEndDate,
    urlMinAmount,
    urlMaxAmount,
    urlSortBy,
    urlSortOrder,
  ]);

  const handleLoadSampleData = useCallback(async () => {
    try {
      setLoading(true);
      await loadSampleData();
      triggerRefresh("dashboard");
      triggerRefresh("transactions");
      triggerRefresh("budgets");
      await fetchTransactions();
    } catch (err) {
      console.error("Failed to load sample data:", err);
      setError("Failed to load sample data. Please try again.");
      setLoading(false);
    }
  }, [triggerRefresh, fetchTransactions]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, refreshKeys.transactions]);

  // Handle column header sort
  const handleSort = (columnKey) => {
    if (urlSortBy === columnKey) {
      updateFilterParams({
        sort_order: urlSortOrder === "asc" ? "desc" : "asc",
      });
    } else {
      updateFilterParams({
        sort_by: columnKey,
        sort_order: columnKey === "amount" ? "desc" : columnKey === "date" ? "desc" : "asc",
      });
    }
  };

  // Category multi-select toggle
  const handleToggleCategory = (catName) => {
    let nextCategories;
    if (urlCategories.includes(catName)) {
      nextCategories = urlCategories.filter((c) => c !== catName);
    } else {
      nextCategories = [...urlCategories, catName];
    }
    updateFilterParams({ category: nextCategories });
  };

  const handleSelectAllCategories = () => {
    const allNames = categories.map((c) => c.name);
    updateFilterParams({ category: allNames });
  };

  const handleClearCategories = () => {
    updateFilterParams({ category: [] });
  };

  // Immediate search clear
  const handleClearSearch = () => {
    setSearchInput("");
    updateFilterParams({ search: "" });
  };

  // Clear all filters
  const handleClearAllFilters = () => {
    setSearchInput("");
    setSearchParams(
      {
        sort_by: "date",
        sort_order: "desc",
      },
      { replace: true }
    );
  };

  // Input validation indicators
  const isDateRangeInvalid =
    Boolean(urlStartDate && urlEndDate && new Date(urlStartDate) > new Date(urlEndDate));

  const isAmountRangeInvalid =
    Boolean(
      urlMinAmount &&
      urlMaxAmount &&
      parseFloat(urlMinAmount) > parseFloat(urlMaxAmount)
    );

  // Check if any filter is active
  const isFiltered = Boolean(
    urlSearch ||
    (urlType && urlType !== "all") ||
    urlCategories.length > 0 ||
    urlStartDate ||
    urlEndDate ||
    urlMinAmount ||
    urlMaxAmount
  );

  // Handle export (CSV / PDF)
  const handleExport = async (format) => {
    if (isExporting) return;
    if (isDateRangeInvalid || isAmountRangeInvalid) {
      setExportFeedback({
        type: "error",
        message: "Please correct invalid filter ranges before exporting.",
      });
      setExportDropdownOpen(false);
      return;
    }

    try {
      setIsExporting(true);
      setExportDropdownOpen(false);

      const exportParams = { format };
      if (urlSearch) exportParams.search = urlSearch;
      if (urlType && urlType !== "all") exportParams.type = urlType;
      if (urlCategories.length > 0) exportParams.category = urlCategories.join(",");
      if (urlStartDate) exportParams.start_date = urlStartDate;
      if (urlEndDate) exportParams.end_date = urlEndDate;
      if (urlMinAmount) exportParams.min_amount = urlMinAmount;
      if (urlMaxAmount) exportParams.max_amount = urlMaxAmount;
      exportParams.sort_by = urlSortBy;
      exportParams.sort_order = urlSortOrder;

      const res = await exportTransactions(exportParams);
      const mimeType = format === "csv" ? "text/csv;charset=utf-8" : "application/pdf";
      const blob = new Blob([res.data], { type: mimeType });

      let filename = `transactions_${new Date().toISOString().slice(0, 10)}.${format}`;
      const disposition = res.headers ? res.headers["content-disposition"] : null;
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setExportFeedback({
        type: "success",
        message: `Transactions exported to ${format.toUpperCase()} successfully.`,
      });
    } catch (err) {
      console.error("Export failed:", err);
      setExportFeedback({
        type: "error",
        message: `Failed to export ${format.toUpperCase()}. Please check your connection.`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="section-label" style={{ color: "var(--text-muted)" }}>
            Ledger
          </span>
          <div className="flex items-center gap-3 mt-1">
            <h2 className="text-2xl font-bold tracking-tight m-0" style={{ color: "var(--text)" }}>
              Transaction History
            </h2>
            <div className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden text-xs">
              <span
                className="px-2.5 py-1 font-semibold"
                style={{ backgroundColor: "var(--surface-2)", color: "var(--accent)" }}
              >
                Ledger
              </span>
              <Link
                to="/recurring"
                className="px-2.5 py-1 no-underline transition-colors hover:text-[var(--text)]"
                style={{ color: "var(--text-muted)" }}
              >
                Recurring Rules
              </Link>
            </div>
          </div>
          <p className="text-xs sm:text-sm mt-0.5 m-0" style={{ color: "var(--text-muted)" }}>
            Review, filter, and audit recorded revenue and disbursements
          </p>
        </div>


        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Export Dropdown */}
          <div className="export-dropdown" ref={exportDropdownRef}>
            <button
              type="button"
              id="btn-export-transactions"
              onClick={() => setExportDropdownOpen((prev) => !prev)}
              disabled={isExporting}
              className="btn-secondary flex items-center gap-2 py-2 px-3 text-xs"
              aria-haspopup="true"
              aria-expanded={exportDropdownOpen}
              title="Export transactions"
            >
              {isExporting ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-[var(--text-muted)] border-t-[var(--accent)] rounded-full animate-spin" />
              ) : (
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              )}
              <span>{isExporting ? "Exporting..." : "Export"}</span>
              <span className="text-[10px] opacity-70 ml-0.5">▼</span>
            </button>

            {exportDropdownOpen && (
              <div className="export-dropdown-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  id="btn-export-csv"
                  onClick={() => handleExport("csv")}
                  className="export-dropdown-item"
                >
                  <svg className="h-3.5 w-3.5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Export as CSV</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  id="btn-export-pdf"
                  onClick={() => handleExport("pdf")}
                  className="export-dropdown-item"
                >
                  <svg className="h-3.5 w-3.5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span>Export as PDF</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setModalTransaction(null);
              setShowModal(true);
            }}
            className="btn-accent"
            id="btn-add-transaction"
            title="New transaction (N)"
          >
            <span className="text-base leading-none">+</span>
            <span>Add Transaction</span>
          </button>
        </div>
      </div>


      <section
        className="card overflow-hidden"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
        }}
      >
        {/* Filter Controls Toolbar */}
        <div
          className="p-4 sm:p-5 flex flex-col gap-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {/* Top Row: Search + Type Segmented Control + Filter Toggle */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input (Debounced 300ms) */}
            <div className="relative flex-1 max-w-md">
              <svg
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "var(--text-muted)" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                id="search-transactions-input"
                type="text"
                placeholder="Search description or notes..."
                title="Search transactions (/)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="input-field pl-10 pr-9 py-2 text-xs"
              />
              {!searchInput ? (
                <kbd
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono rounded select-none hidden sm:inline-block"
                  style={{
                    backgroundColor: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                  }}
                  title="Press / to focus search"
                >
                  /
                </kbd>
              ) : (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs cursor-pointer border-none bg-transparent p-0 leading-none"
                  style={{ color: "var(--text-muted)" }}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Type Filter Pills (All / Income / Expense) */}
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg overflow-hidden border border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => updateFilterParams({ type: "all" })}
                  className={`filter-seg-btn ${urlType === "all" ? "active" : ""}`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => updateFilterParams({ type: "income" })}
                  className={`filter-seg-btn ${urlType === "income" ? "active" : ""}`}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => updateFilterParams({ type: "expense" })}
                  className={`filter-seg-btn ${urlType === "expense" ? "active" : ""}`}
                >
                  Expense
                </button>
              </div>

              {/* Toggle detailed filters button */}
              <button
                type="button"
                onClick={() => setShowFilterDetails((prev) => !prev)}
                className={`btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 ${
                  showFilterDetails || urlStartDate || urlEndDate || urlMinAmount || urlMaxAmount || urlCategories.length > 0
                    ? "border-[var(--accent)]"
                    : ""
                }`}
                title="Toggle detailed filters"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
                <span>Filters</span>
                {(urlCategories.length > 0 || urlStartDate || urlEndDate || urlMinAmount || urlMaxAmount) && (
                  <span className="badge-count text-[10px] h-4 min-w-4 px-1">
                    {(urlCategories.length > 0 ? 1 : 0) +
                      (urlStartDate || urlEndDate ? 1 : 0) +
                      (urlMinAmount || urlMaxAmount ? 1 : 0)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Secondary Filter Row: Category Multi-select, Date Range, Amount Range */}
          {(showFilterDetails || urlCategories.length > 0 || urlStartDate || urlEndDate || urlMinAmount || urlMaxAmount) && (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3"
              style={{ borderTop: "1px dashed var(--border)" }}
            >
              {/* Category Multi-select Dropdown */}
              <div className="relative" ref={categoryDropdownRef}>
                <label className="form-label text-[10px]">Category</label>
                <button
                  type="button"
                  onClick={() => setCategoryDropdownOpen((prev) => !prev)}
                  className="input-field py-2 text-xs flex items-center justify-between text-left cursor-pointer"
                  id="category-multiselect-button"
                >
                  <span className="truncate">
                    {urlCategories.length === 0
                      ? "All Categories"
                      : `${urlCategories.length} selected`}
                  </span>
                  <span className="text-[10px] opacity-70 ml-2">▼</span>
                </button>

                {categoryDropdownOpen && (
                  <div className="filter-dropdown-menu">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border)] text-[11px]">
                      <button
                        type="button"
                        onClick={handleSelectAllCategories}
                        className="text-[11px] font-medium bg-transparent border-none cursor-pointer p-0 hover:underline"
                        style={{ color: "var(--accent)" }}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleClearCategories}
                        className="text-[11px] font-medium bg-transparent border-none cursor-pointer p-0 hover:underline"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Clear
                      </button>
                    </div>

                    <div className="space-y-1">
                      {categories.map((cat) => {
                        const isChecked = urlCategories.includes(cat.name);
                        return (
                          <label
                            key={cat.id}
                            className="category-option-item"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleCategory(cat.name)}
                              className="accent-[var(--accent)] cursor-pointer"
                            />
                            <span className="truncate">{cat.name}</span>
                          </label>
                        );
                      })}
                      {categories.length === 0 && (
                        <div className="text-xs p-2 text-center" style={{ color: "var(--text-muted)" }}>
                          No categories defined
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Start Date */}
              <div>
                <label className="form-label text-[10px]" htmlFor="filter-start-date">
                  From Date
                </label>
                <input
                  id="filter-start-date"
                  type="date"
                  value={urlStartDate}
                  onChange={(e) =>
                    updateFilterParams({ start_date: e.target.value })
                  }
                  className="input-field py-1.5 text-xs"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="form-label text-[10px]" htmlFor="filter-end-date">
                  To Date
                </label>
                <input
                  id="filter-end-date"
                  type="date"
                  value={urlEndDate}
                  onChange={(e) =>
                    updateFilterParams({ end_date: e.target.value })
                  }
                  className="input-field py-1.5 text-xs"
                />
              </div>

              {/* Min & Max Amount */}
              <div>
                <label className="form-label text-[10px]">
                  Amount Range ({activeCurrencyInfo?.symbol || "₹"})
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="filter-min-amount"
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={urlMinAmount}
                    onChange={(e) =>
                      updateFilterParams({ min_amount: e.target.value })
                    }
                    className="input-field py-1.5 text-xs"
                  />
                  <span style={{ color: "var(--text-muted)" }} className="text-xs">–</span>
                  <input
                    id="filter-max-amount"
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={urlMaxAmount}
                    onChange={(e) =>
                      updateFilterParams({ max_amount: e.target.value })
                    }
                    className="input-field py-1.5 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Input Validation Alerts */}
          {isDateRangeInvalid && (
            <div
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                backgroundColor: "rgba(224, 122, 107, 0.12)",
                border: "1px solid rgba(224, 122, 107, 0.25)",
                color: "var(--expense)",
              }}
            >
              Start date cannot be later than end date.
            </div>
          )}
          {isAmountRangeInvalid && (
            <div
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                backgroundColor: "rgba(224, 122, 107, 0.12)",
                border: "1px solid rgba(224, 122, 107, 0.25)",
                color: "var(--expense)",
              }}
            >
              Minimum amount cannot exceed maximum amount.
            </div>
          )}
        </div>

        {/* Active Filters Bar (Chips & Clear all) */}
        {isFiltered && (
          <div
            className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-2.5 text-xs"
            style={{
              backgroundColor: "var(--surface-2)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Active Filters:
            </span>

            {/* Search Chip */}
            {urlSearch && (
              <span className="filter-chip">
                <span>Search: &quot;{urlSearch}&quot;</span>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="filter-chip-remove"
                  title="Remove search filter"
                  aria-label="Remove search filter"
                >
                  ✕
                </button>
              </span>
            )}

            {/* Type Chip */}
            {urlType && urlType !== "all" && (
              <span className="filter-chip">
                <span className="capitalize">Type: {urlType}</span>
                <button
                  type="button"
                  onClick={() => updateFilterParams({ type: "all" })}
                  className="filter-chip-remove"
                  title="Remove type filter"
                  aria-label="Remove type filter"
                >
                  ✕
                </button>
              </span>
            )}

            {/* Category Chips */}
            {urlCategories.map((cat) => (
              <span key={cat} className="filter-chip">
                <span>Category: {cat}</span>
                <button
                  type="button"
                  onClick={() => handleToggleCategory(cat)}
                  className="filter-chip-remove"
                  title={`Remove ${cat} category`}
                  aria-label={`Remove ${cat} category`}
                >
                  ✕
                </button>
              </span>
            ))}

            {/* Date Range Chip */}
            {(urlStartDate || urlEndDate) && (
              <span className="filter-chip">
                <span>
                  Date: {urlStartDate || "Any"} → {urlEndDate || "Now"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateFilterParams({ start_date: "", end_date: "" })
                  }
                  className="filter-chip-remove"
                  title="Remove date filter"
                  aria-label="Remove date filter"
                >
                  ✕
                </button>
              </span>
            )}

            {/* Amount Range Chip */}
            {(urlMinAmount || urlMaxAmount) && (
              <span className="filter-chip">
                <span>
                  Amount: {activeCurrencyInfo?.symbol || "₹"}{urlMinAmount || "0"} – {activeCurrencyInfo?.symbol || "₹"}{urlMaxAmount || "∞"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateFilterParams({ min_amount: "", max_amount: "" })
                  }
                  className="filter-chip-remove"
                  title="Remove amount filter"
                  aria-label="Remove amount filter"
                >
                  ✕
                </button>
              </span>
            )}

            {/* Clear All Button */}
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="ml-auto text-xs font-semibold cursor-pointer border-none bg-transparent hover:underline"
              style={{ color: "var(--accent)" }}
              id="btn-clear-all-filters"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            className="m-4 p-3 rounded-lg flex items-center justify-between text-xs"
            style={{
              backgroundColor: "rgba(224, 122, 107, 0.12)",
              border: "1px solid rgba(224, 122, 107, 0.25)",
              color: "var(--expense)",
            }}
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchTransactions}
              className="btn-secondary py-1 px-2.5 text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {/* Ledger Table with sorting, filtered empty state, and row actions */}
        <TransactionTable
          transactions={transactions}
          refreshTransactions={fetchTransactions}
          sortBy={urlSortBy}
          sortOrder={urlSortOrder}
          onSort={handleSort}
          isFiltered={isFiltered}
          onClearFilters={handleClearAllFilters}
          loading={loading}
          onEdit={(t) => {
            setModalTransaction(t);
            setShowModal(true);
          }}
          onDelete={handleInitiateDelete}
          onOpenAdd={() => {
            setModalTransaction(null);
            setShowModal(true);
          }}
          onLoadSampleData={handleLoadSampleData}
        />
      </section>

      {/* Unified Add / Edit Transaction Modal Overlay */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in"
          style={{ backgroundColor: "rgba(11, 11, 12, 0.75)" }}
          onClick={() => {
            setShowModal(false);
            setModalTransaction(null);
          }}
        >
          <div
            className="w-full max-w-lg p-6 relative animate-slide-up"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              maxHeight: "min(90vh, 820px)",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowModal(false);
                setModalTransaction(null);
              }}
              className="btn-icon absolute top-4 right-4"
              aria-label="Close modal"
            >
              ✕
            </button>
            <TransactionForm
              transaction={modalTransaction}
              onSuccess={() => {
                setShowModal(false);
                setModalTransaction(null);
                fetchTransactions();
              }}
              onCancel={() => {
                setShowModal(false);
                setModalTransaction(null);
              }}
            />
          </div>
        </div>
      )}

      {/* 6-Second Soft Delete Undo Toast */}
      {deleteToast && (
        <div className="undo-toast" role="status" aria-live="polite">
          <div className="flex items-center gap-2">
            <span>Transaction deleted.</span>
            <button
              type="button"
              onClick={handleUndoDelete}
              className="undo-toast-btn"
              id="btn-undo-delete"
            >
              Undo
            </button>
          </div>
          <button
            type="button"
            onClick={handleDismissDeleteToast}
            className="undo-toast-close"
            aria-label="Dismiss delete toast"
          >
            ✕
          </button>
        </div>
      )}

      {/* Export Feedback Toast */}
      {exportFeedback && (
        <div
          className={`feedback-toast ${exportFeedback.type}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            {exportFeedback.type === "success" ? (
              <span style={{ color: "var(--income)", fontWeight: "bold" }}>✓</span>
            ) : (
              <span style={{ color: "var(--expense)", fontWeight: "bold" }}>✕</span>
            )}
            <span>{exportFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportFeedback(null)}
            className="feedback-toast-close"
            aria-label="Dismiss export toast"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
