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
import EmptyState from "./EmptyState";
import { useCurrency } from "../context/CurrencyContext";

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

function CustomChartTooltip({ active, payload, label }) {
  const { formatCurrency } = useCurrency();
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
        {payload.map((entry, index) => {
          if (entry.value === null || entry.value === undefined) return null;
          const isProjected = entry.dataKey === "projected" || entry.name?.includes("Projected");
          return (
            <div
              key={index}
              className="flex items-center justify-between gap-4 font-medium"
            >
              <span className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{
                    backgroundColor: entry.color || entry.fill,
                    border: isProjected ? "1px dashed var(--expense)" : "none",
                  }}
                />
                <span>{entry.name}:</span>
              </span>
              <span
                className="tabular-nums"
                style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}
              >
                {formatCurrency(entry.value)}
                {isProjected && (
                  <span className="text-[10px] ml-1 font-normal" style={{ color: "var(--accent)" }}>
                    (Forecast)
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ExpenseCharts({
  expenseByCategory,
  monthlyTrends,
  forecast = null,
  loading = false,
  onAddTransaction,
}) {
  const { formatCurrency, activeCurrencyInfo } = useCurrency();

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

  // Build chart trends data including next-month projection if forecast is available
  const hasForecast =
    Boolean(forecast?.has_enough_data) && Number(forecast?.projected_total) > 0;

  let chartTrends = validTrends.map((t, idx) => ({
    ...t,
    // Connect the last historical point to the projected line
    projected:
      hasForecast && idx === validTrends.length - 1 && t.expense > 0
        ? t.expense
        : null,
  }));

  if (hasForecast && validTrends.length > 0) {
    chartTrends.push({
      name: forecast.target_month_short || "Forecast",
      income: null,
      expense: null,
      projected: forecast.projected_total,
      isForecast: true,
    });
  }

  const hasTrendData =
    validTrends.some((t) => t.income > 0 || t.expense > 0) || hasForecast;

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
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {validExpenses.length > 0 ? (
                <>
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
                </>
              ) : (
                <Pie
                  data={[{ name: "No data", value: 1 }]}
                  cx="50%"
                  cy="45%"
                  innerRadius={74}
                  outerRadius={88}
                  dataKey="value"
                  stroke="var(--border)"
                  strokeWidth={1}
                  isAnimationActive={false}
                >
                  <Cell fill="var(--surface-2)" />
                </Pie>
              )}
            </PieChart>
          </ResponsiveContainer>

          {/* Centered Total metric or Neutral Ring No Data Indicator */}
          <div
            className="absolute pointer-events-none flex flex-col items-center justify-center text-center"
            style={{
              top: "45%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            {validExpenses.length > 0 ? (
              <>
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
                  {formatCurrency(totalExpense)}
                </span>
              </>
            ) : (
              <>
                <span
                  className="text-xs font-semibold tracking-tight block"
                  style={{ color: "var(--text)" }}
                >
                  No data yet
                </span>
                <span
                  className="text-[10px] block mt-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  {formatCurrency(0)} expenses
                </span>
              </>
            )}
          </div>

          {/* Bottom helper row when no expenses */}
          {validExpenses.length === 0 && (
            <div className="absolute bottom-1 inset-x-0 flex flex-col items-center justify-center text-center gap-1.5 pointer-events-auto">
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                Log expenses to view categorized spending distribution.
              </span>
              {onAddTransaction && (
                <button
                  type="button"
                  onClick={onAddTransaction}
                  className="btn-outline text-[11px] py-1 px-2.5 cursor-pointer"
                >
                  + Add Expense
                </button>
              )}
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
              <LineChart data={chartTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  tickFormatter={(val) => `${activeCurrencyInfo.symbol}${val >= 1000 ? (val / 1000).toFixed(0) + "k" : val}`}
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
                {hasForecast && (
                  <Line
                    type="monotone"
                    dataKey="projected"
                    name="Projected Expense"
                    stroke={COLORS.expense}
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    connectNulls={true}
                    dot={{
                      r: 4,
                      stroke: COLORS.expense,
                      strokeWidth: 1.5,
                      fill: "var(--surface)",
                    }}
                    activeDot={{
                      r: 5,
                      fill: COLORS.expense,
                      stroke: COLORS.surface2,
                      strokeWidth: 2,
                    }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon="charts"
              title="No trend data available"
              description="Monthly trajectory will display once you record income and expenses."
              actionLabel={onAddTransaction ? "+ Add Transaction" : undefined}
              onAction={onAddTransaction}
              compact={true}
              className="h-full justify-center"
            />
          )}
        </div>
      </div>
    </div>
  );
}
