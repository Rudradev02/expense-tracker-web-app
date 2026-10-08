import { useState, useEffect } from "react";
import { createBudget, updateBudget } from "../services/api";
import { useCategories } from "../context/CategoriesContext";
import { useAppRefresh } from "../context/AppRefreshContext";
import { useCurrency } from "../context/CurrencyContext";

export default function BudgetModal({
  isOpen,
  onClose,
  initialBudget = null,
  onSuccess = null,
}) {
  const { categories } = useCategories();
  const { triggerRefresh } = useAppRefresh();
  const { activeCurrencyInfo } = useCurrency();

  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isEditing = Boolean(initialBudget && initialBudget.budget_id);

  useEffect(() => {
    if (initialBudget) {
      setCategory(initialBudget.category || "");
      setCustomCategory("");
      setMonthlyLimit(
        initialBudget.monthly_limit !== null && initialBudget.monthly_limit !== undefined
          ? String(initialBudget.monthly_limit)
          : ""
      );
    } else {
      setCategory(categories.length > 0 ? categories[0].name : "");
      setCustomCategory("");
      setMonthlyLimit("");
    }
    setError("");
  }, [initialBudget, categories, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const targetCategory = (
      category === "__custom__" ? customCategory : category
    ).trim();

    if (!targetCategory) {
      setError("Please select or enter a category name.");
      return;
    }

    const limitNum = parseFloat(monthlyLimit);
    if (isNaN(limitNum) || limitNum <= 0) {
      setError("Monthly limit must be a positive number.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await updateBudget(initialBudget.budget_id, {
          category: targetCategory,
          monthly_limit: limitNum,
        });
      } else {
        await createBudget(targetCategory, limitNum);
      }

      triggerRefresh("budgets");
      triggerRefresh("dashboard");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to save budget limit.";
      setError(msg);
    } finally {
      setSubmitting(false);
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
              Budget Allocation
            </span>
            <h3
              className="text-base font-semibold tracking-tight m-0 mt-1"
              style={{ color: "var(--text)" }}
            >
              {isEditing ? `Edit Budget: ${initialBudget.category}` : "Set Monthly Budget"}
            </h3>
            <p className="text-xs m-0 mt-0.5" style={{ color: "var(--text-muted)" }}>
              Cap monthly spending for this category.
            </p>
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

        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-xs font-medium"
            style={{
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--expense)",
              color: "var(--expense)",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label" htmlFor="budget-category">
              Category
            </label>
            {isEditing ? (
              <input
                id="budget-category"
                type="text"
                disabled
                value={category}
                className="input-field opacity-70 cursor-not-allowed"
              />
            ) : (
              <select
                id="budget-category"
                className="input-field"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
                <option value="__custom__">+ Custom Category...</option>
              </select>
            )}
          </div>

          {!isEditing && category === "__custom__" && (
            <div>
              <label className="form-label" htmlFor="custom-category">
                Custom Category Name
              </label>
              <input
                id="custom-category"
                type="text"
                placeholder="e.g. Travel, Software, Gym..."
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                required
                className="input-field"
              />
            </div>
          )}

          <div>
            <label className="form-label" htmlFor="budget-limit">
              Monthly Limit ({activeCurrencyInfo?.symbol || "₹"})
            </label>
            <div className="relative">
              <input
                id="budget-limit"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 15000"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                required
                className="input-field tabular-nums"
              />
            </div>
            <p className="text-[11px] mt-1 m-0" style={{ color: "var(--text-muted)" }}>
              Spending tracks automatically from the 1st of each month.
            </p>
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
              disabled={submitting}
              className="btn-accent flex-1"
            >
              {submitting ? "Saving..." : isEditing ? "Save Changes" : "Set Budget"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
