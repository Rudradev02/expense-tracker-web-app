import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  getRecurringRules,
  createRecurringRule,
  updateRecurringRule,
  toggleRecurringRule,
  deleteRecurringRule,
  processRecurringRules,
} from "../services/api";
import { useCategories } from "../context/CategoriesContext";
import { useAppRefresh } from "../context/AppRefreshContext";
import { useCurrency } from "../context/CurrencyContext";
import CategorySelect from "../components/CategorySelect";

export default function RecurringPage() {
  const { categories } = useCategories();
  const { triggerRefresh, refreshKeys } = useAppRefresh();
  const { formatCurrency, activeCurrencyInfo } = useCurrency();

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'active', 'paused'
  const [typeFilter, setTypeFilter] = useState("all"); // 'all', 'expense', 'income'

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formType, setFormType] = useState("expense");
  const [formCategory, setFormCategory] = useState("");
  const [formFrequency, setFormFrequency] = useState("monthly");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Feedback Toast
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getRecurringRules();
      setRules(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load recurring rules:", err);
      setError("Unable to load recurring schedules. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules, refreshKeys.recurring]);

  // Open modal for Add or Edit
  const handleOpenAddModal = () => {
    setEditingRule(null);
    setFormDescription("");
    setFormAmount("");
    setFormType("expense");
    setFormCategory(categories[0]?.name || "Bills");
    setFormFrequency("monthly");
    setFormStartDate(new Date().toISOString().slice(0, 10));
    setFormEndDate("");
    setFormActive(true);
    setFormError("");
    setShowModal(true);
  };

  const handleOpenEditModal = (rule) => {
    setEditingRule(rule);
    setFormDescription(rule.description || "");
    setFormAmount(rule.amount ?? "");
    setFormType(rule.type || "expense");
    setFormCategory(rule.category || "");
    setFormFrequency(rule.frequency || "monthly");
    setFormStartDate(rule.start_date ? rule.start_date.slice(0, 10) : "");
    setFormEndDate(rule.end_date ? rule.end_date.slice(0, 10) : "");
    setFormActive(Boolean(rule.active));
    setFormError("");
    setShowModal(true);
  };

  // Toggle active/paused
  const handleToggleActive = async (rule) => {
    try {
      // Optimistic update
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, active: !r.active } : r))
      );
      const res = await toggleRecurringRule(rule.id);
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? res.data : r))
      );
      triggerRefresh("transactions");
      triggerRefresh("dashboard");
      showToast(
        "success",
        `Recurring schedule ${res.data.active ? "activated" : "paused"}.`
      );
    } catch (err) {
      console.error("Failed to toggle rule status:", err);
      // Revert
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, active: rule.active } : r))
      );
      showToast("error", "Failed to update schedule status.");
    }
  };

  // Delete rule
  const handleDeleteRule = async (rule) => {
    if (!window.confirm(`Delete recurring schedule "${rule.description}"? Past transactions created by this rule will be kept.`)) {
      return;
    }
    try {
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
      await deleteRecurringRule(rule.id);
      triggerRefresh("recurring");
      showToast("success", "Recurring schedule deleted.");
    } catch (err) {
      console.error("Failed to delete rule:", err);
      fetchRules();
      showToast("error", "Failed to delete schedule.");
    }
  };

  // Process due rules manually
  const handleProcessDue = async () => {
    if (processing) return;
    try {
      setProcessing(true);
      const res = await processRecurringRules();
      const count = res.data?.created_count ?? 0;
      await fetchRules();
      triggerRefresh("transactions");
      triggerRefresh("dashboard");
      triggerRefresh("budgets");
      showToast(
        "success",
        count > 0
          ? `Processed successfully: ${count} transaction(s) generated.`
          : "All recurring schedules are currently up-to-date."
      );
    } catch (err) {
      console.error("Failed to process due recurring rules:", err);
      showToast("error", "Unable to trigger due processing.");
    } finally {
      setProcessing(false);
    }
  };

  // Form submit (create or update)
  const handleSaveRule = async (e) => {
    e.preventDefault();
    setFormError("");

    const desc = formDescription.trim();
    if (!desc) {
      setFormError("Description is required.");
      return;
    }
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError("Amount must be a valid positive number.");
      return;
    }
    if (!formCategory) {
      setFormError("Category is required.");
      return;
    }
    if (formStartDate && formEndDate && new Date(formStartDate) > new Date(formEndDate)) {
      setFormError("End date cannot be earlier than start date.");
      return;
    }

    try {
      setFormSubmitting(true);
      const payload = {
        description: desc,
        amount: amt,
        type: formType,
        category: formCategory,
        frequency: formFrequency,
        start_date: formStartDate || undefined,
        end_date: formEndDate || null,
        active: formActive,
      };

      if (editingRule) {
        await updateRecurringRule(editingRule.id, payload);
        showToast("success", "Recurring rule updated successfully.");
      } else {
        await createRecurringRule(payload);
        showToast("success", "Recurring rule established successfully.");
      }

      setShowModal(false);
      triggerRefresh("recurring");
      triggerRefresh("transactions");
      triggerRefresh("dashboard");
      triggerRefresh("budgets");
      fetchRules();
    } catch (err) {
      console.error("Failed to save rule:", err);
      setFormError(err.message || "Failed to save recurring rule.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Projected monthly statistics
  const stats = useMemo(() => {
    let monthlyExpense = 0;
    let monthlyIncome = 0;
    let activeCount = 0;

    rules.forEach((r) => {
      if (!r.active) return;
      activeCount += 1;
      const amt = Number(r.amount) || 0;
      let monthlyMultiplier = 1;
      if (r.frequency === "daily") monthlyMultiplier = 30;
      else if (r.frequency === "weekly") monthlyMultiplier = 4.33;
      else if (r.frequency === "monthly") monthlyMultiplier = 1;
      else if (r.frequency === "yearly") monthlyMultiplier = 1 / 12;

      const monthlyVal = amt * monthlyMultiplier;
      if (r.type?.toLowerCase() === "income") {
        monthlyIncome += monthlyVal;
      } else {
        monthlyExpense += monthlyVal;
      }
    });

    return {
      activeCount,
      monthlyExpense: Math.round(monthlyExpense),
      monthlyIncome: Math.round(monthlyIncome),
    };
  }, [rules]);

  // Filtered list
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (statusFilter === "active" && !r.active) return false;
      if (statusFilter === "paused" && r.active) return false;
      if (typeFilter !== "all" && r.type?.toLowerCase() !== typeFilter) return false;
      return true;
    });
  }, [rules, statusFilter, typeFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="section-label" style={{ color: "var(--text-muted)" }}>
            Automation
          </span>
          <div className="flex items-center gap-3 mt-1">
            <h2 className="text-2xl font-bold tracking-tight m-0" style={{ color: "var(--text)" }}>
              Recurring Transactions
            </h2>
            <div className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden text-xs">
              <Link
                to="/transactions"
                className="px-2.5 py-1 no-underline transition-colors hover:text-[var(--text)]"
                style={{ color: "var(--text-muted)" }}
              >
                Ledger
              </Link>
              <span
                className="px-2.5 py-1 font-semibold"
                style={{ backgroundColor: "var(--surface-2)", color: "var(--accent)" }}
              >
                Recurring Rules
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm mt-0.5 m-0" style={{ color: "var(--text-muted)" }}>
            Automate recurring disbursements, subscriptions, rents, and periodic revenue
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleProcessDue}
            disabled={processing || loading}
            className="btn-secondary flex items-center gap-2 py-2 px-3 text-xs"
            title="Check and generate any due recurring transactions"
          >
            {processing ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-[var(--text-muted)] border-t-[var(--accent)] rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            <span>{processing ? "Processing..." : "Process Due Now"}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="btn-accent"
            id="btn-add-recurring-rule"
          >
            <span className="text-base leading-none">+</span>
            <span>New Recurring Rule</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className="card p-4 flex flex-col justify-between"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
          }}
        >
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Active Recurring Rules
          </span>
          <div className="text-2xl font-bold tracking-tight mt-1" style={{ color: "var(--accent)" }}>
            {stats.activeCount} <span className="text-xs font-normal opacity-70">of {rules.length} total</span>
          </div>
        </div>

        <div
          className="card p-4 flex flex-col justify-between"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
          }}
        >
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Projected Monthly Outflow
          </span>
          <div className="text-2xl font-bold tracking-tight mt-1" style={{ color: "var(--expense)" }}>
            -{formatCurrency(stats.monthlyExpense)}
          </div>
        </div>

        <div
          className="card p-4 flex flex-col justify-between"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
          }}
        >
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Projected Monthly Inflow
          </span>
          <div className="text-2xl font-bold tracking-tight mt-1" style={{ color: "var(--income)" }}>
            +{formatCurrency(stats.monthlyIncome)}
          </div>
        </div>
      </div>

      {/* Rules Ledger Container */}
      <section
        className="card overflow-hidden"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
        }}
      >
        {/* Filter bar */}
        <div
          className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2">
            {/* Status Pills */}
            <div className="inline-flex rounded-lg overflow-hidden border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`filter-seg-btn ${statusFilter === "all" ? "active" : ""}`}
              >
                All Rules
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`filter-seg-btn ${statusFilter === "active" ? "active" : ""}`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("paused")}
                className={`filter-seg-btn ${statusFilter === "paused" ? "active" : ""}`}
              >
                Paused
              </button>
            </div>

            {/* Type Pills */}
            <div className="inline-flex rounded-lg overflow-hidden border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className={`filter-seg-btn ${typeFilter === "all" ? "active" : ""}`}
              >
                All Types
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("expense")}
                className={`filter-seg-btn ${typeFilter === "expense" ? "active" : ""}`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("income")}
                className={`filter-seg-btn ${typeFilter === "income" ? "active" : ""}`}
              >
                Income
              </button>
            </div>
          </div>

          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            Showing {filteredRules.length} of {rules.length} schedule(s)
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div
            className="m-4 p-3 rounded-lg flex items-center justify-between text-xs"
            style={{
              backgroundColor: "rgba(224, 122, 107, 0.12)",
              border: "1px solid rgba(224, 122, 107, 0.25)",
              color: "var(--expense)",
            }}
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchRules}
              className="btn-secondary py-1 px-2.5 text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[var(--text-muted)] border-t-[var(--accent)] rounded-full animate-spin mb-3" />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Loading recurring schedules...
            </span>
          </div>
        ) : filteredRules.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center animate-fade-in">
            <div
              className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
              style={{
                backgroundColor: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-sm font-semibold m-0" style={{ color: "var(--text)" }}>
              {rules.length === 0 ? "No recurring schedules defined" : "No rules match your filters"}
            </p>
            <p className="mt-1 text-xs max-w-sm m-0 mb-4" style={{ color: "var(--text-muted)" }}>
              {rules.length === 0
                ? "Set up recurring rules for rent, software subscriptions, insurance, or regular income so you never have to record them manually."
                : "Try resetting your status or type filters to view existing rules."}
            </p>
            {rules.length === 0 ? (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="btn-accent text-xs py-2 px-3.5"
              >
                + Create First Schedule
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setTypeFilter("all");
                }}
                className="btn-secondary text-xs py-2 px-3.5"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          /* Table of Recurring Rules */
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Frequency</th>
                  <th>Type</th>
                  <th>Next Run Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th style={{ textAlign: "right", minWidth: "120px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule) => {
                  const isIncome = rule.type?.toLowerCase() === "income";
                  const isNextRunToday =
                    rule.next_run_date &&
                    rule.next_run_date.slice(0, 10) === new Date().toISOString().slice(0, 10);

                  return (
                    <tr key={rule.id}>
                      <td className="font-medium" style={{ color: "var(--text)" }}>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="inline-flex items-center text-[var(--accent)] opacity-80 shrink-0"
                            title="Recurring Rule"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </span>
                          <span>{rule.description}</span>
                        </div>
                      </td>

                      <td>
                        <span className="badge-neutral">{rule.category}</span>
                      </td>

                      <td>
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded capitalize"
                          style={{
                            backgroundColor: "var(--surface-2)",
                            color: "var(--accent)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {rule.frequency}
                        </span>
                      </td>

                      <td>
                        <span className={isIncome ? "badge-income" : "badge-expense"}>
                          {rule.type}
                        </span>
                      </td>

                      <td className="text-xs tabular-nums">
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: "var(--text)" }}>
                            {rule.next_run_date
                              ? new Date(rule.next_run_date).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "-"}
                          </span>
                          {isNextRunToday && rule.active && (
                            <span
                              className="text-[10px] px-1.5 py-0.2 rounded font-medium"
                              style={{
                                backgroundColor: "rgba(212, 180, 131, 0.15)",
                                color: "var(--accent)",
                                border: "1px solid rgba(212, 180, 131, 0.3)",
                              }}
                            >
                              Due
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                        {rule.end_date
                          ? new Date(rule.end_date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "Indefinite"}
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(rule)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded cursor-pointer border-none transition-colors"
                          style={{
                            backgroundColor: rule.active
                              ? "rgba(95, 191, 154, 0.12)"
                              : "rgba(142, 139, 132, 0.12)",
                            color: rule.active ? "var(--income)" : "var(--text-muted)",
                          }}
                          title={`Click to ${rule.active ? "pause" : "activate"} schedule`}
                        >
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full"
                            style={{
                              backgroundColor: rule.active ? "var(--income)" : "var(--text-muted)",
                            }}
                          />
                          <span>{rule.active ? "Active" : "Paused"}</span>
                        </button>
                      </td>

                      <td
                        className="tabular-nums font-semibold"
                        style={{
                          textAlign: "right",
                          color: isIncome ? "var(--income)" : "var(--expense)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {isIncome ? "+" : "-"}{formatCurrency(rule.amount)}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div className="table-row-actions">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(rule)}
                            className="btn-icon"
                            title="Edit schedule"
                            aria-label={`Edit ${rule.description}`}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule)}
                            className="btn-icon btn-icon-danger"
                            title="Delete schedule"
                            aria-label={`Delete ${rule.description}`}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Create / Edit Recurring Rule Modal Overlay */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in"
          style={{ backgroundColor: "rgba(11, 11, 12, 0.75)" }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg p-6 relative animate-slide-up"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              className="btn-icon absolute top-4 right-4"
              aria-label="Close modal"
            >
              ✕
            </button>

            <div className="space-y-4">
              <div>
                <span className="section-label" style={{ color: "var(--text-muted)" }}>
                  {editingRule ? "Modify Schedule" : "Automate"}
                </span>
                <h3 className="text-base font-semibold tracking-tight m-0 mt-1" style={{ color: "var(--text)" }}>
                  {editingRule ? "Edit Recurring Rule" : "New Recurring Schedule"}
                </h3>
                <p className="text-xs m-0 mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Configure periodic automated ledger entries
                </p>
              </div>

              {formError && (
                <div
                  className="p-2.5 rounded-lg text-xs"
                  style={{
                    backgroundColor: "rgba(224, 122, 107, 0.12)",
                    border: "1px solid rgba(224, 122, 107, 0.25)",
                    color: "var(--expense)",
                  }}
                >
                  {formError}
                </div>
              )}

              <form onSubmit={handleSaveRule} className="space-y-3.5">
                <div>
                  <label htmlFor="recurring-form-desc" className="form-label">
                    Description
                  </label>
                  <input
                    id="recurring-form-desc"
                    type="text"
                    placeholder="e.g. Apartment Rent, Netflix, Salary..."
                    className="input-field"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="recurring-form-amount" className="form-label">
                      Amount ({activeCurrencyInfo?.symbol || "₹"})
                    </label>
                    <input
                      id="recurring-form-amount"
                      type="number"
                      placeholder="0"
                      min="0.01"
                      step="0.01"
                      className="input-field tabular-nums"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="recurring-form-type" className="form-label">
                      Type
                    </label>
                    <select
                      id="recurring-form-type"
                      className="input-field"
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="recurring-form-category" className="form-label">
                      Category
                    </label>
                    <CategorySelect
                      id="recurring-form-category"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="recurring-form-frequency" className="form-label">
                      Frequency
                    </label>
                    <select
                      id="recurring-form-frequency"
                      className="input-field"
                      value={formFrequency}
                      onChange={(e) => setFormFrequency(e.target.value)}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="recurring-form-start" className="form-label">
                      Start Date
                    </label>
                    <input
                      id="recurring-form-start"
                      type="date"
                      className="input-field"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="recurring-form-end" className="form-label">
                      End Date (Optional)
                    </label>
                    <input
                      id="recurring-form-end"
                      type="date"
                      className="input-field"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="accent-[var(--accent)] cursor-pointer"
                    />
                    <span style={{ color: "var(--text)" }}>Schedule is currently active</span>
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-outline flex-1 py-2"
                    disabled={formSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="btn-accent flex-1 py-2"
                  >
                    {formSubmitting
                      ? "Saving..."
                      : editingRule
                      ? "Update Rule"
                      : "Create Schedule"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Toast */}
      {toast && (
        <div
          className={`feedback-toast ${toast.type}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" ? (
              <span style={{ color: "var(--income)", fontWeight: "bold" }}>✓</span>
            ) : (
              <span style={{ color: "var(--expense)", fontWeight: "bold" }}>✕</span>
            )}
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="feedback-toast-close"
            aria-label="Dismiss toast"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
