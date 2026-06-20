import { useState } from "react";
import { addTransaction } from "../services/api";

export default function TransactionForm() {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("expense");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await addTransaction({
        title,
        amount: Number(amount),
        category,
        type,
      });

      alert("Transaction added successfully!");

      setTitle("");
      setAmount("");
      setCategory("");
      setType("expense");
    } catch (error) {
      console.error(error);
      alert("Failed to add transaction");
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white shadow rounded-xl p-6">
      <h2 className="text-2xl font-bold mb-6">Add Transaction</h2>

      <form onSubmit={handleSubmit} className="space-y-4">

        <input
          type="text"
          placeholder="Title"
          className="w-full border p-3 rounded-lg bg-white text-black"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <input
          type="number"
          placeholder="Amount"
          className="w-full border p-3 rounded-lg bg-white text-black"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="Category"
          className="w-full border p-3 rounded-lg bg-white text-black"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        />

        <select
          className="w-full border p-3 rounded-lg bg-white text-black"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>

        <button
          type="submit"
          className="w-full bg-violet-600 text-white py-3 rounded-lg hover:bg-violet-700"
        >
          Add Transaction
        </button>

      </form>
    </div>
  );
}