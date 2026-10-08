import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getBudgetStatus } from "../services/api";
import { useAppRefresh } from "../context/AppRefreshContext";
import BudgetModal from "./BudgetModal";

const formatINR = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function BudgetWidget({ showViewAllLink = true, limitDisplay = null }) {
  const { refreshKeys } = useAppRefresh();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getBudgetStatus();
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError("Unable to load category budgets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus, refreshKeys.budgets, refreshKeys.transactions]);

  const handleOpenAdd = () => {
    setSelectedBudget(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setSelectedBudget(item);
    setModalOpen(true);
  };

  const getBarColor = (percentage) => {
    if (percentage >= 100) return "var(--expense)";
    if (percentage >= 80) return "var(--warning)";
    return "var(--accent)";
  };

  if (loading) {
    return (
      <div
        className="card p-5 sm:p-6 animate-fade-in"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1.5">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-5 w-40" />
          </div>
          <div className="skeleton h-8 w-24 rounded-md" />
        </div>
        <div className="space-y-4 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="skeleton h-4 w-28" />
                <div className="skeleton h-4 w-32" />
              </div>
              <div className="skeleton h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="card p-5 sm:p-6 text-center"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
        }}
      >
        <p className="text-xs m-0 mb-3" style={{ color: "var(--expense)" }}>
          {error}
        </p>
        <button onClick={fetchStatus} className="btn-outline text-xs py-1.5 px-3">
          Retry
        </button>
      </div>
    );
  }

  const allItems = data?.categories || [];
  const displayItems = limitDisplay ? allItems.slice(0, limitDisplay) : allItems;
  const budgetedItems = allItems.filter((i) => i.has_budget);

  return (
    <>
      <div
        className="card p-5 sm:p-6"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="section-label" style={{ color: "var(--text-muted)" }}>
                Monthly Limits
              </span>
              {data?.month_short && (
                <span className="badge-neutral text-[10px]">
                  {data.month_short}
                </span>
              )}
            </div>
            <h3
              className="text-sm font-semibold tracking-tight m-0 mt-1"
              style={{ color: "var(--text)" }}
            >
              Category Budgets
            </h3>
            <p className="text-xs m-0 mt-0.5" style={{ color: "var(--text-muted)" }}>
              Monthly capital allocation vs current spend
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleOpenAdd}
              className="btn-accent text-xs py-1.5 px-3"
            >
              + Add Budget
            </button>
            {showViewAllLink && (
              <Link
                to="/budgets"
                className="btn-outline text-xs py-1.5 px-3 no-underline"
              >
                Manage
              </Link>
            )}
          </div>
        </div>

        {budgetedItems.length === 0 && allItems.length === 0 ? (
          <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>
            <p className="text-xs m-0">No categories found in system.</p>
          </div>
        ) : budgetedItems.length === 0 ? (
          <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 text-xs"
              style={{
                backgroundColor: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
            >
              ₹
            </div>
            <p className="text-xs font-medium m-0" style={{ color: "var(--text)" }}>
              No monthly budgets configured yet
            </p>
            <p className="text-[11px] mt-1 mb-4" style={{ color: "var(--text-muted)" }}>
              Set caps on category spending to monitor monthly budget health.
            </p>
            <button
              onClick={handleOpenAdd}
              className="btn-outline text-xs py-1.5 px-3"
            >
              Set First Budget
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {displayItems.map((item) => {
              const { category, monthly_limit, spent, percentage, has_budget } = item;
              const barColor = getBarColor(percentage || 0);
              const clampedWidth = Math.min(percentage || 0, 100);
              const isOver = (percentage || 0) >= 100;

              return (
                <div
                  key={category}
                  className="group p-3 rounded-lg transition-colors duration-150"
                  style={{
                    backgroundColor: "var(--surface-2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3 text-xs mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="font-semibold truncate"
                        style={{ color: "var(--text)" }}
                      >
                        {category}
                      </span>
                      {has_budget ? (
                        <span
                          className="tabular-nums font-semibold text-[11px] px-1.5 py-0.5 rounded"
                          style={{
                            color: barColor,
                            backgroundColor:
                              percentage >= 100
                                ? "rgba(224, 122, 107, 0.12)"
                                : percentage >= 80
                                ? "rgba(217, 155, 67, 0.12)"
                                : "rgba(212, 180, 131, 0.12)",
                          }}
                        >
                          {percentage}%
                        </span>
                      ) : (
                        <span className="badge-neutral text-[10px]">
                          No limit set
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className="tabular-nums font-medium text-xs"
                        style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}
                      >
                        {has_budget ? (
                          <>
                            <span style={{ color: isOver ? "var(--expense)" : "var(--text)" }}>
                              {formatINR(spent)}
                            </span>
                            <span style={{ color: "var(--text-muted)" }}> / </span>
                            <span style={{ color: "var(--text-muted)" }}>
                              {formatINR(monthly_limit)}
                            </span>
                          </>
                        ) : (
                          <span>{formatINR(spent)} spent</span>
                        )}
                      </span>

                      <button
                        onClick={() => (has_budget ? handleOpenEdit(item) : handleOpenEdit({ ...item, monthly_limit: 0 }))}
                        className="btn-icon w-6 h-6 p-0 opacity-70 group-hover:opacity-100"
                        title={has_budget ? "Edit budget limit" : "Set budget limit"}
                        aria-label="Edit budget"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.75}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Thin Progress Bar */}
                  {has_budget ? (
                    <div
                      className="w-full h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: "var(--border)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300 ease-out"
                        style={{
                          width: `${clampedWidth}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] pt-0.5">
                      <span style={{ color: "var(--text-muted)" }}>
                        No monthly ceiling active
                      </span>
                      <button
                        onClick={() => handleOpenEdit({ ...item, monthly_limit: 0 })}
                        className="p-0 border-none bg-transparent cursor-pointer font-medium hover:underline"
                        style={{ color: "var(--accent)" }}
                      >
                        + Set Limit
                      </button>
                    </div>
                  )}

                  {isOver && (
                    <div className="mt-1.5 flex items-center justify-between text-[11px] tabular-nums" style={{ color: "var(--expense)" }}>
                      <span>Ceiling exceeded</span>
                      <span>Exceeded by {formatINR(spent - monthly_limit)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BudgetModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialBudget={selectedBudget}
        onSuccess={fetchStatus}
      />
    </>
  );
}
