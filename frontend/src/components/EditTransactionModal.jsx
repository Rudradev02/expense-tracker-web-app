import { useState } from "react";
import { updateTransaction } from "../services/api";
import { useAppRefresh } from "../context/AppRefreshContext";
import CategorySelect from "./CategorySelect";

export default function EditTransactionModal({ transaction, onClose, onSaved }) {
  const { triggerRefresh } = useAppRefresh();
  const [title, setTitle] = useState(transaction.title);
  const [amount, setAmount] = useState(transaction.amount);
  const [category, setCategory] = useState(transaction.category);
  const [type, setType] = useState(transaction.type);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateTransaction(transaction.id, {
        title,
        amount: Number(amount),
        category,
        type,
      });
      onSaved();
      triggerRefresh('transactions');
      triggerRefresh('dashboard');
      onClose();
    } catch (error) {
      console.error(error);
      alert("Failed to update transaction");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in"
      style={{ backgroundColor: "rgba(11, 11, 12, 0.75)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md p-6 relative animate-slide-up"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <span className="section-label" style={{ color: "var(--text-muted)" }}>
              Edit
            </span>
            <h3 className="text-base font-semibold tracking-tight m-0 mt-1" style={{ color: "var(--text)" }}>
              Update Transaction
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-title" className="form-label">Title</label>
            <input
              id="edit-title"
              type="text"
              className="input-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-amount" className="form-label">Amount (₹)</label>
              <input
                id="edit-amount"
                type="number"
                min="0.01"
                step="0.01"
                className="input-field tabular-nums"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="edit-type" className="form-label">Type</label>
              <select
                id="edit-type"
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
            <label htmlFor="edit-category" className="form-label">Category</label>
            <CategorySelect
              id="edit-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !category}
              className="btn-accent flex-1"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
