import { useState } from "react";
import { deleteTransaction } from "../services/api";
import { useAppRefresh } from "../context/AppRefreshContext";
import EditTransactionModal from "./EditTransactionModal";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

export default function TransactionTable({ transactions, refreshTransactions }) {
  const { triggerRefresh } = useAppRefresh();
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this transaction?"
    );
    if (!confirmDelete) return;

    setDeletingId(id);
    try {
      await deleteTransaction(id);
      refreshTransactions();
      triggerRefresh('transactions');
      triggerRefresh('dashboard');
    } catch (error) {
      console.error(error);
      alert("Failed to delete transaction");
    } finally {
      setDeletingId(null);
    }
  };

  if (transactions.length === 0) {
    return (
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-sm font-semibold m-0" style={{ color: "var(--text)" }}>
          No transactions found
        </p>
        <p className="mt-1 text-xs max-w-xs m-0" style={{ color: "var(--text-muted)" }}>
          Record a new transaction or adjust active search filters.
        </p>
      </div>
    );
  }

  return (
    <>
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
            {transactions.map((t) => {
              const isIncome = t.type?.toLowerCase() === "income";
              return (
                <tr
                  key={t.id}
                  style={{ opacity: deletingId === t.id ? 0.4 : 1 }}
                >
                  <td className="font-medium" style={{ color: "var(--text)" }}>
                    {t.title}
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
                    {isIncome ? "+" : "-"}{formatCurrency(t.amount)}
                  </td>

                  <td style={{ textAlign: "right" }}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingTransaction(t)}
                        className="btn-icon"
                        title="Edit transaction"
                        aria-label="Edit transaction"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="btn-icon btn-icon-danger"
                        title="Delete transaction"
                        aria-label="Delete transaction"
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
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSaved={refreshTransactions}
        />
      )}
    </>
  );
}
