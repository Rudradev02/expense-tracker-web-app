import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import SidebarPanel from "./pages/SidebarPanel";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { CategoriesProvider } from "./context/CategoriesContext";
import { AppRefreshProvider } from "./context/AppRefreshContext";
import { DarkModeProvider } from "./context/DarkModeContext";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  return token ? children : <Navigate to="/login" />;
}

function Home() {
  return (
    <div className="app-bg min-h-screen text-slate-900 dark:text-zinc-100">
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Dashboard />

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Transactions />
          </div>

          <div className="lg:col-span-1">
            <SidebarPanel />
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <DarkModeProvider>
      <AppRefreshProvider>
        <CategoriesProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/register" element={<Register />} />

            <Route path="/" element={<Navigate to="/dashboard" />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
          </Routes>
        </CategoriesProvider>
      </AppRefreshProvider>
    </DarkModeProvider>
  );
}

export default App;