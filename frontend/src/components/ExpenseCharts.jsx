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

const COLORS = [
  "#6366f1", // indigo-500
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#10b981", // emerald-500
  "#3b82f6", // blue-500
];

const formatINR = (value) => `₹${value.toLocaleString("en-IN")}`;

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.88)",
        backdropFilter: "blur(12px)",
        borderRadius: "12px",
        padding: "12px 16px",
        border: "1px solid rgba(99, 102, 241, 0.25)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
      }}
    >
      {label && (
        <p style={{ color: "#94a3b8", fontSize: "12px", fontWeight: 600, marginBottom: "6px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {label}
        </p>
      )}
      {payload.map((entry, index) => (
        <p key={index} style={{ color: entry.color, fontSize: "14px", fontWeight: 700, margin: "2px 0" }}>
          {entry.name}: {formatINR(entry.value)}
        </p>
      ))}
    </div>
  );
}

function DonutCenterLabel({ viewBox, total }) {
  const { cx, cy } = viewBox;
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" style={{ fontSize: "12px", fontWeight: 600, fill: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase" }}>
        Total
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" style={{ fontSize: "20px", fontWeight: 800, fill: "#f43f5e" }}>
        {formatINR(total)}
      </text>
    </g>
  );
}

export default function ExpenseCharts({ expenseByCategory, monthlyTrends }) {
  if (!expenseByCategory || !monthlyTrends) return null;

  const totalExpense = expenseByCategory.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="chart-container mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* Pie Chart */}
      <div className="dashboard-card p-6">
        <p className="section-label mb-4">Expenses by Category</p>
        <div className="h-72">
          {expenseByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {expenseByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <PieTooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: "12px", fontWeight: 600 }}
                />
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
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-zinc-800">
                <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">No expenses to show</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">Add some transactions to see your breakdown</p>
            </div>
          )}
        </div>
      </div>

      {/* Area Chart (replaces Line Chart) */}
      <div className="dashboard-card p-6">
        <p className="section-label mb-4">Monthly Trends</p>
        <div className="h-72">
          {monthlyTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends}>
                <defs>
                  <linearGradient id="gradientIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradientExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `₹${value > 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                  dx={-10}
                />
                <AreaTooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600 }} />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#10b981"
                  strokeWidth={3}
                  fill="url(#gradientIncome)"
                  dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Expense"
                  stroke="#f43f5e"
                  strokeWidth={3}
                  fill="url(#gradientExpense)"
                  dot={{ r: 4, fill: "#f43f5e", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-zinc-800">
                <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">No trends to show</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">Trends will appear after adding transactions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
