import { useDarkMode } from "../context/DarkModeContext";

export default function DarkModeToggle({ darkMode: propDarkMode, onToggle: propOnToggle, className = "" }) {
  const context = useDarkMode();
  const isDark = propDarkMode !== undefined ? propDarkMode : context.darkMode;
  const handleToggle = propOnToggle || context.toggleDarkMode;

  return (
    <button
      type="button"
      onClick={handleToggle}
      title="Toggle theme (T)"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative inline-flex h-8 w-14 items-center rounded-full border p-0.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 ${className}`}
      style={{
        backgroundColor: "var(--surface-2)",
        borderColor: "var(--border)",
      }}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-150 ${
          isDark ? "translate-x-6" : "translate-x-0"
        }`}
        style={{
          backgroundColor: isDark ? "var(--accent)" : "var(--surface)",
          color: isDark ? "var(--on-accent)" : "var(--text-muted)",
          border: isDark ? "none" : "1px solid var(--border)",
        }}
      >
        {isDark ? (
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </span>
    </button>
  );
}
