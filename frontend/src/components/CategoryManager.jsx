import { useState, useRef } from "react";
import { addCategory, deleteCategory } from "../services/api";
import { useCategories } from "../context/CategoriesContext";
import { useAppRefresh } from "../context/AppRefreshContext";
import EmptyState from "./EmptyState";

export default function CategoryManager() {
  const { categories, refreshCategories } = useCategories();
  const { triggerRefresh } = useAppRefresh();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const inputRef = useRef(null);

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
    <div
      className="card p-5 sm:p-6 animate-fade-in"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
      }}
    >
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="section-label" style={{ color: "var(--text-muted)" }}>
            Categories
          </span>
          <span className="badge-count">
            {categories.length}
          </span>
        </div>
        <h3 className="text-base font-semibold tracking-tight m-0" style={{ color: "var(--text)" }}>
          Custom Taxonomy
        </h3>
        <p className="text-xs m-0 mt-0.5" style={{ color: "var(--text-muted)" }}>
          Create and manage transaction classification categories.
        </p>
      </div>

      {pendingDelete && (
        <div
          className="mb-4 p-3 rounded-lg flex items-center justify-between text-xs animate-slide-up"
          style={{
            backgroundColor: "var(--surface-2)",
            border: "1px solid var(--expense)",
            color: "var(--text)",
          }}
        >
          <span>Delete &quot;{pendingDelete.name}&quot;?</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPendingDelete(null)}
              className="px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors"
              style={{
                backgroundColor: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors"
              style={{
                backgroundColor: "var(--expense)",
                color: "var(--bg)",
                border: "none",
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="New category label..."
          className="input-field flex-1"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          maxLength={50}
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="btn-accent shrink-0 px-4"
        >
          {submitting ? "..." : "Add"}
        </button>
      </form>

      {error && (
        <p className="mb-3 text-xs" style={{ color: "var(--expense)" }}>
          {error}
        </p>
      )}

      {categories.length === 0 ? (
        <EmptyState
          icon="categories"
          title="No categories recorded yet"
          description="Create custom categories to organize your expenses into personal spending streams."
          actionLabel="+ Add Category"
          onAction={() => inputRef.current?.focus()}
          compact={true}
        />
      ) : (
        <ul className="max-h-56 space-y-2 overflow-y-auto list-none p-0 m-0">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className="flex items-center justify-between rounded-lg px-3.5 py-2.5 transition-colors"
              style={{
                backgroundColor: "var(--surface-2)",
                border: "1px solid var(--border)",
              }}
            >
              <span className="text-xs font-medium" style={{ color: "var(--text)" }}>
                {cat.name}
              </span>
              <button
                type="button"
                onClick={() => setPendingDelete({ id: cat.id, name: cat.name })}
                className="btn-icon btn-icon-danger"
                title="Delete category"
                aria-label={`Delete ${cat.name}`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
