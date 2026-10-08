import {
  PieChart,
  Pie,
  Cell,
  Tooltip as PieTooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as LineTooltip,
  ResponsiveContainer,
} from "recharts";

// Obsidian & Champagne Muted Color Palette
const DONUT_PALETTE = [
  "#D4B483", // Champagne Gold (Accent)
  "#BA9E70", // Muted Brass
  "#9E8963", // Dark Ochre
  "#8E8B84", // Warm Slate Muted
  "#73706A", // Stone Gray
  "#5A5752", // Deep Charcoal
  "#44413E", // Dark Obsidian
  "#C4B08F", // Pale Sand
];

const COLORS = {
  accent: "#D4B483",
  expense: "#E07A6B",
  income: "#D4B483", // Muted Gold for income per prompt ("gold for income and coral for expenses")
  border: "#26262A",
  textMuted: "#8E8B84",
  text: "#F4F1EA",
  surface2: "#1B1B1E",
};

const formatINR = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

function CustomChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="p-3 text-xs"
      style={{
        backgroundColor: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        color: "var(--text)",
        boxShadow: "none",
      }}
    >
      {label && (
        <p
          className="text-[10px] font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </p>
      )}
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-4 font-medium"
          >
            <span className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: entry.color || entry.fill }}
              />
              <span>{entry.name}:</span>
            </span>
            <span
              className="tabular-nums"
              style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}
            >
              {formatINR(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExpenseCharts({ expenseByCategory, monthlyTrends, loading = false }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="skeleton" style={{ height: "340px", borderRadius: "14px" }} />
        <div className="skeleton" style={{ height: "340px", borderRadius: "14px" }} />
      </div>
    );
  }

  if (!expenseByCategory || !monthlyTrends) return null;

  // Sanitize and filter out zero or invalid values
  const validExpenses = (expenseByCategory || [])
    .map((item) => ({
      name: item.name || "Other",
      value: Number(item.value) || 0,
    }))
    .filter((item) => item.value > 0);

  const totalExpense = validExpenses.reduce((sum, item) => sum + item.value, 0);

  const validTrends = (monthlyTrends || []).map((item) => ({
    name: item.name || "",
    income: Number(item.income) || 0,
    expense: Number(item.expense) || 0,
  }));

  const hasTrendData = validTrends.some((t) => t.income > 0 || t.expense > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Category Breakdown Donut */}
      <div
        className="card p-5 sm:p-6"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
        }}
      >
        <div className="mb-4">
          <span className="section-label" style={{ color: "var(--text-muted)" }}>
            Breakdown
          </span>
          <h3 className="text-sm font-semibold tracking-tight m-0 mt-1" style={{ color: "var(--text)" }}>
            Expense Overview
          </h3>
          <p className="text-xs m-0 mt-0.5" style={{ color: "var(--text-muted)" }}>
            Categorized spending distribution
          </p>
        </div>

        <div className="h-72 relative">
          {validExpenses.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={validExpenses}
                    cx="50%"
                    cy="45%"
                    innerRadius={74}
                    outerRadius={88}
                    paddingAngle={validExpenses.length > 1 ? 3 : 0}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {validExpenses.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={DONUT_PALETTE[index % DONUT_PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <PieTooltip content={<CustomChartTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    iconSize={6}
                    wrapperStyle={{
                      paddingTop: "10px",
                      fontSize: "11px",
                      color: "var(--text-muted)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Centered Total metric (Fixed: No SVG clipping overflow bug) */}
              <div
                className="absolute pointer-events-none flex flex-col items-center justify-center text-center"
                style={{
                  top: "45%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--text-muted)", letterSpacing: "0.08em" }}
                >
                  Total
                </span>
                <span
                  className="text-base sm:text-lg font-normal tracking-tight font-serif tabular-nums block mt-0.5"
                  style={{
                    color: "var(--text)",
                    fontFamily: "var(--font-serif)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatINR(totalExpense)}
                </span>
              </div>
            </>
          ) : (
            <div
              className="flex h-full flex-col items-center justify-center text-center p-6"
              style={{ color: "var(--text-muted)" }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-3 text-xs"
                style={{
                  backgroundColor: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
              <p className="text-xs font-medium" style={{ color: "var(--text)" }}>
                No expense data recorded
              </p>
              <p className="text-[11px] mt-1 max-w-xs" style={{ color: "var(--text-muted)" }}>
                Category breakdown will appear here once expenses are logged.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Trends Line Chart (1.5px lines: Gold for income, Coral for expenses) */}
      <div
        className="card p-5 sm:p-6"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
        }}
      >
        <div className="mb-4">
          <span className="section-label" style={{ color: "var(--text-muted)" }}>
            History
          </span>
          <h3 className="text-sm font-semibold tracking-tight m-0 mt-1" style={{ color: "var(--text)" }}>
            Monthly Trends
          </h3>
          <p className="text-xs m-0 mt-0.5" style={{ color: "var(--text-muted)" }}>
            Income vs expense comparison over time
          </p>
        </div>

        <div className="h-72">
          {hasTrendData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={validTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={COLORS.border}
                  strokeOpacity={0.7}
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: COLORS.textMuted, fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: COLORS.textMuted, fontSize: 11 }}
                  tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + "k" : val}`}
                  dx={-5}
                />
                <LineTooltip content={<CustomChartTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  iconSize={6}
                  wrapperStyle={{
                    paddingTop: "12px",
                    fontSize: "11px",
                    color: "var(--text-muted)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke={COLORS.income}
                  strokeWidth={1.5}
                  dot={validTrends.length <= 2 ? { r: 3.5, fill: COLORS.income } : false}
                  activeDot={{
                    r: 4,
                    fill: COLORS.income,
                    stroke: COLORS.surface2,
                    strokeWidth: 2,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="Expense"
                  stroke={COLORS.expense}
                  strokeWidth={1.5}
                  dot={validTrends.length <= 2 ? { r: 3.5, fill: COLORS.expense } : false}
                  activeDot={{
                    r: 4,
                    fill: COLORS.expense,
                    stroke: COLORS.surface2,
                    strokeWidth: 2,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div
              className="flex h-full flex-col items-center justify-center text-center p-6"
              style={{ color: "var(--text-muted)" }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-3 text-xs"
                style={{
                  backgroundColor: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <p className="text-xs font-medium" style={{ color: "var(--text)" }}>
                No trend data available
              </p>
              <p className="text-[11px] mt-1 max-w-xs" style={{ color: "var(--text-muted)" }}>
                Monthly cashflow trajectory will render once transactions are recorded.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
