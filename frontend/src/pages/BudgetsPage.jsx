import { useState, useEffect, useCallback } from "react";
import { getBudgetStatus, deleteBudget, loadSampleData } from "../services/api";
import { useAppRefresh } from "../context/AppRefreshContext";
import BudgetModal from "../components/BudgetModal";
import EmptyState from "../components/EmptyState";

const formatINR = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function BudgetsPage() {
  const { refreshKeys, triggerRefresh } = useAppRefresh();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [loadingSample, setLoadingSample] = useState(false);

  const handleLoadSampleData = async () => {
    try {
      setLoadingSample(true);
      await loadSampleData();
      triggerRefresh("budgets");
      triggerRefresh("dashboard");
      triggerRefresh("transactions");
      await fetchStatus();
    } catch (err) {
      console.error("Failed to load sample data:", err);
      alert("Failed to load sample data.");
    } finally {
      setLoadingSample(false);
    }
  };

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getBudgetStatus();
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError("Unable to load budget intelligence data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus, refreshKeys.budgets, refreshKeys.transactions]);

  const handleDelete = async (id, category) => {
    const ok = window.confirm(`Remove monthly budget limit for "${category}"?`);
    if (!ok) return;

    setDeletingId(id);
    try {
      await deleteBudget(id);
      triggerRefresh("budgets");
      triggerRefresh("dashboard");
      await fetchStatus();
    } catch (err) {
      console.error(err);
      alert("Failed to remove budget.");
    } finally {
      setDeletingId(null);
    }
  };

  const getBarColor = (percentage) => {
    if (percentage >= 100) return "var(--expense)";
    if (percentage >= 80) return "var(--warning)";
    return "var(--accent)";
  };

  const categories = data?.categories || [];
  const budgeted = categories.filter((c) => c.has_budget);
  const unbudgeted = categories.filter((c) => !c.has_budget);

  const totalBudget = data?.total_budget || 0;
  const totalSpent = data?.total_budgeted_spent || 0;
  const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const remainingBudget = Math.max(0, totalBudget - totalSpent);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="section-label" style={{ color: "var(--text-muted)" }}>
            Allocation • {data?.month || "Current Month"}
          </span>
          <h2 className="text-2xl font-bold tracking-tight m-0 mt-1" style={{ color: "var(--text)" }}>
            Monthly Budgets
          </h2>
          <p className="text-xs sm:text-sm mt-0.5 m-0" style={{ color: "var(--text-muted)" }}>
            Enforce category limits and monitor disbursement ceilings for {data?.month || "this month"}.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedBudget(null);
            setModalOpen(true);
          }}
          className="btn-accent self-start sm:self-auto"
        >
          <span className="text-base leading-none">+</span>
          <span>Set Category Budget</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className="card p-5"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
          }}
        >
          <span className="section-label" style={{ color: "var(--text-muted)" }}>
            Total Budget Cap
          </span>
          <h3
            className="text-2xl sm:text-3xl font-normal font-serif tabular-nums tracking-tight m-0 mt-2"
            style={{
              fontFamily: "var(--font-serif)",
              color: "var(--text)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatINR(totalBudget)}
          </h3>
          <p className="text-[11px] mt-1 m-0" style={{ color: "var(--text-muted)" }}>
            Across {budgeted.length} active category limit{budgeted.length === 1 ? "" : "s"}
          </p>
        </div>

        <div
          className="card p-5"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
          }}
        >
          <span className="section-label" style={{ color: "var(--text-muted)" }}>
            Budgeted Spent
          </span>
          <h3
            className="text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight m-0 mt-2"
            style={{
              color: overallPercentage >= 100 ? "var(--expense)" : "var(--text)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatINR(totalSpent)}
          </h3>
          <p className="text-[11px] mt-1 m-0" style={{ color: "var(--text-muted)" }}>
            {overallPercentage}% of monthly limit utilized
          </p>
        </div>

        <div
          className="card p-5"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
          }}
        >
          <span className="section-label" style={{ color: "var(--text-muted)" }}>
            Remaining Cap
          </span>
          <h3
            className="text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight m-0 mt-2"
            style={{
              color: totalSpent > totalBudget ? "var(--expense)" : "var(--accent)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatINR(remainingBudget)}
          </h3>
          <p className="text-[11px] mt-1 m-0" style={{ color: "var(--text-muted)" }}>
            {totalSpent > totalBudget
              ? `Deficit of ${formatINR(totalSpent - totalBudget)}`
              : "Available safe spend buffer"}
          </p>
        </div>
      </div>

      {/* Active Budgets Section */}
      <section
        className="card p-5 sm:p-6"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="section-label" style={{ color: "var(--text-muted)" }}>
              Active Limits
            </span>
            <h3 className="text-base font-semibold tracking-tight m-0 mt-1" style={{ color: "var(--text)" }}>
              Category Ceilings & Progress
            </h3>
          </div>
          <span className="badge-count">{budgeted.length}</span>
        </div>

        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="py-6 text-center text-xs" style={{ color: "var(--expense)" }}>
            {error}
          </div>
        ) : budgeted.length === 0 ? (
          <EmptyState
            icon="budgets"
            title="No monthly budgets configured yet"
            description="Allocate category spending limits to prevent overruns and track monthly budget health."
            actionLabel="+ Create Budget"
            onAction={() => {
              setSelectedBudget(null);
              setModalOpen(true);
            }}
            secondaryActionLabel={loadingSample ? "Loading..." : "Load Sample Data"}
            onSecondaryAction={handleLoadSampleData}
          />
        ) : (
          <div className="space-y-4">
            {budgeted.map((item) => {
              const { category, monthly_limit, spent, percentage, remaining, budget_id } = item;
              const barColor = getBarColor(percentage);
              const clampedWidth = Math.min(percentage, 100);
              const isOver = percentage >= 100;

              return (
                <div
                  key={category}
                  className="p-4 rounded-xl transition-all duration-150"
                  style={{
                    backgroundColor: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    opacity: deletingId === budget_id ? 0.4 : 1,
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                        {category}
                      </span>
                      <span
                        className="tabular-nums font-semibold text-xs px-2 py-0.5 rounded"
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
                        {percentage}% Used
                      </span>
                      {isOver && (
                        <span className="badge-expense text-[10px]">
                          Exceeded
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-right">
                        <div
                          className="tabular-nums text-xs font-medium"
                          style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}
                        >
                          <span style={{ color: isOver ? "var(--expense)" : "var(--text)" }}>
                            {formatINR(spent)}
                          </span>
                          <span style={{ color: "var(--text-muted)" }}> / </span>
                          <span style={{ color: "var(--text-muted)" }}>
                            {formatINR(monthly_limit)}
                          </span>
                        </div>
                        <div className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                          {isOver
                            ? `Over budget by ${formatINR(spent - monthly_limit)}`
                            : `${formatINR(remaining)} remaining`}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedBudget(item);
                            setModalOpen(true);
                          }}
                          className="btn-icon"
                          title="Edit limit"
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
                        <button
                          onClick={() => handleDelete(budget_id, category)}
                          className="btn-icon btn-icon-danger"
                          title="Delete budget"
                          aria-label="Delete budget"
                          disabled={deletingId === budget_id}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.75}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Thin Progress Bar */}
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
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Unbudgeted Categories Section (Edge Case Handling) */}
      {unbudgeted.length > 0 && (
        <section
          className="card p-5 sm:p-6"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="section-label" style={{ color: "var(--text-muted)" }}>
                Uncapped Categories
              </span>
              <h3 className="text-base font-semibold tracking-tight m-0 mt-1" style={{ color: "var(--text)" }}>
                Categories Without Limits
              </h3>
              <p className="text-xs m-0 mt-0.5" style={{ color: "var(--text-muted)" }}>
                Expenses logged under these categories have no monthly maximum.
              </p>
            </div>
            <span className="badge-neutral text-xs">{unbudgeted.length}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unbudgeted.map((item) => (
              <div
                key={item.category}
                className="p-3.5 rounded-lg flex items-center justify-between text-xs"
                style={{
                  backgroundColor: "var(--surface-2)",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <span className="font-semibold block" style={{ color: "var(--text)" }}>
                    {item.category}
                  </span>
                  <span className="tabular-nums text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {formatINR(item.spent)} spent this month
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedBudget({ ...item, monthly_limit: 0 });
                    setModalOpen(true);
                  }}
                  className="btn-outline text-xs py-1 px-2.5"
                >
                  + Set Limit
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <BudgetModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialBudget={selectedBudget}
        onSuccess={fetchStatus}
      />
    </div>
  );
}
