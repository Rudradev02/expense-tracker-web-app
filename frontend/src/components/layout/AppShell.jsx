import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DarkModeToggle from "../DarkModeToggle";
import CommandPalette from "../CommandPalette";
import TransactionForm from "../TransactionForm";
import { useAppRefresh } from "../../context/AppRefreshContext";

export default function AppShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { triggerRefresh } = useAppRefresh();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Global shortcut: Ctrl+K or Cmd+K to toggle command palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const navItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      label: "Transactions",
      path: "/transactions",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      label: "Categories",
      path: "/categories",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
    {
      label: "Budgets",
      path: "/budgets",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: "Recurring",
      path: "/recurring",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
  ];


  const username = localStorage.getItem("username") || "Rudra";

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row"
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
    >
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          style={{ backgroundColor: "rgba(11, 11, 12, 0.7)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col justify-between transition-transform duration-200 ease-out lg:translate-x-0 lg:static ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          backgroundColor: "var(--bg)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <div>
          {/* Brand Header */}
          <div
            className="h-16 px-6 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <Link to="/dashboard" className="flex items-center gap-3 no-underline">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--accent)",
                }}
              >
                ₹
              </div>
              <div className="flex flex-col">
                <span
                  className="font-semibold text-sm tracking-tight"
                  style={{ color: "var(--text)" }}
                >
                  Expense Tracker
                </span>
              </div>
            </Link>

            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1 text-sm focus:outline-none"
              style={{ color: "var(--text-muted)" }}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <p
              className="px-3 pt-3 pb-2 text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Navigation
            </p>

            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors duration-150 no-underline"
                  style={{
                    backgroundColor: isActive ? "var(--surface-2)" : "transparent",
                    color: isActive ? "var(--text)" : "var(--text-muted)",
                    borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "var(--surface)";
                      e.currentTarget.style.color = "var(--text)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "var(--text-muted)";
                    }
                  }}
                >
                  <span style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer / User Logout */}
        <div
          className="p-4"
          style={{
            borderTop: "1px solid var(--border)",
            backgroundColor: "var(--bg)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{
                  backgroundColor: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              >
                {username.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium" style={{ color: "var(--text)" }}>
                  {username}
                </span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  Private Banking
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md transition-colors duration-150"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--expense)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
              title="Logout"
              aria-label="Logout button"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        {/* Top Header */}
        <header
          className="h-16 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30"
          style={{
            backgroundColor: "var(--bg)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-md transition-colors"
              style={{ color: "var(--text-muted)", backgroundColor: "var(--surface-2)" }}
              aria-label="Open navigation menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <span
              className="text-xs uppercase tracking-wider font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              {location.pathname.replace("/", "") || "Dashboard"}
            </span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Command Palette Trigger */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-normal transition-colors cursor-pointer"
              style={{
                backgroundColor: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
              title="Search or run a command (Ctrl+K)"
              aria-label="Open command palette"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden md:inline">Commands</span>
              <kbd
                className="px-1.5 py-0.5 text-[10px] font-mono rounded select-none tabular-nums"
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                {typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl+K"}
              </kbd>
            </button>

            <DarkModeToggle />

            <div
              className="hidden sm:flex items-center gap-2 pl-3"
              style={{ borderLeft: "1px solid var(--border)" }}
            >
              <button
                onClick={handleLogout}
                className="text-xs font-medium transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--expense)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Content Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-14 flex items-center justify-around px-4"
        style={{
          backgroundColor: "var(--surface)",
          borderTop: "1px solid var(--border)",
        }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center py-1 px-3 text-[10px] font-medium transition-colors no-underline"
              style={{
                color: isActive ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              <span className="mb-0.5">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
