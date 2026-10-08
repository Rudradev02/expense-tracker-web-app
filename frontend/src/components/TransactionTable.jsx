import { useState } from "react";
import { deleteTransaction } from "../services/api";
import { useAppRefresh } from "../context/AppRefreshContext";
import { useCurrency } from "../context/CurrencyContext";
import TransactionForm from "./TransactionForm";
import EmptyState from "./EmptyState";

export default function TransactionTable({
  transactions = [],
  refreshTransactions,
  sortBy = "date",
  sortOrder = "desc",
  onSort,
  isFiltered = false,
  onClearFilters,
  loading = false,
  onEdit,
  onDelete,
  onOpenAdd,
  onLoadSampleData,
}) {
  const { triggerRefresh } = useAppRefresh();
  const { formatCurrency, baseCurrency } = useCurrency();
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (t) => {
    if (onDelete) {
      onDelete(t);
      return;
    }

    setDeletingId(t.id);
    try {
      await deleteTransaction(t.id);
      if (refreshTransactions) refreshTransactions();
      triggerRefresh("transactions");
      triggerRefresh("dashboard");
    } catch (error) {
      console.error(error);
      alert("Failed to delete transaction");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (t) => {
    if (onEdit) {
      onEdit(t);
    } else {
      setEditingTransaction(t);
    }
  };

  const renderSortIndicator = (columnKey) => {
    const isSorted = sortBy === columnKey;
    if (!isSorted) {
      return (
        <span
          className="opacity-0 group-hover:opacity-40 transition-opacity ml-1.5 inline-block text-[10px]"
          aria-hidden="true"
        >
          ↕
        </span>
      );
    }
    return (
      <span
        className="ml-1.5 inline-block font-bold text-xs"
        style={{ color: "var(--accent)" }}
        aria-label={sortOrder === "asc" ? "sorted ascending" : "sorted descending"}
      >
        {sortOrder === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  const handleHeaderClick = (columnKey) => {
    if (onSort) {
      onSort(columnKey);
    }
  };

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Type</th>
              <th>Date</th>
              <th style={{ textAlign: "right" }}>Amount</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <td><div className="skeleton h-4 w-32 rounded"></div></td>
                <td><div className="skeleton h-4 w-20 rounded"></div></td>
                <td><div className="skeleton h-4 w-16 rounded"></div></td>
                <td><div className="skeleton h-4 w-24 rounded"></div></td>
                <td style={{ textAlign: "right" }}><div className="skeleton h-4 w-20 rounded ml-auto"></div></td>
                <td style={{ textAlign: "right" }}><div className="skeleton h-4 w-12 rounded ml-auto"></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (transactions.length === 0) {
    if (isFiltered) {
      return (
        <EmptyState
          icon="search"
          title="No transactions match your filters"
          description="Try broadening your search term, adjusting amount or date ranges, or resetting filters."
          actionLabel={onClearFilters ? "Clear all filters" : undefined}
          onAction={onClearFilters}
        />
      );
    }

    return (
      <EmptyState
        icon="transactions"
        title="No transactions recorded yet"
        description="Record a new transaction to begin tracking your financial activity, or load sample data to explore."
        actionLabel={onOpenAdd ? "+ Add Transaction" : undefined}
        onAction={onOpenAdd}
        secondaryActionLabel={onLoadSampleData ? "Load Sample Data" : undefined}
        onSecondaryAction={onLoadSampleData}
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th
                onClick={() => handleHeaderClick("title")}
                className={`sort-col-header group ${sortBy === "title" ? "is-sorted" : ""}`}
                title="Click to sort by Title"
              >
                <span>Title</span>
                {renderSortIndicator("title")}
              </th>

              <th
                onClick={() => handleHeaderClick("category")}
                className={`sort-col-header group ${sortBy === "category" ? "is-sorted" : ""}`}
                title="Click to sort by Category"
              >
                <span>Category</span>
                {renderSortIndicator("category")}
              </th>

              <th>
                <span>Type</span>
              </th>

              <th
                onClick={() => handleHeaderClick("date")}
                className={`sort-col-header group ${sortBy === "date" ? "is-sorted" : ""}`}
                title="Click to sort by Date"
              >
                <span>Date</span>
                {renderSortIndicator("date")}
              </th>

              <th
                onClick={() => handleHeaderClick("amount")}
                className={`sort-col-header group ${sortBy === "amount" ? "is-sorted" : ""}`}
                style={{ textAlign: "right" }}
                title="Click to sort by Amount"
              >
                <span>Amount</span>
                {renderSortIndicator("amount")}
              </th>

              <th style={{ textAlign: "right", minWidth: "90px" }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {transactions.map((t) => {
              const isIncome = t.type?.toLowerCase() === "income";
              return (
                <tr
                  key={t.id}
                  style={{ opacity: deletingId === t.id ? 0.4 : 1 }}
                >
                  <td className="font-medium" style={{ color: "var(--text)" }}>
                    <div className="flex items-center gap-1.5">
                      <span>{t.title}</span>
                      {t.is_recurring && (
                        <span
                          title="Recurring transaction"
                          aria-label="Recurring transaction"
                          className="inline-flex items-center text-[var(--accent)] opacity-85 shrink-0"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </td>


                  <td>
                    <span className="badge-neutral">
                      {t.category}
                    </span>
                  </td>

                  <td>
                    <span className={isIncome ? "badge-income" : "badge-expense"}>
                      {t.type}
                    </span>
                  </td>

                  <td className="tabular-nums text-xs" style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                    {new Date(t.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>

                  <td
                    className="tabular-nums font-semibold"
                    style={{
                      textAlign: "right",
                      color: isIncome ? "var(--income)" : "var(--expense)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <div>
                      <span>
                        {isIncome ? "+" : "-"}{formatCurrency(t.amount, baseCurrency)}
                      </span>
                      {t.currency && t.currency !== baseCurrency && (
                        <div
                          className="text-[10px] font-normal tracking-tight"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {formatCurrency(
                            t.original_amount !== undefined && t.original_amount !== null
                              ? t.original_amount
                              : t.amount,
                            t.currency
                          )}
                          {t.exchange_rate && Number(t.exchange_rate) !== 1 && (
                            <span className="ml-1 opacity-75">
                              (@ {Number(t.exchange_rate).toFixed(2)})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  <td style={{ textAlign: "right" }}>
                    <div className="table-row-actions">
                      <button
                        onClick={() => handleEdit(t)}
                        className="btn-icon"
                        title="Edit transaction"
                        aria-label={`Edit transaction ${t.title}`}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="btn-icon btn-icon-danger"
                        title="Delete transaction"
                        aria-label={`Delete transaction ${t.title}`}
                        disabled={deletingId === t.id}
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

      {editingTransaction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in"
          style={{ backgroundColor: "rgba(11, 11, 12, 0.75)" }}
          onClick={() => setEditingTransaction(null)}
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
              onClick={() => setEditingTransaction(null)}
              className="btn-icon absolute top-4 right-4"
              aria-label="Close modal"
            >
              ✕
            </button>
            <TransactionForm
              transaction={editingTransaction}
              onSuccess={() => {
                setEditingTransaction(null);
                if (refreshTransactions) refreshTransactions();
              }}
              onCancel={() => setEditingTransaction(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}
