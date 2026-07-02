import { useState } from "react";
import { addCategory, deleteCategory } from "../services/api";
import { useCategories } from "../context/CategoriesContext";
import { useAppRefresh } from "../context/AppRefreshContext";

export default function CategoryManager() {
  const { categories, refreshCategories } = useCategories();
  const { triggerRefresh } = useAppRefresh();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError("");

    try {
      await addCategory(trimmed);
      setName("");
      await refreshCategories();
      triggerRefresh('categories');
    } catch (err) {
      const message = err.response?.data?.error || "Failed to create category";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    try {
      await deleteCategory(pendingDelete.id);
      await refreshCategories();
      triggerRefresh('categories');
    } catch (err) {
      const message = err.response?.data?.error || "Failed to delete category";
      alert(message);
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="dashboard-card mt-4 p-6 animate-in" style={{ animationDelay: "0.3s" }}>
      <div className="mb-4">
        <p className="section-label mb-1.5">Organize</p>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Categories
          </h2>
          <span className="badge-count">
            {categories.length}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-400">
          Create custom categories for your transactions
        </p>
      </div>

      {pendingDelete && (
        <div className="confirm-bar mb-4">
          <span>Delete &quot;{pendingDelete.name}&quot;?</span>
          <div className="ml-auto flex gap-1.5">
            <button
              onClick={() => setPendingDelete(null)}
              className="px-2 py-0.5 rounded text-xs font-semibold bg-white/80 hover:bg-white text-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="New category name"
          className="input-field flex-1"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          maxLength={50}
          required
        />
        <button type="submit" disabled={submitting} className="btn-primary shrink-0 px-4">
          {submitting ? "..." : "Add"}
        </button>
      </form>

      {error && (
        <p className="mb-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}

      {categories.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          No categories yet. Add one above.
        </p>
      ) : (
        <ul className="max-h-48 space-y-1.5 overflow-y-auto">
          {categories.map((cat, index) => (
            <li
              key={cat.id}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/30 animate-in"
              style={{ animationDelay: `${0.1 + index * 0.04}s` }}
            >
              <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">
                {cat.name}
              </span>
              <button
                type="button"
                onClick={() => setPendingDelete({ id: cat.id, name: cat.name })}
                className="btn-icon btn-icon-delete"
                title="Delete category"
                aria-label={`Delete ${cat.name}`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
