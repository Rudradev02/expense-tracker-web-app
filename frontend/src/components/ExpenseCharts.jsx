import {
  PieChart,
  Pie,
  Cell,
  Tooltip as PieTooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as AreaTooltip,
  ResponsiveContainer,
} from "recharts";

const FINTECH_COLORS = [
  "#2563EB", // Primary Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Coral Red
  "#8B5CF6", // Violet
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#6366f1", // Indigo
];

const formatINR = (value) => `₹${value.toLocaleString("en-IN")}`;

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-slate-900/95 dark:bg-zinc-900/95 text-white border border-slate-700/80 rounded-xl p-3 shadow-xl backdrop-blur-md">
      {label && (
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
          {label}
        </p>
      )}
      {payload.map((entry, index) => (
        <p key={index} className="text-sm font-bold flex items-center justify-between gap-4" style={{ color: entry.color }}>
          <span>{entry.name}:</span>
          <span>{formatINR(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

function DonutCenterLabel({ viewBox, total }) {
  const { cx, cy } = viewBox;
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" className="text-xs font-bold fill-slate-400 uppercase tracking-wider">
        Total
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" className="text-lg font-black fill-rose-500">
        {formatINR(total)}
      </text>
    </g>
  );
}

export default function ExpenseCharts({ expenseByCategory, monthlyTrends }) {
  if (!expenseByCategory || !monthlyTrends) return null;

  const totalExpense = expenseByCategory.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Category Breakdown Donut */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Expense Overview
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Categorized spending distribution
            </p>
          </div>
        </div>

        <div className="h-72">
          {expenseByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {expenseByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={FINTECH_COLORS[index % FINTECH_COLORS.length]} />
                  ))}
                </Pie>
                <PieTooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "12px", fontWeight: 600 }} />
                {totalExpense > 0 && (
                  <Pie
                    data={[{ value: 1 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={0}
                    dataKey="value"
                  >
                    <Cell fill="transparent" />
                    <DonutCenterLabel viewBox={{ cx: 0, cy: 0 }} total={totalExpense} />
                  </Pie>
                )}
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 mb-2">
                📊
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">
                No expense data available
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Trends Area Chart */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Monthly Trends
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Income vs expense comparison over time
            </p>
          </div>
        </div>

        <div className="h-72">
          {monthlyTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends}>
                <defs>
                  <linearGradient id="gradientIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradientExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                  dx={-10}
                />
                <AreaTooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px', fontWeight: 600 }} />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fill="url(#gradientIncome)"
                  dot={{ r: 3, fill: "#10B981", strokeWidth: 2, stroke: "#fff" }}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Expense"
                  stroke="#EF4444"
                  strokeWidth={2.5}
                  fill="url(#gradientExpense)"
                  dot={{ r: 3, fill: "#EF4444", strokeWidth: 2, stroke: "#fff" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 mb-2">
                📈
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">
                No monthly trend data available
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
