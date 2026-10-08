import { useState, useEffect } from "react";
import { contributeToGoal } from "../services/api";
import { useAppRefresh } from "../context/AppRefreshContext";
import { useCurrency } from "../context/CurrencyContext";

export default function ContributeModal({
  isOpen,
  onClose,
  goal = null,
  onSuccess = null,
}) {
  const { triggerRefresh } = useAppRefresh();
  const { formatCurrency, activeCurrencyInfo } = useCurrency();
  const formatINR = formatCurrency;

  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [achievedNotice, setAchievedNotice] = useState(false);

  useEffect(() => {
    setAmount("");
    setError("");
    setAchievedNotice(false);
  }, [goal, isOpen]);

  if (!isOpen || !goal) return null;

  const targetAmount = Number(goal.target_amount || 0);
  const savedAmount = Number(goal.saved_amount || 0);
  const remaining = Math.max(0, targetAmount - savedAmount);
  const isAlreadyCompleted = savedAmount >= targetAmount;

  const handlePresetClick = (presetVal) => {
    setAmount(String(presetVal));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError(`Please enter a contribution amount greater than ${formatCurrency(0)}.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await contributeToGoal(goal.id, num);
      const isCompleted = res.data?.is_completed || (savedAmount + num >= targetAmount);

      triggerRefresh("goals");
      triggerRefresh("dashboard");

      if (isCompleted && !isAlreadyCompleted) {
        setAchievedNotice(true);
        // Give user a moment to see the completion highlight before closing
        setTimeout(() => {
          if (onSuccess) onSuccess(res.data?.goal);
          onClose();
        }, 1100);
      } else {
        if (onSuccess) onSuccess(res.data?.goal);
        onClose();
      }
    } catch (err) {
      console.error("Contribute error:", err);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to register contribution.";
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
        className="w-full max-w-sm p-6 relative animate-slide-up transition-all"
        style={{
          backgroundColor: "var(--surface)",
          border: achievedNotice ? "1px solid var(--accent)" : "1px solid var(--border)",
          borderRadius: "14px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <span className="section-label" style={{ color: "var(--text-muted)" }}>
              Add Funds
            </span>
            <h3
              className="text-base font-semibold tracking-tight m-0 mt-0.5 truncate max-w-[240px]"
              style={{ color: "var(--text)" }}
            >
              {goal.name}
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

        {/* Current status pill */}
        <div
          className="p-3 rounded-lg mb-4 text-xs flex items-center justify-between"
          style={{
            backgroundColor: "var(--surface-2)",
            border: "1px solid var(--border)",
          }}
        >
          <div>
            <span className="block text-[11px]" style={{ color: "var(--text-muted)" }}>
              Current Progress
            </span>
            <span className="font-semibold tabular-nums" style={{ color: "var(--text)" }}>
              {formatINR(savedAmount)} of {formatINR(targetAmount)}
            </span>
          </div>
          <div className="text-right">
            <span className="block text-[11px]" style={{ color: "var(--text-muted)" }}>
              Remaining
            </span>
            <span className="font-semibold tabular-nums" style={{ color: remaining > 0 ? "var(--accent)" : "var(--income)" }}>
              {remaining > 0 ? formatINR(remaining) : "Funded"}
            </span>
          </div>
        </div>

        {/* Milestone Achievement Classy Highlight Banner */}
        {achievedNotice && (
          <div
            className="mb-4 p-3 rounded-lg text-xs flex items-center gap-2 animate-fade-in"
            style={{
              backgroundColor: "rgba(212, 180, 131, 0.12)",
              border: "1px solid var(--accent)",
              color: "var(--accent)",
            }}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Goal target achieved! Marked as completed.</span>
          </div>
        )}

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
            <label className="form-label" htmlFor="contribute-amount">
              Contribution Amount ({activeCurrencyInfo?.symbol || "₹"})
            </label>
            <input
              id="contribute-amount"
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
              className="input-field text-base font-medium tabular-nums"
            />
          </div>

          {/* Quick preset amount chips */}
          <div>
            <span className="text-[11px] block mb-1.5" style={{ color: "var(--text-muted)" }}>
              Quick presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[1000, 2500, 5000, 10000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handlePresetClick(val)}
                  className="text-xs py-1 px-2.5 rounded cursor-pointer transition-colors"
                  style={{
                    backgroundColor: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text)";
                    e.currentTarget.style.borderColor = "var(--accent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-muted)";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  +{formatINR(val)}
                </button>
              ))}
              {remaining > 0 && remaining !== 1000 && remaining !== 2500 && remaining !== 5000 && remaining !== 10000 && (
                <button
                  type="button"
                  onClick={() => handlePresetClick(remaining)}
                  className="text-xs py-1 px-2.5 rounded cursor-pointer transition-colors"
                  style={{
                    backgroundColor: "rgba(212, 180, 131, 0.1)",
                    border: "1px solid rgba(212, 180, 131, 0.3)",
                    color: "var(--accent)",
                  }}
                >
                  Pay Remaining ({formatINR(remaining)})
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting || achievedNotice}
              className="btn-outline flex-1 text-xs py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || achievedNotice}
              className="btn-accent flex-1 text-xs py-2"
            >
              {submitting ? "Adding..." : "Add to Savings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
