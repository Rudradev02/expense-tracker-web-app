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

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this transaction?"
    );
    if (!confirmDelete) return;

    try {
      await deleteTransaction(id);
      refreshTransactions();
      triggerRefresh('transactions');
      triggerRefresh('dashboard');
    } catch (error) {
      console.error(error);
      alert("Failed to delete transaction");
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-zinc-800">
          <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="font-medium text-slate-700 dark:text-zinc-300">No transactions found</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-500">
          Add a new transaction or adjust your filters
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-zinc-800 dark:bg-zinc-900/50">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {transactions.map((t) => (
              <tr
                key={t.id}
                className="transition-all duration-200 hover:bg-white hover:shadow-[0_0_15px_rgba(0,0,0,0.03)] dark:hover:bg-zinc-800/80 relative"
              >
                <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                  {t.title}
                </td>

                <td className={`px-6 py-4 font-semibold tabular-nums ${t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {t.type === "income" ? "+" : "−"}{formatCurrency(t.amount)}
                </td>

                <td className="px-6 py-4">
                  <span className="badge badge-category">{t.category}</span>
                </td>

                <td className="px-6 py-4">
                  <span className={`badge ${t.type === "income" ? "badge-income" : "badge-expense"}`}>
                    {t.type}
                  </span>
                </td>

                <td className="px-6 py-4 text-slate-500 tabular-nums dark:text-zinc-400">
                  {t.date}
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => setEditingTransaction(t)}
                      className="btn-icon btn-icon-edit"
                      title="Edit"
                      aria-label="Edit transaction"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="btn-icon btn-icon-delete"
                      title="Delete"
                      aria-label="Delete transaction"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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
