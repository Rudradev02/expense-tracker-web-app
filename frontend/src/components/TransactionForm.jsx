import { useState, useEffect, useCallback } from "react";
import { addTransaction, updateTransaction, getSummary } from "../services/api";
import { useCategories } from "../context/CategoriesContext";
import { useAppRefresh } from "../context/AppRefreshContext";
import CategorySelect from "./CategorySelect";

export default function TransactionForm({ transaction = null, onSuccess, onCancel }) {
  const { categories } = useCategories();
  const { triggerRefresh, refreshKeys } = useAppRefresh();
  const isEditing = Boolean(transaction);

  const [title, setTitle] = useState(transaction?.title || "");
  const [amount, setAmount] = useState(transaction?.amount ?? "");
  const [category, setCategory] = useState(transaction?.category || "");
  const [type, setType] = useState(transaction?.type || "expense");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [spent, setSpent] = useState(0);

  // Recurring options for new transactions
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState("monthly");
  const [endDate, setEndDate] = useState("");

  const BUDGET_LIMIT = 25000;

  useEffect(() => {
    if (transaction) {
      setTitle(transaction.title || "");
      setAmount(transaction.amount ?? "");
      setCategory(transaction.category || "");
      setType(transaction.type || "expense");
      setIsRecurring(Boolean(transaction.is_recurring));
    } else {
      setTitle("");
      setAmount("");
      setCategory("");
      setType("expense");
      setIsRecurring(false);
      setFrequency("monthly");
      setEndDate("");
    }
  }, [transaction]);

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
      const payload = {
        title: title.trim(),
        amount: Number(amount),
        category,
        type,
      };

      if (!isEditing && isRecurring) {
        payload.is_recurring = true;
        payload.frequency = frequency;
        if (endDate) payload.end_date = endDate;
      }

      let res;
      if (isEditing) {
        res = await updateTransaction(transaction.id, payload);
      } else {
        res = await addTransaction(payload);
      }

      if (res.data?.budget_alert) {
        const alert = res.data.budget_alert;
        showToast(
          alert.level === "exceeded" ? "error" : "warning",
          alert.message
        );
      } else {
        showToast(
          "success",
          isEditing
            ? "Transaction updated successfully."
            : isRecurring
            ? "Transaction recorded and recurring rule established."
            : "Transaction recorded successfully."
        );
      }

      triggerRefresh("transactions");
      triggerRefresh("dashboard");
      triggerRefresh("budgets");
      if (isRecurring) {
        triggerRefresh("recurring");
      }

      if (!isEditing) {
        setTitle("");
        setAmount("");
        setCategory("");
        setType("expense");
        setIsRecurring(false);
        setFrequency("monthly");
        setEndDate("");
      }

      if (onSuccess) {
        setTimeout(onSuccess, 600);
      }
    } catch (error) {

      console.error(error);
      showToast(
        "error",
        isEditing ? "Failed to update transaction." : "Failed to record transaction."
      );
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
          {isEditing ? "Modify" : "Record"}
        </span>
        <h3 className="text-base font-semibold tracking-tight m-0 mt-1" style={{ color: "var(--text)" }}>
          {isEditing ? "Edit Transaction" : "New Transaction"}
        </h3>
        <p className="text-xs m-0 mt-0.5" style={{ color: "var(--text-muted)" }}>
          {isEditing ? "Update transaction details" : "Record income or expenditure"}
        </p>
      </div>

      {toast && (
        <div className={`toast ${toast.type === "success" ? "toast-success" : "toast-error"}`}>
          <span>{toast.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="tx-form-title" className="form-label">
            Title
          </label>
          <input
            id="tx-form-title"
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
            <label htmlFor="tx-form-amount" className="form-label">
              Amount (₹)
            </label>
            <input
              id="tx-form-amount"
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
            <label htmlFor="tx-form-type" className="form-label">
              Type
            </label>
            <select
              id="tx-form-type"
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
          <label htmlFor="tx-form-category" className="form-label">
            Category
          </label>
          <CategorySelect
            id="tx-form-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>

        {/* Option to mark as recurring (for new transactions) */}
        {!isEditing && (
          <div
            className="p-3 rounded-lg space-y-2.5"
            style={{
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
            }}
          >
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="accent-[var(--accent)] cursor-pointer"
                id="checkbox-is-recurring"
              />
              <span style={{ color: "var(--text)" }}>Repeat this transaction (recurring rule)</span>
            </label>

            {isRecurring && (
              <div className="grid grid-cols-2 gap-2.5 pt-1 animate-fade-in">
                <div>
                  <label htmlFor="tx-recurring-freq" className="form-label text-[10px]">
                    Frequency
                  </label>
                  <select
                    id="tx-recurring-freq"
                    className="input-field text-xs py-1.5"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="tx-recurring-end" className="form-label text-[10px]">
                    End Date (Optional)
                  </label>
                  <input
                    id="tx-recurring-end"
                    type="date"
                    className="input-field text-xs py-1.5"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}


        <div className="flex items-center gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn-outline flex-1 py-2.5"
              disabled={submitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className={`btn-accent ${onCancel ? "flex-1" : "w-full"} py-2.5`}
          >
            {submitting
              ? "Processing..."
              : isEditing
              ? "Save Changes"
              : "Add Transaction"}
          </button>
        </div>
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
