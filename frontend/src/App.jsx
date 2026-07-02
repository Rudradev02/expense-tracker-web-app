import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import SidebarPanel from "./pages/SidebarPanel";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Navbar from "./components/Navbar";
import { CategoriesProvider } from "./context/CategoriesContext";
import { AppRefreshProvider } from "./context/AppRefreshContext";
import { DarkModeProvider } from "./context/DarkModeContext";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  return token ? children : <Navigate to="/login" />;
}

function Home() {
  return (
    <div className="app-bg min-h-screen text-slate-900 dark:text-zinc-100 relative overflow-hidden">
      {/* Decorative background glassmorphism blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-pink-500/8 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[40%] right-[15%] w-[35vw] h-[35vw] max-w-[400px] max-h-[400px] bg-purple-500/6 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10">
        <Navbar />
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
    </div>
  );
}

function App() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <DarkModeProvider>
      <AppRefreshProvider>
        <CategoriesProvider>
          <div className="relative min-h-screen">
            {/* Global Interactive Cursor Spotlight Background */}
            <div
              className="pointer-events-none fixed inset-0 z-0 opacity-40 dark:opacity-50 transition-opacity duration-300"
              style={{
                background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(99, 102, 241, 0.12), transparent 70%)`
              }}
            />
            <div className="relative z-10">
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
            </div>
          </div>
        </CategoriesProvider>
      </AppRefreshProvider>
    </DarkModeProvider>
  );
}

export default App;