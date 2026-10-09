import { useState, useRef, useEffect } from "react";
import { useCurrency } from "../context/CurrencyContext";

export default function ForecastCard({
  forecast,
  loading = false,
  error = null,
  onRetry,
}) {
  const { displayMoney } = useCurrency();
  const formatINR = (val) => displayMoney(Math.round(Number(val || 0)));
  const [showTooltip, setShowTooltip] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const tooltipRef = useRef(null);
  const infoBtnRef = useRef(null);

  // Close tooltip on click outside or escape key
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target) &&
        infoBtnRef.current &&
        !infoBtnRef.current.contains(e.target)
      ) {
        setShowTooltip(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setShowTooltip(false);
      }
    }

    if (showTooltip) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showTooltip]);

  // Loading skeleton state
  if (loading) {
    return (
      <div
        className="card p-5 sm:p-6 animate-pulse"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1.5">
            <div className="skeleton h-3 w-20" style={{ height: "12px", width: "80px" }} />
            <div className="skeleton h-5 w-48" style={{ height: "20px", width: "190px" }} />
          </div>
          <div className="skeleton h-6 w-24" style={{ height: "24px", width: "90px", borderRadius: "999px" }} />
        </div>
        <div className="skeleton h-9 w-64 my-4" style={{ height: "36px", width: "240px" }} />
        <div className="skeleton h-4 w-52 mb-6" style={{ height: "14px", width: "200px" }} />
        <div className="space-y-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="skeleton h-4 w-full" style={{ height: "14px" }} />
          <div className="skeleton h-4 w-5/6" style={{ height: "14px" }} />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="card p-5 sm:p-6"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="section-label" style={{ color: "var(--text-muted)" }}>
              Forecast
            </span>
            <h3 className="text-sm font-semibold tracking-tight m-0 mt-1" style={{ color: "var(--text)" }}>
              Spending Projection
            </h3>
            <p className="text-xs mt-1.5" style={{ color: "var(--expense)" }}>
              {error}
            </p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="btn-outline text-xs py-1 px-3 cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // Empty state: insufficient historical data (< 2 months)
  if (!forecast || !forecast.has_enough_data) {
    const monthsAnalyzed = forecast?.months_analyzed || 0;
    const targetMonth = forecast?.target_month || "Next month";

    return (
      <div
        className="card p-5 sm:p-6"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
        }}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <span className="section-label" style={{ color: "var(--text-muted)" }}>
              Forecast
            </span>
            <h3 className="text-sm font-semibold tracking-tight m-0 mt-0.5" style={{ color: "var(--text)" }}>
              Next-Month Spending Forecast
            </h3>
          </div>
          <span
            className="text-[11px] font-medium px-2.5 py-1 rounded-full tabular-nums"
            style={{
              backgroundColor: "var(--surface-2)",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
            }}
          >
            {targetMonth}
          </span>
        </div>

        <div
          className="p-4 rounded-xl my-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          style={{
            backgroundColor: "var(--surface-2)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 shrink-0 opacity-70"
                style={{ color: "var(--text-muted)" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h4 className="text-xs font-semibold m-0" style={{ color: "var(--text)" }}>
                Not enough data to calculate forecast
              </h4>
            </div>
            <p className="text-xs m-0 pl-6" style={{ color: "var(--text-muted)" }}>
              {forecast?.message ||
                "At least 2 months of expense data are required to predict next month's spending reliably."}
            </p>
          </div>

          {/* Progress toward 2 months */}
          <div className="sm:text-right shrink-0 pl-6 sm:pl-0">
            <span className="text-[11px] font-medium block" style={{ color: "var(--text-muted)" }}>
              Data availability
            </span>
            <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--accent)" }}>
              {monthsAnalyzed} of 2 months recorded
            </span>
          </div>
        </div>

        <p className="text-[11px] m-0 mt-3" style={{ color: "var(--text-muted)" }}>
          Once 2 or more months of expense history are logged, this card will provide a weighted moving average projection with recurring commitment breakdowns.
        </p>
      </div>
    );
  }

  // Active Forecast State
  const projectedTotal = forecast.projected_total || 0;
  const targetMonth = forecast.target_month || "Next Month";
  const targetMonthShort = forecast.target_month_short || targetMonth;
  const categories = forecast.category_breakdown || [];
  const recurringTotal = forecast.recurring_commitments_total || 0;
  const visibleCategories = showAllCategories ? categories : categories.slice(0, 4);

  return (
    <div
      className="card p-5 sm:p-6 relative"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <span className="section-label" style={{ color: "var(--text-muted)" }}>
            Forecast
          </span>
          <h3 className="text-sm font-semibold tracking-tight m-0 mt-0.5" style={{ color: "var(--text)" }}>
            Next-Month Spending Forecast
          </h3>
        </div>

        {/* Target Month Badge */}
        <span
          className="text-[11px] font-medium px-2.5 py-1 rounded-full tabular-nums flex items-center gap-1.5"
          style={{
            backgroundColor: "var(--surface-2)",
            color: "var(--accent)",
            border: "1px solid var(--border)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ backgroundColor: "var(--accent)" }}
          />
          {targetMonthShort}
        </span>
      </div>

      {/* Main Metric Row: Projected spend: ₹XX,XXX */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mt-4 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Projected spend:
          </span>
          <span
            className="text-2xl sm:text-3xl font-serif font-normal tabular-nums tracking-tight"
            style={{
              color: "var(--text)",
              fontFamily: "var(--font-serif)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatINR(projectedTotal)}
          </span>

          {/* Interactive Info / Tooltip Button */}
          <div className="relative inline-flex items-center">
            <button
              ref={infoBtnRef}
              type="button"
              onClick={() => setShowTooltip((prev) => !prev)}
              onMouseEnter={() => setShowTooltip(true)}
              aria-label="How projected spend is calculated"
              className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] transition-colors cursor-pointer"
              style={{
                backgroundColor: showTooltip ? "var(--accent)" : "var(--surface-2)",
                color: showTooltip ? "var(--bg)" : "var(--text-muted)",
                border: "1px solid var(--border)",
              }}
            >
              i
            </button>

            {/* Explanation Tooltip Popover */}
            {showTooltip && (
              <div
                ref={tooltipRef}
                role="tooltip"
                className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-50 p-4 rounded-xl text-xs w-72 sm:w-80 animate-fade-in"
                style={{
                  backgroundColor: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.45)",
                }}
              >
                <div className="flex items-center justify-between pb-2 mb-2" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="font-semibold text-xs" style={{ color: "var(--text)" }}>
                    How it's calculated
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTooltip(false)}
                    className="text-xs p-0.5 opacity-60 hover:opacity-100 cursor-pointer"
                    style={{ color: "var(--text-muted)" }}
                  >
                    ✕
                  </button>
                </div>

                <p className="text-[11px] leading-relaxed m-0 mb-2.5" style={{ color: "var(--text-muted)" }}>
                  {forecast.calculation_explanation ||
                    "Calculated using a weighted moving average of your recent months of spending, combined with active recurring commitments."}
                </p>

                <div className="space-y-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
                  <div className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: "var(--accent)" }} />
                    <span>
                      <strong style={{ color: "var(--text)" }}>Weighted Moving Average:</strong> Recent months carry higher weight (linear progression) to reflect recent habits.
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: "var(--accent)" }} />
                    <span>
                      <strong style={{ color: "var(--text)" }}>Recurring Commitments:</strong> Active rules (rent, subscriptions) guarantee minimum baseline coverage.
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: "var(--accent)" }} />
                    <span>
                      <strong style={{ color: "var(--text)" }}>Current Month Prorating:</strong> The ongoing month is scaled by days elapsed to avoid deflating the estimate.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Confidence note pill */}
        <div
          className="text-xs flex items-center gap-1.5 font-medium self-start sm:self-auto"
          style={{ color: "var(--text-muted)" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
            style={{ backgroundColor: "var(--income)" }}
          />
          <span>{forecast.confidence_note || `Based on ${forecast.months_analyzed || 0} months of data`}</span>
        </div>
      </div>

      {/* Sub-stat row: Recurring commitments */}
      {recurringTotal > 0 && (
        <div
          className="text-xs flex items-center gap-2 mb-4"
          style={{ color: "var(--text-muted)" }}
        >
          <svg
            className="w-3.5 h-3.5 shrink-0 opacity-70"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>
            Includes <strong style={{ color: "var(--text)" }}>{formatINR(recurringTotal)}</strong> in scheduled recurring commitments
          </span>
        </div>
      )}

      {/* Category Breakdown Progress Bars */}
      {visibleCategories.length > 0 && (
        <div
          className="pt-4 mt-2 space-y-3"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Projected by Category
            </span>
            <span className="text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>
              {categories.length} {categories.length === 1 ? "category" : "categories"}
            </span>
          </div>

          <div className="space-y-2.5">
            {visibleCategories.map((cat, idx) => {
              const pct = cat.percentage || 0;
              return (
                <div key={cat.category || idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="truncate pr-2" style={{ color: "var(--text)" }}>
                      {cat.category}
                      {cat.recurring_amount > 0 && (
                        <span
                          className="ml-1.5 text-[10px] px-1 py-0.2 rounded font-normal"
                          style={{
                            backgroundColor: "var(--surface-2)",
                            color: "var(--text-muted)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          recurring
                        </span>
                      )}
                    </span>
                    <div className="text-right shrink-0">
                      <span className="tabular-nums font-medium" style={{ color: "var(--text)" }}>
                        {formatINR(cat.projected)}
                      </span>
                      <span className="text-[10px] ml-1.5 tabular-nums" style={{ color: "var(--text-muted)" }}>
                        ({pct}%)
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div
                    className="w-full h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: "var(--surface-2)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(2, pct))}%`,
                        backgroundColor: idx === 0 ? "var(--accent)" : "var(--text-muted)",
                        opacity: idx === 0 ? 1 : 0.6,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Toggle show all categories if > 4 */}
          {categories.length > 4 && (
            <button
              type="button"
              onClick={() => setShowAllCategories((prev) => !prev)}
              className="text-[11px] font-medium pt-1 hover:underline cursor-pointer flex items-center gap-1"
              style={{ color: "var(--accent)" }}
            >
              {showAllCategories ? "Show less" : `View all ${categories.length} categories ▾`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
