import { useEffect, useState } from "react";
import { getTransactions } from "../services/api";
import TransactionTable from "../components/TransactionTable";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");

  const fetchTransactions = async () => {
    try {
      const response = await getTransactions(title, category);
      setTransactions(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [title, category]);

  return (
    <div className="max-w-7xl mx-auto p-6">

      <h1 className="text-3xl font-bold mb-6">
        Transactions
      </h1>

      <div className="flex gap-4 mb-6">

        <input
          type="text"
          placeholder="Search title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border rounded-lg p-3 bg-white text-black"
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border rounded-lg p-3 bg-white text-black"
        >
          <option value="">All Categories</option>
          <option value="Food">Food</option>
          <option value="Salary">Salary</option>
        </select>

      </div>

      <TransactionTable
        transactions={transactions}
        refreshTransactions={fetchTransactions}
      />

    </div>
  );
}