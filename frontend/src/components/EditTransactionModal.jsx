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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="dashboard-card w-full max-w-md p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="section-label mb-1">Edit</p>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Update Transaction
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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
                className="input-field"
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
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving || !category} className="btn-primary flex-1">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
