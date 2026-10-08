import { useState, useEffect } from "react";
import { createGoal, updateGoal } from "../services/api";
import { useAppRefresh } from "../context/AppRefreshContext";
import { useCurrency } from "../context/CurrencyContext";

export default function GoalModal({
  isOpen,
  onClose,
  initialGoal = null,
  onSuccess = null,
}) {
  const { triggerRefresh } = useAppRefresh();
  const { activeCurrencyInfo } = useCurrency();

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [savedAmount, setSavedAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isEditing = Boolean(initialGoal && initialGoal.id);

  useEffect(() => {
    if (initialGoal) {
      setName(initialGoal.name || "");
      setTargetAmount(
        initialGoal.target_amount !== undefined && initialGoal.target_amount !== null
          ? String(initialGoal.target_amount)
          : ""
      );
      setSavedAmount(
        initialGoal.saved_amount !== undefined && initialGoal.saved_amount !== null
          ? String(initialGoal.saved_amount)
          : "0"
      );
      setTargetDate(
        initialGoal.target_date ? initialGoal.target_date.slice(0, 10) : ""
      );
    } else {
      setName("");
      setTargetAmount("");
      setSavedAmount("");
      // Default target date to 6 months in the future
      const d = new Date();
      d.setMonth(d.getMonth() + 6);
      setTargetDate(d.toISOString().slice(0, 10));
    }
    setError("");
  }, [initialGoal, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please provide a name for this savings goal.");
      return;
    }

    const targetNum = parseFloat(targetAmount);
    if (isNaN(targetNum) || targetNum <= 0) {
      setError("Target amount must be a positive number.");
      return;
    }

    const savedNum = savedAmount ? parseFloat(savedAmount) : 0;
    if (isNaN(savedNum) || savedNum < 0) {
      setError("Saved amount cannot be negative.");
      return;
    }

    if (!targetDate) {
      setError("Please select a target deadline date.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: trimmedName,
        target_amount: targetNum,
        saved_amount: savedNum,
        target_date: targetDate,
      };

      if (isEditing) {
        await updateGoal(initialGoal.id, payload);
      } else {
        await createGoal(payload);
      }

      triggerRefresh("goals");
      triggerRefresh("dashboard");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Goal submit error:", err);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to save savings goal.";
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
              Savings Milestone
            </span>
            <h3
              className="text-base font-semibold tracking-tight m-0 mt-1"
              style={{ color: "var(--text)" }}
            >
              {isEditing ? `Edit Goal: ${initialGoal.name}` : "Create Savings Goal"}
            </h3>
            <p className="text-xs m-0 mt-0.5" style={{ color: "var(--text-muted)" }}>
              Set a financial target and milestone deadline.
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
              backgroundColor: "rgba(224, 122, 107, 0.12)",
              border: "1px solid rgba(224, 122, 107, 0.3)",
              color: "var(--expense)",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label" htmlFor="goal-name">
              Goal Name
            </label>
            <input
              id="goal-name"
              type="text"
              placeholder="e.g. Emergency Fund, New Laptop, Japan Trip..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="goal-target-amount">
                Target Amount ({activeCurrencyInfo?.symbol || "₹"})
              </label>
              <input
                id="goal-target-amount"
                type="number"
                min="1"
                step="1"
                placeholder="60000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                required
                className="input-field tabular-nums"
              />
            </div>

            <div>
              <label className="form-label" htmlFor="goal-saved-amount">
                Already Saved ({activeCurrencyInfo?.symbol || "₹"})
              </label>
              <input
                id="goal-saved-amount"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={savedAmount}
                onChange={(e) => setSavedAmount(e.target.value)}
                className="input-field tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="goal-target-date">
              Target Completion Date
            </label>
            <input
              id="goal-target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
              className="input-field"
            />
            <p className="text-[11px] mt-1 m-0" style={{ color: "var(--text-muted)" }}>
              Monthly velocity will calculate based on this date.
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
              {submitting ? "Saving..." : isEditing ? "Save Changes" : "Create Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
