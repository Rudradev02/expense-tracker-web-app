import { useEffect, useState } from "react";
import { getTransactions } from "../services/api";
import { useCategories } from "../context/CategoriesContext";
import TransactionTable from "../components/TransactionTable";

export default function Transactions() {
  const { categories } = useCategories();
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
  }, [title, category]);

  return (
    <section className="dashboard-card overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-5 dark:border-zinc-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-label mb-1">Activity</p>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Recent Transactions
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
              {transactions.length} record{transactions.length !== 1 ? "s" : ""} found
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

      <TransactionTable
        transactions={transactions}
        refreshTransactions={fetchTransactions}
      />
    </section>
  );
}
