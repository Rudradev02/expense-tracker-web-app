import { useEffect, useState } from "react";
import { getSummary } from "../services/api";
import SummaryCard from "../components/SummaryCard";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getSummary();
      setSummary(response.data);
    } catch (err) {
      console.error("Error fetching summary data:", err);
      setError("Failed to fetch dashboard data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
  fetchDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="relative w-12 h-12">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-violet-100 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-500 font-medium animate-pulse">Loading dashboard summary...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4 shadow-sm">
        <div className="inline-flex p-3 bg-rose-100 text-rose-600 rounded-full">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-rose-900">Oops! Something went wrong</h3>
        <p className="text-sm text-rose-600">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-rose-600 text-white font-medium text-sm rounded-xl hover:bg-rose-700 transition shadow-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div className="text-left">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            An overview of your financial status.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 active:bg-violet-200 border border-violet-200/50 rounded-xl transition duration-200 shadow-sm self-start md:self-auto cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.253 8H18" />
          </svg>
          Refresh Data
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard
          title="Total Income"
          amount={summary?.income || 0}
          type="income"
        />
        <SummaryCard
          title="Total Expenses"
          amount={summary?.expense || 0}
          type="expense"
        />
        <SummaryCard
          title="Current Balance"
          amount={summary?.balance || 0}
          type="balance"
        />
      </div>
    </div>
  );
}
