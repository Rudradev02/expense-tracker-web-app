import { useEffect, useState } from "react";
import { getSummary } from "../services/api";
import { useAppRefresh } from "../context/AppRefreshContext";
import { useDarkMode } from "../context/DarkModeContext";
import SummaryCard from "../components/SummaryCard";
import ExpenseCharts from "../components/ExpenseCharts";
import DarkModeToggle from "../components/DarkModeToggle";

export default function Dashboard() {
  const { refreshKeys } = useAppRefresh();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getSummary();
      setSummary(response.data);
    } catch (err) {
      console.error("Error fetching summary data:", err?.response || err);
      const message =
        err?.response?.status === 401
          ? "Session expired or invalid authentication. Please log in again."
          : err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            "Failed to fetch dashboard data. Please try again later.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [refreshKeys.dashboard]);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center space-y-4">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-[3px] border-indigo-100 dark:border-indigo-900" />
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-indigo-600 border-t-transparent" />
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Loading your finances...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-card mx-auto max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
          <svg className="h-6 w-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Unable to load dashboard</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{error}</p>
        <button onClick={fetchDashboardData} className="btn-primary mt-5">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label mb-1">Overview</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Financial Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{today}</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <DarkModeToggle darkMode={darkMode} onToggle={toggleDarkMode} />
          <button onClick={fetchDashboardData} className="btn-secondary">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.253 8H18" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard title="Total Income" amount={summary?.income || 0} type="income" />
        <SummaryCard title="Total Expenses" amount={summary?.expense || 0} type="expense" />
        <SummaryCard title="Net Balance" amount={summary?.balance || 0} type="balance" />
      </div>

      <ExpenseCharts
        expenseByCategory={summary?.expense_by_category}
        monthlyTrends={summary?.monthly_trends}
      />
    </section>
  );
}
