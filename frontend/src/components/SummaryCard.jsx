import { useEffect, useRef, useState } from "react";
import { useCurrency } from "../context/CurrencyContext";

const icons = {
  income: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 11l5-5m0 0l5 5m-5-5v12" />
    </svg>
  ),
  expense: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
    </svg>
  ),
  balance: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  transactions: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
};

function useAnimatedCounter(target, duration = 1000) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (target === 0) {
      rafRef.current = requestAnimationFrame(() => setValue(0));
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }

    const absTarget = Math.abs(target);
    startRef.current = performance.now();

    const step = (now) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * absTarget) * Math.sign(target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}

export default function SummaryCard({
  title,
  amount,
  type = "balance",
  isRawNumber = false,
  isHero = false,
  supportingStat = null,
  changePct = null,
  hasPreviousData = false,
  loading = false,
}) {
  const { formatCurrency, baseCurrency } = useCurrency();
  const icon = icons[type] || icons.balance;
  const isNegative = type === "balance" && amount < 0;
  const animatedAmount = useAnimatedCounter(amount);

  const displayValue = isRawNumber
    ? animatedAmount.toLocaleString(baseCurrency === "INR" ? "en-IN" : "en-US")
    : formatCurrency(animatedAmount);

  // Helper for rendering trend indicator
  const renderTrendIndicator = () => {
    if (loading) {
      return (
        <div
          className="skeleton inline-block"
          style={{
            height: "20px",
            width: "92px",
            borderRadius: "6px",
          }}
        />
      );
    }

    if (!hasPreviousData || changePct === null || changePct === undefined) {
      return null;
    }

    // Determine favorable vs unfavorable sentiment
    // For expense: decreased spending (changePct < 0) is favorable, increased (changePct > 0) is unfavorable
    // For income & balance: increased (changePct > 0) is favorable, decreased (changePct < 0) is unfavorable
    const isNeutral = changePct === 0;
    const isFavorable = type === "expense" ? changePct < 0 : changePct > 0;

    let badgeColor = "var(--text-muted)";
    let badgeBg = "var(--surface-2)";
    let badgeBorder = "var(--border)";

    if (!isNeutral) {
      if (isFavorable) {
        badgeColor = "var(--income)";
        badgeBg = "rgba(45, 142, 95, 0.12)";
        badgeBorder = "rgba(45, 142, 95, 0.25)";
      } else {
        badgeColor = "var(--expense)";
        badgeBg = "rgba(224, 122, 107, 0.12)";
        badgeBorder = "rgba(224, 122, 107, 0.25)";
      }
    }

    const sign = changePct > 0 ? "+" : "";
    const label = `${sign}${changePct}% vs previous`;

    return (
      <span
        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded tabular-nums"
        style={{
          backgroundColor: badgeBg,
          color: badgeColor,
          border: `1px solid ${badgeBorder}`,
        }}
        title={`Comparison with previous period: ${sign}${changePct}%`}
      >
        {!isNeutral && (
          <svg
            className="w-3 h-3 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            {changePct > 0 ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            )}
          </svg>
        )}
        <span>{label}</span>
      </span>
    );
  };

  if (isHero) {
    return (
      <div
        className="hero-card p-6 sm:p-7 flex flex-col justify-between"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          transition: "border-color 150ms ease",
        }}
      >
        <div>
          <div className="flex items-center justify-between mb-3">
            <span
              className="section-label"
              style={{ color: "var(--text-muted)" }}
            >
              {title}
            </span>
            <span
              style={{ color: "var(--text-muted)", width: "18px", height: "18px" }}
              aria-hidden="true"
            >
              {icon}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-2.5 sm:gap-3 mt-1">
            {loading ? (
              <div
                className="skeleton"
                style={{ height: "40px", width: "160px", borderRadius: "8px" }}
              />
            ) : (
              <h3
                className="text-3xl sm:text-4xl font-normal tracking-tight font-serif tabular-nums m-0"
                style={{
                  color: isNegative ? "var(--expense)" : "var(--text)",
                  fontFamily: "var(--font-serif)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {displayValue}
              </h3>
            )}
            {renderTrendIndicator()}
          </div>
        </div>

        {supportingStat && (
          <div
            className="mt-4 pt-3 flex items-center justify-between text-xs"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <span style={{ color: "var(--text-muted)" }}>Activity</span>
            {loading ? (
              <div className="skeleton" style={{ height: "14px", width: "80px", borderRadius: "4px" }} />
            ) : (
              <span
                className="tabular-nums font-medium"
                style={{ color: "var(--text)" }}
              >
                {supportingStat}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Supporting cards (Income, Expense, etc.)
  let valueColor = "var(--text)";
  if (type === "income") valueColor = "var(--income)";
  if (type === "expense") valueColor = "var(--expense)";

  return (
    <div
      className="card p-5 sm:p-6 flex flex-col justify-between"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        transition: "border-color 150ms ease",
      }}
    >
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span
            className="section-label"
            style={{ color: "var(--text-muted)" }}
          >
            {title}
          </span>
          <span
            style={{ color: "var(--text-muted)", width: "16px", height: "16px" }}
            aria-hidden="true"
          >
            {icon}
          </span>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-2 mt-1">
          {loading ? (
            <div
              className="skeleton"
              style={{ height: "28px", width: "120px", borderRadius: "6px" }}
            />
          ) : (
            <h3
              className="text-xl sm:text-2xl font-semibold tracking-tight tabular-nums m-0"
              style={{
                color: valueColor,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {displayValue}
            </h3>
          )}
          {renderTrendIndicator()}
        </div>
      </div>
    </div>
  );
}
