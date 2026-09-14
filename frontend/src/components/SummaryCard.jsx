import { useEffect, useRef, useState } from "react";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const config = {
  income: {
    accent: "border-emerald-500",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    textGradient: "text-emerald-600 dark:text-emerald-400",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
      </svg>
    ),
  },
  expense: {
    accent: "border-rose-500",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-500",
    textGradient: "text-rose-600 dark:text-rose-400",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
      </svg>
    ),
  },
  balance: {
    accent: "border-blue-500",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    textGradient: "text-blue-600 dark:text-blue-400",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  transactions: {
    accent: "border-indigo-500",
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-500",
    textGradient: "text-indigo-600 dark:text-indigo-400",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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

export default function SummaryCard({ title, amount, type, isRawNumber = false }) {
  const cfg = config[type] || config.balance;
  const isNegativeBalance = type === "balance" && amount < 0;
  const animatedAmount = useAnimatedCounter(amount);

  const displayValue = isRawNumber
    ? animatedAmount.toLocaleString("en-IN")
    : formatCurrency(animatedAmount);

  return (
    <div className={`bg-white dark:bg-zinc-900 border-l-4 ${cfg.accent} border-y border-r border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs transition-transform duration-200 hover:-translate-y-1`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
            {title}
          </p>
          <h3 className={`text-2xl font-bold mt-1 tracking-tight ${isNegativeBalance ? "text-amber-500" : cfg.textGradient}`}>
            {displayValue}
          </h3>
        </div>

        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cfg.iconBg} ${cfg.iconColor}`}>
          {cfg.icon}
        </div>
      </div>
    </div>
  );
}
