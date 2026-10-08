import { useState } from "react";
import { usePWAInstall } from "../pwa";

export default function InstallAppButton({ className = "", variant = "header" }) {
  const { canInstall, promptInstall } = usePWAInstall();
  const [installing, setInstalling] = useState(false);

  // Appears ONLY when the browser allows installation
  if (!canInstall) {
    return null;
  }

  const handleInstall = async () => {
    try {
      setInstalling(true);
      await promptInstall();
    } catch (err) {
      console.warn("Installation prompt note:", err);
    } finally {
      setInstalling(false);
    }
  };

  if (variant === "sidebar") {
    return (
      <button
        type="button"
        onClick={handleInstall}
        disabled={installing}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${className}`}
        style={{
          backgroundColor: "var(--surface-2)",
          border: "1px solid var(--border)",
          color: "var(--accent)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--accent)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
        }}
        title="Install Expense Tracker as local desktop/mobile app"
        aria-label="Install Expense Tracker app"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <span>Install app</span>
        </div>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: "var(--surface)",
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
          }}
        >
          PWA
        </span>
      </button>
    );
  }

  // Default header variant: unobtrusive, flat, quiet
  return (
    <button
      type="button"
      onClick={handleInstall}
      disabled={installing}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${className}`}
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        color: "var(--accent)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--surface-2)";
        e.currentTarget.style.borderColor = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--surface)";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
      title="Install Expense Tracker as standalone app"
      aria-label="Install Expense Tracker app"
    >
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      <span>Install app</span>
    </button>
  );
}
