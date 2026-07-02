import { useState, useEffect } from "react";
import { addTransaction, getSummary } from "../services/api";
import { useCategories } from "../context/CategoriesContext";
import { useAppRefresh } from "../context/AppRefreshContext";
import CategorySelect from "./CategorySelect";

export default function TransactionForm() {
  const { categories } = useCategories();
  const { triggerRefresh, refreshKeys } = useAppRefresh();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("expense");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [spent, setSpent] = useState(0);

  const BUDGET_LIMIT = 25000;

  const fetchBudgetStatus = async () => {
    try {
      const response = await getSummary();
      setSpent(response.data.expense || 0);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBudgetStatus();
  }, [refreshKeys.transactions]);
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await addTransaction({
        title,
        amount: Number(amount),
        category,
        type,
      });

      showToast("success", "Transaction added successfully!");
      triggerRefresh('transactions');
      triggerRefresh('dashboard');
      setTitle("");
      setAmount("");
      setCategory("");
      setType("expense");
    } catch (error) {
      console.error(error);
      showToast("error", "Failed to add transaction");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = categories.length > 0 && category;
  const percentage = Math.min(Math.round((spent / BUDGET_LIMIT) * 100), 100);
  
  const getProgressColor = () => {
    if (percentage > 90) return "bg-rose-500";
    if (percentage > 70) return "bg-amber-500";
    return "bg-indigo-500";
  };

  return (
    <div className="dashboard-card p-6 animate-in" style={{ animationDelay: "0.25s" }}>
      <div className="mb-5">
        <p className="section-label mb-1">Quick Add</p>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">New Transaction</h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
          Record income or expense
        </p>
      </div>

      {toast && (
        <div className={`toast mb-4 ${toast.type === "success" ? "toast-success" : "toast-error"}`}>
          {toast.type === "success" ? (
            <svg className="checkmark-icon h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="form-label">Title</label>
          <input
            id="title"
            type="text"
            placeholder="e.g. Grocery shopping"
            className="input-field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="amount" className="form-label">Amount (₹)</label>
            <input
              id="amount"
              type="number"
              placeholder="0"
              min="0.01"
              step="0.01"
              className="input-field"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="type" className="form-label">Type</label>
            <select
              id="type"
              className="input-field"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="category" className="form-label">Category</label>
          <CategorySelect
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !canSubmit}
          className="btn-primary w-full py-2.5"
        >
          {submitting ? "Adding..." : "Add Transaction"}
        </button>
      </form>

      {/* Budget Limit Tracker Widget */}
      <div className="mt-5 pt-4 border-t border-slate-100/50 dark:border-zinc-800/50 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-zinc-400">
          <span>Monthly Spend Progress</span>
          <span>{percentage}%</span>
        </div>
        <div className="budget-progress-track">
          <div
            className={`budget-progress-fill ${getProgressColor()}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500 font-bold tracking-wide">
          <span>₹{spent.toLocaleString("en-IN")} Spent</span>
          <span>Limit: ₹{BUDGET_LIMIT.toLocaleString("en-IN")}</span>
        </div>
      </div>
    </div>
  );
}
