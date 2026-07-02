import { useNavigate } from "react-router-dom";
import DarkModeToggle from "./DarkModeToggle";
import { useDarkMode } from "../context/DarkModeContext";

export default function Navbar() {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useDarkMode();

  const username = localStorage.getItem("username") || "Member";
  const initials = username
    .split(/[-_.\s]/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "M";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/login");
  };

  return (
    <nav className="navbar relative z-20">
      <div className="navbar-logo">
        <span className="navbar-logo-icon">💰</span>
        Expense Tracker
      </div>

      <div className="navbar-actions">
        {/* User profile widget */}
        <div className="hidden sm:flex items-center gap-2.5 mr-2">
          <div className="avatar-ring">
            <div className="avatar-inner">{initials}</div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium">Logged in as</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200 capitalize">{username}</p>
          </div>
        </div>

        <DarkModeToggle darkMode={darkMode} onToggle={toggleDarkMode} />
        <button onClick={handleLogout} className="logout-btn" aria-label="Logout">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </nav>
  );
}
