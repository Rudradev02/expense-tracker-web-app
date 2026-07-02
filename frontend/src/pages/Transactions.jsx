import { useEffect, useState } from "react";
import { getTransactions } from "../services/api";
import { useCategories } from "../context/CategoriesContext";
import { useAppRefresh } from "../context/AppRefreshContext";
import TransactionTable from "../components/TransactionTable";

export default function Transactions() {
  const { categories } = useCategories();
  const { refreshKeys } = useAppRefresh();
  const [transactions, setTransactions] = useState([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");

  const fetchTransactions = async () => {
    try {
      const response = await getTransactions(title, category);
      setTransactions(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [title, category, refreshKeys.transactions]);

  return (
    <section className="dashboard-card overflow-hidden animate-in" style={{ animationDelay: "0.2s" }}>
      <div className="border-b border-slate-100 px-6 py-5 dark:border-zinc-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-label mb-1.5">Activity</p>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Recent Transactions
              </h2>
              <span className="badge-count">
                {transactions.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              Filtered history of income and expenses
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
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
                className="input-field !pl-9 sm:w-52"
              />
            </div>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field sm:w-44"
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
        <div className="flex flex-wrap items-center gap-2 px-6 py-3 bg-slate-50/40 dark:bg-zinc-900/20 border-b border-slate-100 dark:border-zinc-800 animate-in">
          <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mr-1">
            Active Filters:
          </span>
          {title && (
            <div className="filter-chip">
              <span>Search: &quot;{title}&quot;</span>
              <button onClick={() => setTitle("")} className="filter-chip-close" aria-label="Clear search filter">✖</button>
            </div>
          )}
          {category && (
            <div className="filter-chip">
              <span>Category: {category}</span>
              <button onClick={() => setCategory("")} className="filter-chip-close" aria-label="Clear category filter">✖</button>
            </div>
          )}
          <button
            onClick={() => {
              setTitle("");
              setCategory("");
            }}
            className="ml-auto text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors"
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
  );
}
