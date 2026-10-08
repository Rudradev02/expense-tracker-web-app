import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  getSummary,
  getTransactions,
  deleteTransaction,
  getCategories,
  getBudgets,
  loadSampleData,
  getForecast,
} from "../services/api";
import { useAppRefresh } from "../context/AppRefreshContext";
import { useCurrency } from "../context/CurrencyContext";
import SummaryCard from "../components/SummaryCard";
import ExpenseCharts from "../components/ExpenseCharts";
import TransactionForm from "../components/TransactionForm";
import BudgetWidget from "../components/BudgetWidget";
import InsightsCard from "../components/InsightsCard";
import ForecastCard from "../components/ForecastCard";
import OnboardingChecklist from "../components/OnboardingChecklist";
import EmptyState from "../components/EmptyState";

const RANGE_PRESETS = [
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "3_months", label: "3 months" },
  { id: "this_year", label: "This year" },
  { id: "custom", label: "Custom" },
];

function formatDateYMD(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3) return dateStr;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function calculatePresetDates(preset, customStart, customEnd) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (preset === "this_month") {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const prevStart = new Date(year, month - 1, 1);
    const prevEnd = new Date(year, month, 0);
    return {
      start_date: formatDateYMD(start),
      end_date: formatDateYMD(end),
      prev_start_date: formatDateYMD(prevStart),
      prev_end_date: formatDateYMD(prevEnd),
    };
  }

  if (preset === "last_month") {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const prevStart = new Date(year, month - 2, 1);
    const prevEnd = new Date(year, month - 1, 0);
    return {
      start_date: formatDateYMD(start),
      end_date: formatDateYMD(end),
      prev_start_date: formatDateYMD(prevStart),
      prev_end_date: formatDateYMD(prevEnd),
    };
  }

  if (preset === "3_months") {
    const start = new Date(year, month - 2, 1);
    const end = new Date(year, month + 1, 0);
    const prevStart = new Date(year, month - 5, 1);
    const prevEnd = new Date(year, month - 2, 0);
    return {
      start_date: formatDateYMD(start),
      end_date: formatDateYMD(end),
      prev_start_date: formatDateYMD(prevStart),
      prev_end_date: formatDateYMD(prevEnd),
    };
  }

  if (preset === "this_year") {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const prevStart = new Date(year - 1, 0, 1);
    const prevEnd = new Date(year - 1, 11, 31);
    return {
      start_date: formatDateYMD(start),
      end_date: formatDateYMD(end),
      prev_start_date: formatDateYMD(prevStart),
      prev_end_date: formatDateYMD(prevEnd),
    };
  }

  if (preset === "custom" && customStart && customEnd) {
    const sParts = customStart.split("-").map(Number);
    const eParts = customEnd.split("-").map(Number);
    const s = new Date(sParts[0], sParts[1] - 1, sParts[2]);
    const e = new Date(eParts[0], eParts[1] - 1, eParts[2]);
    const durationMs = e.getTime() - s.getTime();
    const prevEnd = new Date(s.getTime() - 24 * 60 * 60 * 1000);
    const prevStart = new Date(prevEnd.getTime() - durationMs);
    return {
      start_date: customStart,
      end_date: customEnd,
      prev_start_date: formatDateYMD(prevStart),
      prev_end_date: formatDateYMD(prevEnd),
    };
  }

  // Fallback: this month
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const prevStart = new Date(year, month - 1, 1);
  const prevEnd = new Date(year, month, 0);
  return {
    start_date: formatDateYMD(start),
    end_date: formatDateYMD(end),
    prev_start_date: formatDateYMD(prevStart),
    prev_end_date: formatDateYMD(prevEnd),
  };
}

export default function Dashboard() {
  const { refreshKeys, triggerRefresh } = useAppRefresh();
  const { formatCurrency, baseCurrency } = useCurrency();
  const [summary, setSummary] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalTransaction, setModalTransaction] = useState(null);

  // Onboarding counts & sample data state
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [budgetsCount, setBudgetsCount] = useState(0);
  const [totalTxCount, setTotalTxCount] = useState(0);
  const [loadingSample, setLoadingSample] = useState(false);

  // Next-month spending forecast state
  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [forecastError, setForecastError] = useState(null);

  // Date range switcher state & localStorage persistence
  const [selectedPreset, setSelectedPreset] = useState(() => {
    return localStorage.getItem("dashboard_date_preset") || "this_month";
  });

  const [customRange, setCustomRange] = useState(() => {
    try {
      const saved = localStorage.getItem("dashboard_custom_range");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.start_date && parsed.end_date) return parsed;
      }
    } catch (e) {}
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start_date: formatDateYMD(start),
      end_date: formatDateYMD(end),
    };
  });

  // Custom popover state
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [tempStart, setTempStart] = useState(customRange.start_date);
  const [tempEnd, setTempEnd] = useState(customRange.end_date);
  const [customError, setCustomError] = useState(null);
  const customPickerRef = useRef(null);

  // Active dates calculated from preset or custom dates
  const activeDates = useMemo(() => {
    return calculatePresetDates(
      selectedPreset,
      customRange.start_date,
      customRange.end_date
    );
  }, [selectedPreset, customRange]);

  // Sync temp dates when custom picker opens
  useEffect(() => {
    if (showCustomPicker) {
      setTempStart(customRange.start_date);
      setTempEnd(customRange.end_date);
      setCustomError(null);
    }
  }, [showCustomPicker, customRange]);

  // Click outside listener for custom date range picker popover
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        customPickerRef.current &&
        !customPickerRef.current.contains(event.target)
      ) {
        setShowCustomPicker(false);
      }
    }
    if (showCustomPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCustomPicker]);

  // Soft delete state & ref
  const [deleteToast, setDeleteToast] = useState(null);
  const pendingDeleteRef = useRef(null);

  // Soft delete handler (6 seconds undo toast)
  const handleInitiateDelete = useCallback(
    (tx) => {
      if (pendingDeleteRef.current) {
        const prev = pendingDeleteRef.current;
        clearTimeout(prev.timerId);
        deleteTransaction(prev.transaction.id)
          .then(() => {
            triggerRefresh("transactions");
            triggerRefresh("budgets");
          })
          .catch(console.error);
      }

      // Remove from UI immediately
      setRecentTransactions((prev) => prev.filter((item) => item.id !== tx.id));

      const timerId = setTimeout(async () => {
        try {
          await deleteTransaction(tx.id);
          triggerRefresh("transactions");
          triggerRefresh("budgets");
          triggerRefresh("dashboard");
        } catch (err) {
          console.error("Failed to delete transaction:", err);
          setRecentTransactions((prev) => [tx, ...prev]);
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
      setRecentTransactions((prev) => [restored, ...prev]);
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
          triggerRefresh("transactions");
          triggerRefresh("budgets");
          triggerRefresh("dashboard");
        })
        .catch(console.error);
      pendingDeleteRef.current = null;
      setDeleteToast(null);
    }
  }, [triggerRefresh]);

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

  const fetchDashboardData = useCallback(async (isSubsequent = false) => {
    try {
      if (isSubsequent) {
        setIsRefetching(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const [summaryRes, transRes, catRes, budgetRes] = await Promise.all([
        getSummary(activeDates),
        getTransactions(),
        getCategories().catch(() => ({ data: [] })),
        getBudgets().catch(() => ({ data: [] })),
      ]);
      setSummary(summaryRes.data);
      const txData = Array.isArray(transRes.data)
        ? transRes.data
        : transRes.data?.items || [];
      setRecentTransactions(txData.slice(0, 5));
      setTotalTxCount(txData.length);
      setCategoriesCount(Array.isArray(catRes.data) ? catRes.data.length : 0);
      setBudgetsCount(Array.isArray(budgetRes.data) ? budgetRes.data.length : 0);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
      setIsRefetching(false);
    }
  }, [activeDates]);

  const handleLoadSampleData = useCallback(async () => {
    try {
      setLoadingSample(true);
      await loadSampleData();
      triggerRefresh("dashboard");
      triggerRefresh("transactions");
      triggerRefresh("budgets");
      triggerRefresh("categories");
      await fetchDashboardData(true);
    } catch (err) {
      console.error("Failed to load sample data:", err);
      setError("Failed to load sample data. Please try again.");
    } finally {
      setLoadingSample(false);
    }
  }, [triggerRefresh, fetchDashboardData]);

  const fetchForecastData = useCallback(async () => {
    try {
      setForecastLoading(true);
      setForecastError(null);
      const res = await getForecast();
      setForecast(res.data);
    } catch (err) {
      console.error("Error fetching forecast:", err);
      setForecastError("Failed to calculate next-month spending forecast.");
    } finally {
      setForecastLoading(false);
    }
  }, []);

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchDashboardData(false);
      fetchForecastData();
    } else {
      fetchDashboardData(true);
    }
  }, [activeDates, refreshKeys.dashboard, fetchDashboardData]);

  // Refetch forecast whenever dashboard or transactions or recurring rules refresh
  useEffect(() => {
    fetchForecastData();
  }, [refreshKeys.dashboard, refreshKeys.transactions, refreshKeys.recurring, fetchForecastData]);

  const handlePresetClick = (presetId) => {
    if (presetId === "custom") {
      if (selectedPreset === "custom") {
        setShowCustomPicker((prev) => !prev);
      } else {
        setSelectedPreset("custom");
        localStorage.setItem("dashboard_date_preset", "custom");
        setShowCustomPicker(true);
      }
      return;
    }

    setShowCustomPicker(false);
    setSelectedPreset(presetId);
    localStorage.setItem("dashboard_date_preset", presetId);
  };

  const handleApplyCustomRange = (e) => {
    if (e) e.preventDefault();
    if (!tempStart || !tempEnd) {
      setCustomError("Please select both start and end dates.");
      return;
    }
    if (tempStart > tempEnd) {
      setCustomError("Start date cannot be after end date.");
      return;
    }

    const newRange = { start_date: tempStart, end_date: tempEnd };
    setCustomRange(newRange);
    setSelectedPreset("custom");
    localStorage.setItem("dashboard_date_preset", "custom");
    localStorage.setItem("dashboard_custom_range", JSON.stringify(newRange));
    setShowCustomPicker(false);
    setCustomError(null);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const username = localStorage.getItem("username") || "Rudra";

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="skeleton h-8 w-56" style={{ height: "32px", width: "220px" }} />
            <div className="skeleton h-4 w-40" style={{ height: "16px", width: "160px" }} />
          </div>
          <div className="flex gap-3">
            <div className="skeleton h-10 w-32" style={{ height: "40px", width: "130px" }} />
            <div className="skeleton h-10 w-36" style={{ height: "40px", width: "145px" }} />
          </div>
        </div>

        {/* Toolbar skeleton */}
        <div className="skeleton" style={{ height: "38px", width: "320px", borderRadius: "10px" }} />

        {/* Stat cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5">
          <div className="col-span-1 sm:col-span-2 lg:col-span-6 skeleton" style={{ height: "140px", borderRadius: "14px" }} />
          <div className="col-span-1 sm:col-span-1 lg:col-span-3 skeleton" style={{ height: "140px", borderRadius: "14px" }} />
          <div className="col-span-1 sm:col-span-1 lg:col-span-3 skeleton" style={{ height: "140px", borderRadius: "14px" }} />
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton" style={{ height: "340px", borderRadius: "14px" }} />
          <div className="skeleton" style={{ height: "340px", borderRadius: "14px" }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="card p-8 text-center max-w-md mx-auto"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
        }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 text-sm font-semibold"
          style={{
            backgroundColor: "rgba(224, 122, 107, 0.12)",
            color: "var(--expense)",
            border: "1px solid rgba(224, 122, 107, 0.25)",
          }}
        >
          !
        </div>
        <h3 className="text-base font-semibold" style={{ color: "var(--text)" }}>
          Unable to load financial summary
        </h3>
        <p className="text-xs mt-1 mb-5" style={{ color: "var(--text-muted)" }}>
          {error}
        </p>
        <button
          onClick={fetchDashboardData}
          className="btn-accent"
        >
          Try Again
        </button>
      </div>
    );
  }

  const transactionCount = totalTxCount || recentTransactions.length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2
            className="text-2xl sm:text-3xl font-normal font-serif tracking-tight m-0"
            style={{
              fontFamily: "var(--font-serif)",
              color: "var(--text)",
            }}
          >
            {getGreeting()}, {username}
          </h2>
          <p
            className="text-xs sm:text-sm mt-1 m-0"
            style={{ color: "var(--text-muted)" }}
          >
            {today}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setModalTransaction(null);
              setShowModal(true);
            }}
            className="btn-accent"
            title="New transaction (N)"
          >
            <span className="text-base leading-none">+</span>
            <span>Add Transaction</span>
          </button>
          <Link
            to="/categories"
            className="btn-outline"
          >
            Categories
          </Link>
          <Link
            to="/budgets"
            className="btn-outline"
          >
            Budgets
          </Link>
        </div>
      </div>

      {/* Date Range Switcher Toolbar */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1"
      >
        <div className="relative inline-flex items-center">
          {/* Segmented Control */}
          <div
            className="inline-flex items-center p-1 rounded-lg"
            style={{
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
            }}
            role="tablist"
            aria-label="Date range switcher"
          >
            {RANGE_PRESETS.map((preset) => {
              const isActive = selectedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handlePresetClick(preset.id)}
                  className="px-2.5 sm:px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer"
                  style={{
                    backgroundColor: isActive ? "var(--surface)" : "transparent",
                    color: isActive ? "var(--text)" : "var(--text-muted)",
                    border: isActive
                      ? "1px solid var(--border)"
                      : "1px solid transparent",
                    boxShadow: isActive ? "0 1px 2px rgba(0, 0, 0, 0.15)" : "none",
                  }}
                >
                  {preset.label}
                  {preset.id === "custom" && (
                    <span className="ml-1 opacity-70 text-[10px]">▾</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Popover */}
          {showCustomPicker && (
            <div
              ref={customPickerRef}
              className="absolute left-0 top-full mt-2 z-50 animate-slide-up"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "16px",
                width: "320px",
                boxShadow: "0 12px 30px rgba(0, 0, 0, 0.45)",
              }}
            >
              <div
                className="flex items-center justify-between mb-3 pb-2"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                  Custom Date Range
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomPicker(false)}
                  className="text-xs p-1 rounded hover:opacity-80 cursor-pointer"
                  style={{ color: "var(--text-muted)" }}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label
                    className="block text-[11px] mb-1 font-medium"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={tempStart}
                    onChange={(e) => {
                      setTempStart(e.target.value);
                      setCustomError(null);
                    }}
                    className="input-field py-1.5 px-2.5 text-xs w-full"
                    style={{
                      backgroundColor: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      borderRadius: "6px",
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block text-[11px] mb-1 font-medium"
                    style={{ color: "var(--text-muted)" }}
                  >
                    End Date
                  </label>
                  <input
                    type="date"
                    value={tempEnd}
                    onChange={(e) => {
                      setTempEnd(e.target.value);
                      setCustomError(null);
                    }}
                    className="input-field py-1.5 px-2.5 text-xs w-full"
                    style={{
                      backgroundColor: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      borderRadius: "6px",
                    }}
                  />
                </div>

                {customError && (
                  <div
                    className="text-[11px] p-2 rounded"
                    style={{
                      backgroundColor: "rgba(224, 122, 107, 0.12)",
                      border: "1px solid rgba(224, 122, 107, 0.25)",
                      color: "var(--expense)",
                    }}
                  >
                    {customError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomPicker(false)}
                    className="btn-outline py-1 px-3 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyCustomRange}
                    className="btn-accent py-1 px-3 text-xs"
                  >
                    Apply Range
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Current Active Range Label */}
        <div
          className="text-xs flex items-center gap-1.5 font-normal"
          style={{ color: "var(--text-muted)" }}
        >
          <svg className="w-3.5 h-3.5 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="tabular-nums" style={{ color: "var(--text)" }}>
            {formatDisplayDate(activeDates.start_date)} – {formatDisplayDate(activeDates.end_date)}
          </span>
          {isRefetching && (
            <span
              className="ml-2 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: "var(--surface-2)",
                color: "var(--accent)",
                border: "1px solid var(--border)",
              }}
            >
              Updating...
            </span>
          )}
        </div>
      </div>

      {/* First-Run Onboarding Checklist */}
      <OnboardingChecklist
        categoriesCount={categoriesCount}
        transactionsCount={totalTxCount || recentTransactions.length}
        budgetsCount={budgetsCount}
        onAddTransaction={() => {
          setModalTransaction(null);
          setShowModal(true);
        }}
        onLoadSampleData={handleLoadSampleData}
        loadingSample={loadingSample}
      />

      {/* Hero Stat Cards Row: Current Balance (Hero) + Income + Expenses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5">
        {/* Current Balance - Hero Card */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-6">
          <SummaryCard
            title="Current Balance"
            amount={summary?.balance || 0}
            type="balance"
            isHero={true}
            supportingStat={`${transactionCount} recent transaction${transactionCount === 1 ? "" : "s"}`}
            changePct={summary?.previous?.balance_change_pct}
            hasPreviousData={summary?.previous?.has_previous_data}
            loading={isRefetching}
          />
        </div>

        {/* Total Income - Supporting Card */}
        <div className="col-span-1 sm:col-span-1 lg:col-span-3">
          <SummaryCard
            title="Total Income"
            amount={summary?.income || 0}
            type="income"
            changePct={summary?.previous?.income_change_pct}
            hasPreviousData={summary?.previous?.has_previous_data}
            loading={isRefetching}
          />
        </div>

        {/* Total Expenses - Supporting Card */}
        <div className="col-span-1 sm:col-span-1 lg:col-span-3">
          <SummaryCard
            title="Total Expenses"
            amount={summary?.expense || 0}
            type="expense"
            changePct={summary?.previous?.expense_change_pct}
            hasPreviousData={summary?.previous?.has_previous_data}
            loading={isRefetching}
          />
        </div>
      </div>

      {/* Financial Insights Card */}
      <InsightsCard />

      {/* Next-Month Spending Forecast Card */}
      <ForecastCard
        forecast={forecast}
        loading={forecastLoading}
        error={forecastError}
        onRetry={fetchForecastData}
      />

      {/* Analytics Charts Section */}
      <ExpenseCharts
        expenseByCategory={summary?.expense_by_category}
        monthlyTrends={summary?.monthly_trends}
        forecast={forecast}
        loading={isRefetching}
        onAddTransaction={() => {
          setModalTransaction(null);
          setShowModal(true);
        }}
      />


      {/* Category Budgets Widget */}
      <BudgetWidget showViewAllLink={true} limitDisplay={4} />

      {/* Recent Transactions Widget */}
      <div
        className="card p-5 sm:p-6"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight m-0" style={{ color: "var(--text)" }}>
              Recent Transactions
            </h3>
            <p className="text-xs m-0 mt-0.5" style={{ color: "var(--text-muted)" }}>
              Latest financial activity
            </p>
          </div>

          <Link
            to="/transactions"
            className="text-xs font-medium no-underline transition-colors flex items-center gap-1"
            style={{ color: "var(--accent)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--accent)")}
          >
            <span>View All</span>
            <span>→</span>
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <EmptyState
            icon="transactions"
            title="No transactions recorded yet"
            description="Your recent financial activity will appear here once you record your first income or expense."
            actionLabel="+ Add Transaction"
            onAction={() => {
              setModalTransaction(null);
              setShowModal(true);
            }}
            secondaryActionLabel="Load Sample Data"
            onSecondaryAction={handleLoadSampleData}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th style={{ textAlign: "right", minWidth: "80px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => {
                  const isIncome = tx.type?.toLowerCase() === "income";
                  return (
                    <tr key={tx.id}>
                      <td className="font-medium" style={{ color: "var(--text)" }}>
                        <div className="flex items-center gap-1.5">
                          <span>{tx.title}</span>
                          {tx.is_recurring && (
                            <span
                              title="Recurring transaction"
                              aria-label="Recurring transaction"
                              className="inline-flex items-center text-[var(--accent)] opacity-85 shrink-0"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {tx.category}
                      </td>
                      <td>
                        <span className={isIncome ? "badge-income" : "badge-expense"}>
                          {tx.type}
                        </span>
                      </td>
                      <td
                        className="tabular-nums font-medium"
                        style={{
                          textAlign: "right",
                          color: isIncome ? "var(--income)" : "var(--expense)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <div>
                          <span>
                            {isIncome ? "+" : "-"}{formatCurrency(tx.amount)}
                          </span>
                          {tx.currency && tx.currency !== baseCurrency && (
                            <div className="text-[10px] opacity-75" style={{ color: "var(--text-muted)" }}>
                              {formatCurrency(
                                tx.original_amount !== undefined && tx.original_amount !== null
                                  ? tx.original_amount
                                  : tx.amount,
                                tx.currency
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="table-row-actions">
                          <button
                            onClick={() => {
                              setModalTransaction(tx);
                              setShowModal(true);
                            }}
                            className="btn-icon"
                            title="Edit transaction"
                            aria-label={`Edit ${tx.title}`}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleInitiateDelete(tx)}
                            className="btn-icon btn-icon-danger"
                            title="Delete transaction"
                            aria-label={`Delete ${tx.title}`}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                fetchDashboardData();
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
              id="btn-undo-delete-dashboard"
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
    </div>
  );
}
