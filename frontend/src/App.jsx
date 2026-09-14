import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import CategoriesPage from "./pages/CategoriesPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { CategoriesProvider } from "./context/CategoriesContext";
import { AppRefreshProvider } from "./context/AppRefreshContext";
import { DarkModeProvider } from "./context/DarkModeContext";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  return token ? children : <Navigate to="/login" replace />;
}

function ProtectedShell({ children }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
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
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedShell>
                  <Dashboard />
                </ProtectedShell>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedShell>
                  <Transactions />
                </ProtectedShell>
              }
            />
            <Route
              path="/categories"
              element={
                <ProtectedShell>
                  <CategoriesPage />
                </ProtectedShell>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </CategoriesProvider>
      </AppRefreshProvider>
    </DarkModeProvider>
  );
}

export default App;