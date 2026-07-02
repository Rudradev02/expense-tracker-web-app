import { useState } from "react";
import { addTransaction } from "../services/api";
import { useCategories } from "../context/CategoriesContext";
import { useAppRefresh } from "../context/AppRefreshContext";
import CategorySelect from "./CategorySelect";

export default function TransactionForm() {
  const { categories } = useCategories();
  const { triggerRefresh } = useAppRefresh();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("expense");
  const [submitting, setSubmitting] = useState(false);

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

      alert("Transaction added successfully!");
      triggerRefresh('transactions');
      triggerRefresh('dashboard');
      setTitle("");
      setAmount("");
      setCategory("");
      setType("expense");
    } catch (error) {
      console.error(error);
      alert("Failed to add transaction");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = categories.length > 0 && category;

  return (
    <div className="dashboard-card p-6">
      <div className="mb-5">
        <p className="section-label mb-1">Quick Add</p>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">New Transaction</h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
          Record income or expense
        </p>
      </div>

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
    </div>
  );
}
