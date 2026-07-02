import { useEffect, useRef, useState } from "react";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const config = {
  income: {
    accent: "card-accent-income",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    gradient: "stat-value-gradient-income",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
      </svg>
    ),
  },
  expense: {
    accent: "card-accent-expense",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-500",
    gradient: "stat-value-gradient-expense",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
      </svg>
    ),
  },
  balance: {
    accent: "card-accent-balance",
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-500",
    gradient: "stat-value-gradient-balance",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
};

function useAnimatedCounter(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }

    const absTarget = Math.abs(target);
    startRef.current = performance.now();

    const step = (now) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
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

export default function SummaryCard({ title, amount, type, delay = 0 }) {
  const cfg = config[type] || config.balance;
  const isNegativeBalance = type === "balance" && amount < 0;
  const animatedAmount = useAnimatedCounter(amount);

  const gradientClass = isNegativeBalance
    ? "stat-value-gradient-negative"
    : cfg.gradient;

  return (
    <div
      className={`dashboard-card ${cfg.accent} p-6 hover:-translate-y-1 animate-in`}
      style={{ animationDelay: `${delay * 0.12}s` }}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="section-label">{title}</p>
          <p className={`stat-value ${gradientClass}`}>
            {formatCurrency(animatedAmount)}
          </p>
        </div>
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${cfg.iconBg} ${cfg.iconColor} shadow-inner`}>
          {cfg.icon}
        </div>
      </div>

      {/* Premium SVG Sparkline and caption */}
      <div className="mt-5 pt-4 border-t border-slate-100/50 dark:border-zinc-800/50 flex items-center justify-between">
        <div className="w-24 h-8">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 120 40">
            <defs>
              <linearGradient id={`sparkline-${type}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={type === 'income' ? '#34d399' : type === 'expense' ? '#fb7185' : '#818cf8'} />
                <stop offset="100%" stopColor={type === 'income' ? '#059669' : type === 'expense' ? '#e11d48' : '#4f46e5'} />
              </linearGradient>
            </defs>
            <path
              d={
                type === "income"
                  ? "M 0 32 Q 20 8, 40 26 T 80 12 T 120 2"
                  : type === "expense"
                    ? "M 0 10 Q 20 38, 40 18 T 80 34 T 120 38"
                    : "M 0 28 Q 20 12, 40 32 T 80 14 T 120 8"
              }
              fill="none"
              stroke={`url(#sparkline-${type})`}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="sparkline-path"
            />
          </svg>
        </div>
        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 tracking-wider uppercase">
          {type === "income"
            ? "↑ Healthy Inflow"
            : type === "expense"
              ? "↓ Controlled Spends"
              : amount >= 0
                ? "★ Positive Growth"
                : "⚠ Balance Warning"}
        </span>
      </div>
    </div>
  );
}
