import { useEffect, useState, useCallback } from "react";
import { getSummary } from "../services/api";
import { useAppRefresh } from "../context/AppRefreshContext";
import SummaryCard from "../components/SummaryCard";
import ExpenseCharts from "../components/ExpenseCharts";

export default function Dashboard() {
  const { refreshKeys } = useAppRefresh();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [spinning, setSpinning] = useState(false);

  const fetchDashboardData = useCallback(async () => {
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
  }, []);

  const handleRefresh = () => {
    setSpinning(true);
    fetchDashboardData();
    setTimeout(() => setSpinning(false), 700);
  };

  useEffect(() => {
    fetchDashboardData();
  }, [refreshKeys.dashboard, fetchDashboardData]);

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

  const transactionCount = summary
    ? (summary.expense_by_category?.length || 0)
    : 0;

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
      <div className="dashboard-card mx-auto max-w-md p-8 text-center animate-in">
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
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-in">
        <div>
          <p className="section-label mb-2">Overview</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {getGreeting()} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            Here&apos;s your financial overview — {today}
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            className={`btn-refresh ${spinning ? "spinning" : ""}`}
            aria-label="Refresh dashboard"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.253 8H18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard title="Total Income" amount={summary?.income || 0} type="income" delay={0} />
        <SummaryCard title="Total Expenses" amount={summary?.expense || 0} type="expense" delay={1} />
        <SummaryCard title="Net Balance" amount={summary?.balance || 0} type="balance" delay={2} />
      </div>

      {/* Quick Stats */}
      <div className="mt-5 flex flex-wrap gap-3 animate-in" style={{ animationDelay: "0.4s" }}>
        <div className="quick-stat">
          <span className="quick-stat-icon bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
            📊
          </span>
          <span>{transactionCount} categories tracked</span>
        </div>
        {summary?.income > 0 && (
          <div className="quick-stat">
            <span className="quick-stat-icon bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
              💹
            </span>
            <span>
              Savings rate:{" "}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {Math.round(((summary.income - summary.expense) / summary.income) * 100)}%
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Charts */}
      <ExpenseCharts
        expenseByCategory={summary?.expense_by_category}
        monthlyTrends={summary?.monthly_trends}
      />
    </section>
  );
}
