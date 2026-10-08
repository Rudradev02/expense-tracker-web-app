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
          <span className="section-label" style={{ color: "var(--text-muted)" }}>
            Ledger
          </span>
          <h2 className="text-2xl font-bold tracking-tight m-0 mt-1" style={{ color: "var(--text)" }}>
            Transaction History
          </h2>
          <p className="text-xs sm:text-sm mt-0.5 m-0" style={{ color: "var(--text-muted)" }}>
            Review, filter, and audit recorded revenue and disbursements
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-accent self-start sm:self-auto"
        >
          <span className="text-base leading-none">+</span>
          <span>Add Transaction</span>
        </button>
      </div>

      <section
        className="card overflow-hidden"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
        }}
      >
        <div
          className="p-4 sm:p-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                Recorded Entries
              </span>
              <span className="badge-count">
                {transactions.length}
              </span>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Filter by title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field pl-9 py-2 text-xs"
                />
              </div>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field w-full sm:w-44 py-2 text-xs"
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
          <div
            className="flex flex-wrap items-center gap-2 px-5 py-2.5 text-xs"
            style={{
              backgroundColor: "var(--surface-2)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Active Filters:
            </span>
            {title && (
              <span className="badge-neutral gap-1.5">
                <span>Title: &quot;{title}&quot;</span>
                <button
                  onClick={() => setTitle("")}
                  className="hover:opacity-100 opacity-60 cursor-pointer border-none bg-transparent text-xs p-0 leading-none"
                  style={{ color: "var(--text)" }}
                >
                  ✕
                </button>
              </span>
            )}
            {category && (
              <span className="badge-neutral gap-1.5">
                <span>Category: {category}</span>
                <button
                  onClick={() => setCategory("")}
                  className="hover:opacity-100 opacity-60 cursor-pointer border-none bg-transparent text-xs p-0 leading-none"
                  style={{ color: "var(--text)" }}
                >
                  ✕
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setTitle("");
                setCategory("");
              }}
              className="ml-auto text-xs font-semibold cursor-pointer border-none bg-transparent"
              style={{ color: "var(--accent)" }}
            >
              Reset
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
