import { useState, useEffect, useCallback } from "react";
import { addTransaction, getSummary } from "../services/api";
import { useCategories } from "../context/CategoriesContext";
import { useAppRefresh } from "../context/AppRefreshContext";
import CategorySelect from "./CategorySelect";

export default function TransactionForm({ onSuccess }) {
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

  const fetchBudgetStatus = useCallback(async () => {
    try {
      const response = await getSummary();
      setSpent(response.data.expense || 0);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchBudgetStatus();
  }, [fetchBudgetStatus, refreshKeys.transactions]);

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

      showToast("success", "Transaction recorded successfully.");
      triggerRefresh('transactions');
      triggerRefresh('dashboard');
      setTitle("");
      setAmount("");
      setCategory("");
      setType("expense");
      if (onSuccess) {
        setTimeout(onSuccess, 500);
      }
    } catch (error) {
      console.error(error);
      showToast("error", "Failed to record transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = categories.length > 0 && category;
  const percentage = Math.min(Math.round((spent / BUDGET_LIMIT) * 100), 100);

  const getProgressColor = () => {
    if (percentage > 90) return "var(--expense)";
    if (percentage > 70) return "var(--accent)";
    return "var(--accent)";
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <span className="section-label" style={{ color: "var(--text-muted)" }}>
          Record
        </span>
        <h3 className="text-base font-semibold tracking-tight m-0 mt-1" style={{ color: "var(--text)" }}>
          New Transaction
        </h3>
        <p className="text-xs m-0 mt-0.5" style={{ color: "var(--text-muted)" }}>
          Record income or expenditure
        </p>
      </div>

      {toast && (
        <div className={`toast ${toast.type === "success" ? "toast-success" : "toast-error"}`}>
          <span>{toast.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="form-label">
            Title
          </label>
          <input
            id="title"
            type="text"
            placeholder="e.g. Consulting retainer, groceries..."
            className="input-field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="amount" className="form-label">
              Amount (₹)
            </label>
            <input
              id="amount"
              type="number"
              placeholder="0"
              min="0.01"
              step="0.01"
              className="input-field tabular-nums"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="type" className="form-label">
              Type
            </label>
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
          <label htmlFor="category" className="form-label">
            Category
          </label>
          <CategorySelect
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !canSubmit}
          className="btn-accent w-full py-2.5 mt-2"
        >
          {submitting ? "Processing..." : "Add Transaction"}
        </button>
      </form>

      {/* Budget Limit Tracker Widget */}
      <div
        className="pt-4 space-y-2"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between text-xs font-medium">
          <span style={{ color: "var(--text-muted)" }}>Monthly Budget Target</span>
          <span className="tabular-nums" style={{ color: "var(--text)" }}>{percentage}%</span>
        </div>
        <div className="budget-progress-track">
          <div
            className="budget-progress-fill"
            style={{
              width: `${percentage}%`,
              backgroundColor: getProgressColor(),
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>
          <span>₹{spent.toLocaleString("en-IN")} spent</span>
          <span>Limit: ₹{BUDGET_LIMIT.toLocaleString("en-IN")}</span>
        </div>
      </div>
    </div>
  );
}
