import { useEffect, useState, useCallback } from "react";
import { getTransactions } from "../services/api";
import { useCategories } from "../context/CategoriesContext";
import { useAppRefresh } from "../context/AppRefreshContext";
import TransactionTable from "../components/TransactionTable";
import TransactionForm from "../components/TransactionForm";

export default function Transactions() {
  const { categories } = useCategories();
  const { refreshKeys } = useAppRefresh();
  const [transactions, setTransactions] = useState([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await getTransactions(title, category);
      setTransactions(response.data);
    } catch (error) {
      console.error(error);
    }
  }, [title, category]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, refreshKeys.transactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Transaction History
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
            Manage, filter, and review all your recorded income and expenses
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-transform hover:-translate-y-0.5 self-start sm:self-auto"
        >
          <span className="text-base leading-none">+</span>
          <span>Add Transaction</span>
        </button>
      </div>

      <section className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="border-b border-slate-100 dark:border-zinc-800 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Recorded Transactions
              </span>
              <span className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-xs font-extrabold px-2 py-0.5 rounded-full">
                {transactions.length}
              </span>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-60">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full sm:w-44 px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(title || category) && (
          <div className="flex flex-wrap items-center gap-2 px-6 py-3 bg-slate-50/60 dark:bg-zinc-900/40 border-b border-slate-100 dark:border-zinc-800">
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
              Active Filters:
            </span>
            {title && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <span>Search: &quot;{title}&quot;</span>
                <button onClick={() => setTitle("")} className="hover:text-blue-900 dark:hover:text-white">✕</button>
              </div>
            )}
            {category && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <span>Category: {category}</span>
                <button onClick={() => setCategory("")} className="hover:text-blue-900 dark:hover:text-white">✕</button>
              </div>
            )}
            <button
              onClick={() => {
                setTitle("");
                setCategory("");
              }}
              className="ml-auto text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear All
            </button>
          </div>
        )}

        <TransactionTable
          transactions={transactions}
          refreshTransactions={fetchTransactions}
        />
      </section>

      {/* Add Transaction Modal Overlay */}
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
