import { useState, useEffect, useCallback } from "react";
import { getGoals, deleteGoal } from "../services/api";
import { useAppRefresh } from "../context/AppRefreshContext";
import { useCurrency } from "../context/CurrencyContext";
import GoalModal from "../components/GoalModal";
import ContributeModal from "../components/ContributeModal";
import EmptyState from "../components/EmptyState";

export default function GoalsPage() {
  const { refreshKeys, triggerRefresh } = useAppRefresh();
  const { formatCurrency } = useCurrency();
  const formatINR = formatCurrency;
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  const [contributeModalOpen, setContributeModalOpen] = useState(false);
  const [contributeGoal, setContributeGoal] = useState(null);

  const [deletingId, setDeletingId] = useState(null);

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getGoals();
      setGoals(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch goals:", err);
      setError("Unable to load savings goals. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals, refreshKeys.goals]);

  const handleDelete = async (id, name) => {
    const ok = window.confirm(`Are you sure you want to delete the goal "${name}"?`);
    if (!ok) return;

    setDeletingId(id);
    try {
      await deleteGoal(id);
      triggerRefresh("goals");
      triggerRefresh("dashboard");
      await fetchGoals();
    } catch (err) {
      console.error("Failed to delete goal:", err);
      alert("Failed to delete goal.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenCreate = () => {
    setSelectedGoal(null);
    setGoalModalOpen(true);
  };

  const handleOpenEdit = (goal) => {
    setSelectedGoal(goal);
    setGoalModalOpen(true);
  };

  const handleOpenContribute = (goal) => {
    setContributeGoal(goal);
    setContributeModalOpen(true);
  };

  // Metrics calculations
  const totalTarget = goals.reduce((sum, g) => sum + Number(g.target_amount || 0), 0);
  const totalSaved = goals.reduce((sum, g) => sum + Number(g.saved_amount || 0), 0);
  const overallPercentage = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
  const completedGoalsCount = goals.filter((g) => g.is_completed).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="section-label" style={{ color: "var(--text-muted)" }}>
            Wealth Horizon • Targets
          </span>
          <h2
            className="text-2xl font-bold tracking-tight m-0 mt-1"
            style={{ color: "var(--text)" }}
          >
            Savings Goals
          </h2>
          <p
            className="text-xs sm:text-sm mt-0.5 m-0"
            style={{ color: "var(--text-muted)" }}
          >
            Track milestones, calculate monthly savings velocity, and build your nest egg.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="btn-accent self-start sm:self-auto cursor-pointer flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Goal</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      {goals.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div
            className="p-4 rounded-xl"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <span className="text-[11px] block uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)" }}>
              Total Target
            </span>
            <span className="text-xl sm:text-2xl font-bold block mt-1 tabular-nums" style={{ color: "var(--text)" }}>
              {formatINR(totalTarget)}
            </span>
            <span className="text-[11px] block mt-0.5" style={{ color: "var(--text-muted)" }}>
              Across {goals.length} {goals.length === 1 ? "goal" : "goals"}
            </span>
          </div>

          <div
            className="p-4 rounded-xl"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <span className="text-[11px] block uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)" }}>
              Total Saved
            </span>
            <span className="text-xl sm:text-2xl font-bold block mt-1 tabular-nums" style={{ color: "var(--accent)" }}>
              {formatINR(totalSaved)}
            </span>
            <span className="text-[11px] block mt-0.5" style={{ color: "var(--text-muted)" }}>
              {formatINR(Math.max(0, totalTarget - totalSaved))} remaining
            </span>
          </div>

          <div
            className="p-4 rounded-xl"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <span className="text-[11px] block uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)" }}>
              Overall Progress
            </span>
            <span className="text-xl sm:text-2xl font-bold block mt-1 tabular-nums" style={{ color: "var(--text)" }}>
              {overallPercentage}%
            </span>
            <div className="w-full h-1 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, overallPercentage)}%`,
                  backgroundColor: "var(--accent)",
                }}
              />
            </div>
          </div>

          <div
            className="p-4 rounded-xl"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <span className="text-[11px] block uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)" }}>
              Goals Achieved
            </span>
            <span className="text-xl sm:text-2xl font-bold block mt-1 tabular-nums" style={{ color: completedGoalsCount > 0 ? "var(--income)" : "var(--text)" }}>
              {completedGoalsCount} of {goals.length}
            </span>
            <span className="text-[11px] block mt-0.5" style={{ color: "var(--text-muted)" }}>
              {goals.length - completedGoalsCount} active in progress
            </span>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          className="p-4 rounded-xl text-xs flex items-center justify-between"
          style={{
            backgroundColor: "rgba(224, 122, 107, 0.12)",
            border: "1px solid rgba(224, 122, 107, 0.3)",
            color: "var(--expense)",
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchGoals}
            className="btn-outline text-xs py-1 px-2.5 ml-2 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && goals.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-xl space-y-4 animate-pulse"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex justify-between items-start">
                <div className="h-5 w-32 rounded" style={{ backgroundColor: "var(--surface-2)" }} />
                <div className="h-5 w-14 rounded" style={{ backgroundColor: "var(--surface-2)" }} />
              </div>
              <div className="h-8 w-44 rounded" style={{ backgroundColor: "var(--surface-2)" }} />
              <div className="h-2 w-full rounded" style={{ backgroundColor: "var(--surface-2)" }} />
              <div className="h-6 w-28 rounded" style={{ backgroundColor: "var(--surface-2)" }} />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && goals.length === 0 && !error && (
        <div
          className="p-10 rounded-xl"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <EmptyState
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            title="No savings goals yet"
            description="Create your first financial target—whether it's an emergency fund, travel, or a down payment. We'll automatically calculate how much to save every month."
            actionLabel="Create Savings Goal"
            onAction={handleOpenCreate}
          />
        </div>
      )}

      {/* Goals Cards Grid */}
      {!loading && goals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const isCompleted = goal.is_completed;
            const percentage = Math.min(100, Number(goal.percentage || 0));
            const daysLeft = goal.days_left ?? 0;

            return (
              <div
                key={goal.id}
                className="p-5 rounded-xl flex flex-col justify-between transition-all duration-200"
                style={{
                  backgroundColor: "var(--surface)",
                  // Subtle accent highlight on completed goals (no confetti, quiet & classy)
                  border: isCompleted
                    ? "1px solid var(--accent)"
                    : "1px solid var(--border)",
                }}
              >
                <div>
                  {/* Top Header Row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <h3
                          className="font-semibold text-base tracking-tight truncate m-0"
                          style={{ color: "var(--text)" }}
                          title={goal.name}
                        >
                          {goal.name}
                        </h3>
                      </div>
                      <span className="text-[11px] block mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Target: {goal.target_date ? new Date(goal.target_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}
                      </span>
                    </div>

                    {/* Completion / Status Tag */}
                    <div>
                      {isCompleted ? (
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0"
                          style={{
                            backgroundColor: "rgba(212, 180, 131, 0.12)",
                            border: "1px solid var(--accent)",
                            color: "var(--accent)",
                          }}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          Goal Achieved
                        </span>
                      ) : (
                        <span
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full tabular-nums inline-block shrink-0"
                          style={{
                            backgroundColor: "var(--surface-2)",
                            border: "1px solid var(--border)",
                            color: "var(--text)",
                          }}
                        >
                          {percentage}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Primary Figures: "₹25,000 of ₹60,000" */}
                  <div className="my-3">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span
                        className="text-xl sm:text-2xl font-bold tracking-tight tabular-nums"
                        style={{ color: isCompleted ? "var(--accent)" : "var(--text)" }}
                      >
                        {formatINR(goal.saved_amount)}
                      </span>
                      <span className="text-xs sm:text-sm tabular-nums" style={{ color: "var(--text-muted)" }}>
                        of {formatINR(goal.target_amount)}
                      </span>
                    </div>

                    <span className="text-[11px] block mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {isCompleted
                        ? "Milestone 100% funded"
                        : `${formatINR(goal.remaining)} remaining to save`}
                    </span>
                  </div>

                  {/* Thin Linear Progress Bar */}
                  <div
                    className="w-full h-1.5 rounded-full my-3.5 overflow-hidden"
                    style={{ backgroundColor: "var(--surface-2)" }}
                    role="progressbar"
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: isCompleted ? "var(--income)" : "var(--accent)",
                      }}
                    />
                  </div>

                  {/* Days left and required monthly savings velocity */}
                  <div
                    className="p-2.5 rounded-lg my-3 space-y-1.5 text-xs"
                    style={{
                      backgroundColor: "var(--surface-2)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ color: "var(--text-muted)" }}>Timeline:</span>
                      <span className="font-medium tabular-nums" style={{ color: "var(--text)" }}>
                        {isCompleted
                          ? "Completed"
                          : daysLeft > 0
                          ? `${daysLeft} days left`
                          : daysLeft === 0
                          ? "Due today"
                          : `Past deadline (${Math.abs(daysLeft)}d ago)`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span style={{ color: "var(--text-muted)" }}>Required velocity:</span>
                      <span
                        className="font-semibold tabular-nums"
                        style={{
                          color: isCompleted
                            ? "var(--income)"
                            : daysLeft <= 0
                            ? "var(--expense)"
                            : "var(--accent)",
                        }}
                      >
                        {goal.monthly_saving_text || `Save ${formatCurrency(goal.required_monthly_saving)}/month`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div
                  className="flex items-center justify-between pt-3 mt-1 border-t"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(goal)}
                      className="text-xs p-1 px-2 rounded cursor-pointer transition-colors"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                      title="Edit Goal"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(goal.id, goal.name)}
                      disabled={deletingId === goal.id}
                      className="text-xs p-1 px-2 rounded cursor-pointer transition-colors"
                      style={{ color: "var(--expense)" }}
                      title="Delete Goal"
                    >
                      {deletingId === goal.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenContribute(goal)}
                    className="btn-accent text-xs py-1.5 px-3 cursor-pointer flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Contribute</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <GoalModal
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        initialGoal={selectedGoal}
        onSuccess={fetchGoals}
      />

      <ContributeModal
        isOpen={contributeModalOpen}
        onClose={() => setContributeModalOpen(false)}
        goal={contributeGoal}
        onSuccess={fetchGoals}
      />
    </div>
  );
}
