import { deleteTransaction } from "../services/api";

export default function TransactionTable({ transactions, refreshTransactions }) {
  if (transactions.length === 0) {
    return (
      <div className="text-center text-gray-500 mt-6">
        No transactions found.
      </div>
    );
  }

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this transaction?"
    );

    if (!confirmDelete) return;

    try {
      await deleteTransaction(id);
      refreshTransactions();
    } catch (error) {
      console.error(error);
      alert("Failed to delete transaction");
    }
  };

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow">
      <table className="w-full">
        <thead className="bg-violet-600 text-white">
          <tr>
            <th className="p-3">Title</th>
            <th className="p-3">Amount</th>
            <th className="p-3">Category</th>
            <th className="p-3">Type</th>
            <th className="p-3">Date</th>
            <th className="p-3">Action</th>
          </tr>
        </thead>

        <tbody className="text-gray-900">
          {transactions.map((t) => (
            <tr key={t.id} className="border-b hover:bg-gray-50">
              <td className="p-3">{t.title}</td>

              <td
                className={`p-3 font-semibold ${
                  t.type === "income"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                ₹{t.amount}
              </td>

              <td className="p-3">{t.category}</td>

              <td className="p-3 capitalize">{t.type}</td>

              <td className="p-3">{t.date}</td>

              <td className="p-3">
                <button
                  onClick={() => handleDelete(t.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}