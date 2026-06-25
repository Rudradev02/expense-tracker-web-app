const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const config = {
  income: {
    accent: "border-l-emerald-500",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    amountColor: "text-emerald-600 dark:text-emerald-400",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
      </svg>
    ),
  },
  expense: {
    accent: "border-l-rose-500",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-500",
    amountColor: "text-rose-600 dark:text-rose-400",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
      </svg>
    ),
  },
  balance: {
    accent: "border-l-indigo-500",
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-500",
    amountColor: "text-indigo-600 dark:text-indigo-400",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
};

export default function SummaryCard({ title, amount, type }) {
  const cfg = config[type] || config.balance;
  const isNegativeBalance = type === "balance" && amount < 0;

  return (
    <div
      className={`dashboard-card border-l-4 ${isNegativeBalance ? "border-l-amber-500" : cfg.accent} p-6 hover:-translate-y-1`}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="section-label">{title}</p>
          <p className={`text-3xl font-extrabold tracking-tight ${isNegativeBalance ? "text-amber-600 dark:text-amber-400" : cfg.amountColor}`}>
            {formatCurrency(amount)}
          </p>
        </div>
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${cfg.iconBg} ${cfg.iconColor} shadow-inner`}>
          {cfg.icon}
        </div>
      </div>
    </div>
  );
}
