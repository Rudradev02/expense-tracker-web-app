import { useState, useEffect, useCallback } from "react";
import { getInsights } from "../services/api";
import { useAppRefresh } from "../context/AppRefreshContext";

export default function InsightsCard() {
  const { refreshKeys } = useAppRefresh();
  const [insights, setInsights] = useState([]);
  const [monthName, setMonthName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInsights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getInsights();
      if (res.data) {
        setInsights(Array.isArray(res.data.insights) ? res.data.insights : []);
        setMonthName(res.data.month_name || "");
      }
    } catch (err) {
      console.error("Failed to load insights:", err);
      setError("Unable to compute monthly insights.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights, refreshKeys.dashboard, refreshKeys.transactions]);

  const getHighlightColor = (type) => {
    if (type === "income") return "var(--income)";
    if (type === "expense") return "var(--expense)";
    return "var(--accent)";
  };

  return (
    <div
      className="card p-5 sm:p-6 space-y-4"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--accent)",
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight m-0" style={{ color: "var(--text)" }}>
              Financial Insights
            </h3>
            {monthName && (
              <p className="text-[11px] m-0" style={{ color: "var(--text-muted)" }}>
                {monthName} vs Previous Month
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={fetchInsights}
          disabled={loading}
          className="btn-icon"
          title="Refresh insights"
          aria-label="Refresh insights"
        >
          <svg
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Content State */}
      {loading ? (
        <div className="space-y-3 py-1">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full skeleton shrink-0" />
            <div className="h-4 skeleton w-3/4 rounded" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full skeleton shrink-0" />
            <div className="h-4 skeleton w-1/2 rounded" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full skeleton shrink-0" />
            <div className="h-4 skeleton w-2/3 rounded" />
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-between text-xs py-2" style={{ color: "var(--text-muted)" }}>
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchInsights}
            className="btn-secondary py-1 px-2.5 text-xs"
          >
            Retry
          </button>
        </div>
      ) : insights.length === 0 ? (
        <div className="py-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
          <p className="m-0">
            No comparative trends available yet. Record transactions across multiple months to reveal spending patterns and category shifts.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((item, idx) => {
            const highlightColor = getHighlightColor(item.type);

            return (
              <div
                key={item.id || idx}
                className="flex items-start gap-3 text-xs leading-relaxed"
                style={{ color: "var(--text)" }}
              >
                {/* Arrow or dot marker icon */}
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    backgroundColor: "var(--surface-2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {item.direction === "up" ? (
                    <svg
                      className="w-3 h-3"
                      style={{ color: highlightColor }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.25}
                        d="M5 10l7-7m0 0l7 7m-7-7v18"
                      />
                    </svg>
                  ) : item.direction === "down" ? (
                    <svg
                      className="w-3 h-3"
                      style={{ color: highlightColor }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.25}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  ) : (
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: highlightColor }}
                    />
                  )}
                </div>

                {/* Plain-language sentence with strictly targeted number/highlight coloring */}
                <p className="m-0 flex-1">
                  <span>{item.prefix}</span>
                  <span
                    className="font-semibold tabular-nums inline-flex items-center gap-0.5 mx-0.5"
                    style={{ color: highlightColor }}
                  >
                    {item.highlight}
                    {item.direction === "up" && (
                      <svg className="w-2.5 h-2.5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    )}
                    {item.direction === "down" && (
                      <svg className="w-2.5 h-2.5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    )}
                  </span>
                  <span>{item.suffix}</span>
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
