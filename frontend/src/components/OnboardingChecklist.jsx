import { useState, useMemo } from "react";
import { Link } from "react-router-dom";

export default function OnboardingChecklist({
  categoriesCount = 0,
  transactionsCount = 0,
  budgetsCount = 0,
  onAddTransaction,
  onLoadSampleData,
  loadingSample = false,
}) {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("onboarding_checklist_dismissed") === "true";
  });

  const isCategoryDone = useMemo(() => {
    return categoriesCount > 5 || localStorage.getItem("onboarding_category_done") === "true";
  }, [categoriesCount]);

  const isTransactionDone = transactionsCount > 0;
  const isBudgetDone = budgetsCount > 0;

  const completedCount =
    (isCategoryDone ? 1 : 0) + (isTransactionDone ? 1 : 0) + (isBudgetDone ? 1 : 0);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("onboarding_checklist_dismissed", "true");
  };

  // Automatically disappears when all 3 items are complete or when user dismissed
  if (dismissed || completedCount === 3) {
    return null;
  }

  const items = [
    {
      id: "category",
      title: "Add a custom category",
      description: "Define categories tailored to your personal financial habits",
      done: isCategoryDone,
      action: (
        <Link
          to="/categories"
          className="text-xs font-medium no-underline transition-colors"
          style={{ color: "var(--accent)" }}
          onClick={() => localStorage.setItem("onboarding_category_done", "true")}
        >
          {isCategoryDone ? "View Categories →" : "Add Category →"}
        </Link>
      ),
    },
    {
      id: "transaction",
      title: "Add your first transaction",
      description: "Record an expense or income entry to initialize your dashboard",
      done: isTransactionDone,
      action: (
        <button
          type="button"
          onClick={onAddTransaction}
          className="text-xs font-medium bg-transparent border-none p-0 cursor-pointer transition-colors"
          style={{ color: "var(--accent)" }}
        >
          {isTransactionDone ? "Add Another →" : "Add Transaction →"}
        </button>
      ),
    },
    {
      id: "budget",
      title: "Set a monthly budget",
      description: "Establish category spending targets to avoid budget overruns",
      done: isBudgetDone,
      action: (
        <Link
          to="/budgets"
          className="text-xs font-medium no-underline transition-colors"
          style={{ color: "var(--accent)" }}
        >
          {isBudgetDone ? "View Budgets →" : "Set Budget →"}
        </Link>
      ),
    },
  ];

  const progressPercent = Math.round((completedCount / 3) * 100);

  return (
    <div
      className="card p-5 sm:p-6 animate-fade-in relative overflow-hidden"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
      }}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="section-label"
              style={{ color: "var(--accent)", letterSpacing: "0.08em" }}
            >
              First-run Onboarding
            </span>
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded tabular-nums"
              style={{
                backgroundColor: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              {completedCount} of 3 completed
            </span>
          </div>
          <h3 className="text-base font-semibold tracking-tight m-0" style={{ color: "var(--text)" }}>
            Get started with Expense Tracker
          </h3>
          <p className="text-xs m-0 mt-0.5" style={{ color: "var(--text-muted)" }}>
            Follow these essential steps to set up your financial tracking workspace.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs p-1 rounded hover:opacity-80 transition-opacity cursor-pointer shrink-0"
          style={{ color: "var(--text-muted)" }}
          aria-label="Dismiss checklist"
          title="Dismiss checklist"
        >
          ✕ Dismiss
        </button>
      </div>

      {/* Progress Bar */}
      <div
        className="w-full h-1.5 rounded-full overflow-hidden mb-5"
        style={{ backgroundColor: "var(--surface-2)" }}
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: "var(--accent)",
          }}
        />
      </div>

      {/* Checklist Items */}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 rounded-lg transition-colors"
            style={{
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors"
                style={{
                  backgroundColor: item.done ? "var(--income)" : "transparent",
                  border: item.done ? "none" : "1.5px solid var(--border)",
                  color: "var(--bg)",
                }}
                aria-hidden="true"
              >
                {item.done && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              <div className="flex flex-col min-w-0">
                <span
                  className="text-xs font-medium truncate"
                  style={{
                    color: item.done ? "var(--text-muted)" : "var(--text)",
                    textDecoration: item.done ? "line-through" : "none",
                  }}
                >
                  {item.title}
                </span>
                <span className="text-[11px] truncate hidden sm:inline" style={{ color: "var(--text-muted)" }}>
                  {item.description}
                </span>
              </div>
            </div>

            <div className="shrink-0 ml-3">{item.action}</div>
          </div>
        ))}
      </div>

      {/* Sample Data Footer */}
      {onLoadSampleData && (
        <div
          className="mt-4 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <span style={{ color: "var(--text-muted)" }}>
            Want to test out features with realistic data immediately?
          </span>
          <button
            type="button"
            disabled={loadingSample}
            onClick={onLoadSampleData}
            className="btn-outline py-1 px-3 text-xs self-start sm:self-auto cursor-pointer"
          >
            {loadingSample ? "Inserting Demo Data..." : "Load Sample Data"}
          </button>
        </div>
      )}
    </div>
  );
}
