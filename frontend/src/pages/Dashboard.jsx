import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getSummary, getTransactions } from "../services/api";
import { useAppRefresh } from "../context/AppRefreshContext";
import SummaryCard from "../components/SummaryCard";
import ExpenseCharts from "../components/ExpenseCharts";
import TransactionForm from "../components/TransactionForm";

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-slate-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          <div className="h-80 bg-slate-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-8 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-500 mx-auto mb-3">
          ⚠️
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Unable to load summary</h3>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 mb-4">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors"
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
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {getGreeting()} 👋
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
            Here&apos;s your financial summary for <span className="font-semibold text-slate-700 dark:text-zinc-300">{today}</span>
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-transform hover:-translate-y-0.5"
          >
            <span className="text-base leading-none">+</span>
            <span>Add Transaction</span>
          </button>
          <Link
            to="/categories"
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            Manage Categories
          </Link>
        </div>
      </div>

      {/* Summary Cards Row (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total Income" amount={summary?.income || 0} type="income" />
        <SummaryCard title="Total Expenses" amount={summary?.expense || 0} type="expense" />
        <SummaryCard title="Current Balance" amount={summary?.balance || 0} type="balance" />
        <SummaryCard title="Recent Transactions" amount={transactionCount} type="transactions" isRawNumber={true} />
      </div>

      {/* Recharts Analytics Section */}
      <ExpenseCharts
        expenseByCategory={summary?.expense_by_category}
        monthlyTrends={summary?.monthly_trends}
      />

      {/* Recent Transactions Widget */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Transactions
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Latest financial activity
            </p>
          </div>

          <Link
            to="/transactions"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <span>→</span>
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              No transactions recorded yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-zinc-800 text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                  <th className="pb-3">Title</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 font-semibold text-slate-900 dark:text-white">{tx.title}</td>
                    <td className="py-3 text-xs text-slate-500 dark:text-zinc-400">{tx.category}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        tx.type.toLowerCase() === "income"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className={`py-3 text-right font-bold ${
                      tx.type.toLowerCase() === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}>
                      {tx.type.toLowerCase() === "income" ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Add Transaction Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              ✕
            </button>
            <TransactionForm />
          </div>
        </div>
      )}
    </div>
  );
}
