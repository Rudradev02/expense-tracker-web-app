import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import AddTransaction from "./pages/AddTransaction";

function App() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-gray-100 antialiased">
      <header className="border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💼</span>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Expense Tracker
            </span>
          </div>
        </div>
      </header>

      <main className="py-6 space-y-10">
        <Dashboard />
        <Transactions />
        <AddTransaction />
      </main>
    </div>
  );
}

export default App;