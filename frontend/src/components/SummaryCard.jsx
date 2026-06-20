export default function SummaryCard({ title, amount, type }) {
  let bgStyles = "";
  let textStyles = "";
  let icon = "";

  if (type === "income") {
    bgStyles = "bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20";
    textStyles = "text-emerald-600 dark:text-emerald-400";
    icon = (
      <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    );
  } else if (type === "expense") {
    bgStyles = "bg-gradient-to-br from-rose-500/10 to-pink-500/5 border-rose-500/20";
    textStyles = "text-rose-600 dark:text-rose-400";
    icon = (
      <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
      </svg>
    );
  } else {
    bgStyles = amount >= 0 
      ? "bg-gradient-to-br from-violet-500/10 to-indigo-500/5 border-violet-500/20" 
      : "bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20";
    textStyles = amount >= 0 ? "text-violet-600 dark:text-violet-400" : "text-amber-600 dark:text-amber-400";
    icon = (
      <svg className="w-8 h-8 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);

  return (
    <div className={`p-6 bg-white dark:bg-zinc-900 border rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-between ${bgStyles}`}>
      <div>
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
          {title}
        </span>
        <span className={`text-2xl font-bold tracking-tight ${textStyles}`}>
          {formattedAmount}
        </span>
      </div>
      <div className="p-3 bg-white/80 dark:bg-zinc-800/80 rounded-xl shadow-sm">
        {icon}
      </div>
    </div>
  );
}
