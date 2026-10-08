import { useState } from "react";
import { useCurrency } from "../context/CurrencyContext";

export default function CurrencyModal({ isOpen, onClose }) {
  const {
    baseCurrency,
    currencies,
    ratesToInr,
    ratesMetadata,
    changeBaseCurrency,
    updateCustomRates,
    refreshRates,
    formatCurrency,
  } = useCurrency();

  const [isEditingRates, setIsEditingRates] = useState(false);
  const [editedRates, setEditedRates] = useState({ ...ratesToInr });
  const [updating, setUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!isOpen) return null;

  const handleSelectBase = async (code) => {
    if (code === baseCurrency) return;
    try {
      await changeBaseCurrency(code);
      setFeedback({ type: "success", message: `Base currency changed to ${code}` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (e) {
      setFeedback({ type: "error", message: "Failed to update currency setting" });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setFeedback(null);
    const result = await refreshRates();
    setRefreshing(false);
    if (result.success) {
      setFeedback({ type: "success", message: "Exchange rates updated from API" });
    } else {
      setFeedback({ type: "error", message: result.error || "Could not fetch rates. Using cached rates." });
    }
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleSaveRates = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setFeedback(null);
    const result = await updateCustomRates(editedRates);
    setUpdating(false);
    if (result.success) {
      setIsEditingRates(false);
      setFeedback({ type: "success", message: "Custom exchange rates saved." });
    } else {
      setFeedback({ type: "error", message: result.error || "Failed to save rates" });
    }
    setTimeout(() => setFeedback(null), 3500);
  };

  const formattedDate = ratesMetadata.last_updated
    ? new Date(ratesMetadata.last_updated).toLocaleString("en-IN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Active session";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="currency-modal-title"
    >
      <div
        className="w-full max-w-lg rounded-xl shadow-xl overflow-hidden animate-fade-in"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <h2 id="currency-modal-title" className="text-sm font-semibold tracking-tight">
              Currency & Exchange Rates
            </h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Totals & charts always display in your base currency.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close currency settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div
            className="px-5 py-2.5 text-xs font-medium"
            style={{
              backgroundColor:
                feedback.type === "success"
                  ? "rgba(46, 125, 50, 0.12)"
                  : "rgba(229, 57, 53, 0.12)",
              color:
                feedback.type === "success" ? "var(--income)" : "var(--expense)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {feedback.message}
          </div>
        )}

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Base Currency Selection */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>
              Base Currency (Default)
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {currencies.map((curr) => {
                const isSelected = curr.code === baseCurrency;
                return (
                  <button
                    key={curr.code}
                    type="button"
                    onClick={() => handleSelectBase(curr.code)}
                    className="flex flex-col text-left p-3 rounded-lg transition-all cursor-pointer relative"
                    style={{
                      backgroundColor: isSelected ? "var(--surface-2)" : "var(--bg)",
                      border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-sm flex items-center gap-1.5">
                        <span style={{ color: "var(--accent)" }}>{curr.symbol}</span>
                        <span>{curr.code}</span>
                      </span>
                      {isSelected && (
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: "var(--accent)" }}
                          title="Active base currency"
                        />
                      )}
                    </div>
                    <span className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                      {curr.name}
                    </span>
                    <span className="text-[11px] mt-1 tabular-nums font-mono" style={{ color: "var(--text)" }}>
                      {formatCurrency(100000, curr.code)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exchange Rates Section */}
          <div
            className="pt-4 rounded-lg p-3.5"
            style={{
              backgroundColor: "var(--bg)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <span className="text-xs font-semibold block" style={{ color: "var(--text)" }}>
                  Exchange Rates (Relative to INR ₹)
                </span>
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  Cached for 1 day • Last updated: {formattedDate} ({ratesMetadata.source})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="px-2 py-1 text-[11px] rounded transition-colors cursor-pointer flex items-center gap-1"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    opacity: refreshing ? 0.6 : 1,
                  }}
                  title="Refresh rates from live API"
                >
                  <svg
                    className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>{refreshing ? "Fetching..." : "Fetch Live"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingRates(!isEditingRates)}
                  className="px-2 py-1 text-[11px] rounded transition-colors cursor-pointer"
                  style={{
                    backgroundColor: isEditingRates ? "var(--surface-2)" : "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--accent)",
                  }}
                >
                  {isEditingRates ? "Cancel" : "Manual Set"}
                </button>
              </div>
            </div>

            {isEditingRates ? (
              <form onSubmit={handleSaveRates} className="space-y-2 mt-3">
                <div className="grid grid-cols-3 gap-2">
                  {["USD", "EUR", "GBP"].map((currCode) => (
                    <div key={currCode}>
                      <label className="text-[10px] uppercase font-semibold block mb-0.5" style={{ color: "var(--text-muted)" }}>
                        1 {currCode} = ₹
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="input-field tabular-nums text-xs py-1"
                        value={editedRates[currCode] || ""}
                        onChange={(e) =>
                          setEditedRates({
                            ...editedRates,
                            [currCode]: parseFloat(e.target.value) || 0,
                          })
                        }
                        required
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={updating}
                    className="btn-primary text-xs py-1 px-3"
                    style={{ opacity: updating ? 0.6 : 1 }}
                  >
                    {updating ? "Saving..." : "Save Custom Rates"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                {["USD", "EUR", "GBP"].map((currCode) => (
                  <div
                    key={currCode}
                    className="p-2 rounded text-xs"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div className="font-semibold text-[11px]" style={{ color: "var(--text-muted)" }}>
                      1 {currCode}
                    </div>
                    <div className="font-bold tabular-nums mt-0.5" style={{ color: "var(--text)" }}>
                      ₹{Number(ratesToInr[currCode] || 0).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 flex justify-end"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-1.5 px-4 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
