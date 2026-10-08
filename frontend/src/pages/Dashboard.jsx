import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getSummary, getTransactions } from "../services/api";
import { useAppRefresh } from "../context/AppRefreshContext";
import SummaryCard from "../components/SummaryCard";
import ExpenseCharts from "../components/ExpenseCharts";
import TransactionForm from "../components/TransactionForm";
import BudgetWidget from "../components/BudgetWidget";

export default function Dashboard() {
  const { refreshKeys } = useAppRefresh();
  const [summary, setSummary] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryRes, transRes] = await Promise.all([
        getSummary(),
        getTransactions(),
      ]);
      setSummary(summaryRes.data);
      setRecentTransactions(transRes.data.slice(0, 5));
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

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

  const transactionCount = recentTransactions.length;

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
            onClick={() => setShowAddModal(true)}
            className="btn-accent"
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
          />
        </div>

        {/* Total Income - Supporting Card */}
        <div className="col-span-1 sm:col-span-1 lg:col-span-3">
          <SummaryCard
            title="Total Income"
            amount={summary?.income || 0}
            type="income"
          />
        </div>

        {/* Total Expenses - Supporting Card */}
        <div className="col-span-1 sm:col-span-1 lg:col-span-3">
          <SummaryCard
            title="Total Expenses"
            amount={summary?.expense || 0}
            type="expense"
          />
        </div>
      </div>

      {/* Analytics Charts Section */}
      <ExpenseCharts
        expenseByCategory={summary?.expense_by_category}
        monthlyTrends={summary?.monthly_trends}
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
          <div className="text-center py-10">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              No transactions recorded yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => {
                  const isIncome = tx.type?.toLowerCase() === "income";
                  return (
                    <tr key={tx.id}>
                      <td className="font-medium" style={{ color: "var(--text)" }}>
                        {tx.title}
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
                        {isIncome ? "+" : "-"}₹{Number(tx.amount).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Transaction Modal Overlay */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in"
          style={{ backgroundColor: "rgba(11, 11, 12, 0.75)" }}
          onClick={() => setShowAddModal(false)}
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
              onClick={() => setShowAddModal(false)}
              className="btn-icon absolute top-4 right-4"
              aria-label="Close modal"
            >
              ✕
            </button>
            <TransactionForm onSuccess={() => setShowAddModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
