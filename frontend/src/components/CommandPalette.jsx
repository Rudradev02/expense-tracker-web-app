import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDarkMode } from "../context/DarkModeContext";
import { exportTransactions } from "../services/api";

// Lightweight, dependency-free fuzzy matching algorithm
function fuzzyScore(query, item) {
  if (!query) return 1;
  const q = query.toLowerCase().trim();
  const text = item.label.toLowerCase();
  const desc = (item.description || "").toLowerCase();
  const category = (item.category || "").toLowerCase();
  const keywords = (item.keywords || []).map((k) => k.toLowerCase());

  // Exact match
  if (text === q) return 100;
  // Label starts with query
  if (text.startsWith(q)) return 80;
  // Word in label starts with query
  if (text.split(/\s+/).some((w) => w.startsWith(q))) return 70;
  // Label contains query
  if (text.includes(q)) return 60;
  // Keyword exact or prefix match
  if (keywords.some((k) => k === q)) return 55;
  if (keywords.some((k) => k.startsWith(q))) return 50;
  if (keywords.some((k) => k.includes(q))) return 45;
  // Category match
  if (category.toLowerCase().includes(q)) return 40;
  // Description match
  if (desc.includes(q)) return 30;

  // Subsequence match in label
  let qIdx = 0;
  let matches = 0;
  for (let i = 0; i < text.length && qIdx < q.length; i++) {
    if (text[i] === q[qIdx]) {
      qIdx++;
      matches++;
    }
  }
  if (qIdx === q.length) {
    return 20 + matches;
  }

  // Subsequence match in keywords
  for (const kw of keywords) {
    let kwIdx = 0;
    for (let i = 0; i < kw.length && kwIdx < q.length; i++) {
      if (kw[i] === q[kwIdx]) kwIdx++;
    }
    if (kwIdx === q.length) return 15;
  }

  return 0;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onOpenAddTransaction,
  onOpenShortcutsHelp,
}) {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useDarkMode();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const previouslyFocusedElementRef = useRef(null);

  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  // CSV Export Handler
  const handleExportCSV = useCallback(async () => {
    if (isExporting) return;
    try {
      setIsExporting(true);
      setExportError(null);
      const res = await exportTransactions({ format: "csv" });
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `transactions_${timestamp}.csv`;
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      onClose();
    } catch (err) {
      console.error("Failed to export CSV from command palette:", err);
      setExportError("Failed to export transactions. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, onClose]);

  // Master commands configuration
  const commands = useMemo(
    () => [
      {
        id: "nav-dashboard",
        label: "Go to Dashboard",
        description: "Overview of balances, metrics, and trends",
        category: "Navigation",
        shortcut: "G D",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        ),
        keywords: ["home", "stats", "overview", "analytics", "dashboard", "main"],
        action: () => {
          onClose();
          navigate("/dashboard");
        },
      },
      {
        id: "nav-transactions",
        label: "Go to Transactions",
        description: "Search, filter, and view transaction history",
        category: "Navigation",
        shortcut: "G T",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        ),
        keywords: ["history", "list", "records", "expenses", "incomes", "ledger", "transactions"],
        action: () => {
          onClose();
          navigate("/transactions");
        },
      },
      {
        id: "nav-categories",
        label: "Go to Categories",
        description: "Manage and organize expense categories",
        category: "Navigation",
        shortcut: "G C",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        ),
        keywords: ["tags", "groups", "labels", "categories", "manage"],
        action: () => {
          onClose();
          navigate("/categories");
        },
      },
      {
        id: "nav-budgets",
        label: "Go to Budgets",
        description: "View and set monthly category spending limits",
        category: "Navigation",
        shortcut: "G B",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
        keywords: ["limits", "targets", "monthly", "budgets", "goals"],
        action: () => {
          onClose();
          navigate("/budgets");
        },
      },
      {
        id: "nav-recurring",
        label: "Go to Recurring",
        description: "Automate subscriptions, rent, and scheduled income",
        category: "Navigation",
        shortcut: "G R",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ),
        keywords: ["subscriptions", "rent", "salary", "rules", "recurring", "auto"],
        action: () => {
          onClose();
          navigate("/recurring");
        },
      },
      {
        id: "nav-goals",
        label: "Go to Savings Goals",
        description: "Track milestones, savings velocity, and financial targets",
        category: "Navigation",
        shortcut: "G S",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
        keywords: ["goals", "targets", "savings", "nest egg", "milestones"],
        action: () => {
          onClose();
          navigate("/goals");
        },
      },
      {
        id: "action-add-transaction",
        label: "Add transaction",
        description: "Log a new income or expense entry",
        category: "Actions",
        shortcut: "N",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ),
        keywords: ["new", "create", "income", "expense", "spend", "deposit", "add", "record"],
        action: () => {
          onClose();
          if (onOpenAddTransaction) {
            onOpenAddTransaction();
          }
        },
      },
      {
        id: "action-search-transactions",
        label: "Search transactions",
        description: "Focus transactions ledger filter",
        category: "Actions",
        shortcut: "/",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        ),
        keywords: ["find", "search", "filter", "query", "ledger", "transactions"],
        action: () => {
          onClose();
          navigate("/transactions?focusSearch=1");
        },
      },
      {
        id: "action-toggle-theme",
        label: `Toggle theme (${darkMode ? "Light mode" : "Dark mode"})`,
        description: `Switch current appearance to ${darkMode ? "Light" : "Dark"} theme`,
        category: "Actions",
        shortcut: "T",
        icon: darkMode ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        ),
        keywords: ["dark", "light", "appearance", "mode", "color", "theme", "toggle"],
        action: () => {
          toggleDarkMode();
          onClose();
        },
      },
      {
        id: "action-shortcuts-help",
        label: "Keyboard shortcuts",
        description: "View all available keyboard navigation & shortcut keys",
        category: "Help",
        shortcut: "?",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        ),
        keywords: ["shortcuts", "hotkeys", "keys", "help", "guide", "cheat", "sheet"],
        action: () => {
          onClose();
          if (onOpenShortcutsHelp) {
            onOpenShortcutsHelp();
          }
        },
      },
      {
        id: "action-export-csv",
        label: isExporting ? "Exporting CSV..." : "Export CSV",
        description: "Download all transactions as an Excel-compatible CSV file",
        category: "Actions",
        shortcut: "E",
        icon: isExporting ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        ),
        keywords: ["download", "report", "excel", "backup", "export", "csv", "data", "sheet"],
        action: handleExportCSV,
      },
      {
        id: "action-sign-out",
        label: "Sign out",
        description: "End session and lock application",
        category: "Actions",
        shortcut: "⇧Q",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        ),
        keywords: ["logout", "exit", "disconnect", "leave", "sign out", "lock"],
        action: () => {
          localStorage.removeItem("token");
          onClose();
          navigate("/login");
        },
      },
    ],
    [
      darkMode,
      isExporting,
      handleExportCSV,
      navigate,
      onClose,
      onOpenAddTransaction,
      onOpenShortcutsHelp,
      toggleDarkMode,
    ]
  );

  // Filter commands by query with fuzzy scoring
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    return commands
      .map((cmd) => ({ cmd, score: fuzzyScore(query, cmd) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ cmd }) => cmd);
  }, [commands, query]);

  // Reset index when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Focus trapping and setup on open/close
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement;
      setQuery("");
      setSelectedIndex(0);
      setExportError(null);

      // Lock body scroll
      document.body.style.overflow = "hidden";

      // Focus input after render
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 20);

      return () => {
        clearTimeout(timer);
      };
    } else {
      document.body.style.overflow = "";
      if (previouslyFocusedElementRef.current && previouslyFocusedElementRef.current.focus) {
        previouslyFocusedElementRef.current.focus();
      }
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (!isOpen || filteredCommands.length === 0) return;
    const selectedItem = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, isOpen, filteredCommands.length]);

  // Keyboard navigation & execution
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredCommands.length > 0 ? (prev + 1) % filteredCommands.length : 0));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredCommands.length > 0 ? (prev - 1 + filteredCommands.length) % filteredCommands.length : 0
        );
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        if (e.shiftKey) {
          setSelectedIndex((prev) =>
            filteredCommands.length > 0 ? (prev - 1 + filteredCommands.length) % filteredCommands.length : 0
          );
        } else {
          setSelectedIndex((prev) => (filteredCommands.length > 0 ? (prev + 1) % filteredCommands.length : 0));
        }
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands.length > 0 && filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      }
    },
    [filteredCommands, selectedIndex, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] sm:pt-[15vh] px-4 backdrop-blur-xs command-palette-backdrop"
      style={{ backgroundColor: "rgba(11, 11, 12, 0.75)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div
        className="w-full max-w-xl command-palette-modal flex flex-col overflow-hidden shadow-2xl"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          className="flex items-center gap-3 px-4 py-3.5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center" }} aria-hidden="true">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>

          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-haspopup="listbox"
            aria-controls="command-listbox"
            aria-autocomplete="list"
            aria-activedescendant={
              filteredCommands[selectedIndex] ? `command-item-${filteredCommands[selectedIndex].id}` : undefined
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="w-full bg-transparent text-sm focus:outline-none"
            style={{
              color: "var(--text)",
              fontFamily: "inherit",
            }}
          />

          <kbd
            className="px-1.5 py-0.5 text-[10px] font-mono rounded select-none shrink-0"
            style={{
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Error Feedback */}
        {exportError && (
          <div
            className="px-4 py-2 text-xs flex items-center justify-between"
            style={{
              backgroundColor: "rgba(224, 122, 107, 0.12)",
              borderBottom: "1px solid rgba(224, 122, 107, 0.25)",
              color: "var(--expense)",
            }}
          >
            <span>{exportError}</span>
            <button
              type="button"
              onClick={() => setExportError(null)}
              className="text-xs hover:opacity-80"
              style={{ color: "var(--expense)" }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Results List */}
        <div
          ref={listRef}
          id="command-listbox"
          role="listbox"
          aria-label="Commands"
          className="max-h-80 overflow-y-auto p-2 space-y-1 focus:outline-none"
          tabIndex={-1}
        >
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center" style={{ color: "var(--text-muted)" }}>
              <p className="text-xs font-medium" style={{ color: "var(--text)" }}>
                No commands found
              </p>
              <p className="text-[11px] mt-1">
                No matching results for &ldquo;{query}&rdquo;. Try searching for dashboard, add, theme, or export.
              </p>
            </div>
          ) : (
            filteredCommands.map((cmd, index) => {
              const isSelected = selectedIndex === index;
              return (
                <div
                  key={cmd.id}
                  id={`command-item-${cmd.id}`}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors duration-100"
                  style={{
                    backgroundColor: isSelected ? "var(--surface-2)" : "transparent",
                    borderLeft: isSelected ? "2px solid var(--accent)" : "2px solid transparent",
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: isSelected ? "var(--surface)" : "var(--surface-2)",
                        border: "1px solid var(--border)",
                        color: cmd.id === "action-sign-out" ? "var(--expense)" : "var(--accent)",
                      }}
                    >
                      {cmd.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span
                        className="text-xs font-medium truncate"
                        style={{
                          color: cmd.id === "action-sign-out" && isSelected ? "var(--expense)" : "var(--text)",
                        }}
                      >
                        {cmd.label}
                      </span>
                      {cmd.description && (
                        <span className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                          {cmd.description}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span
                      className="text-[10px] uppercase tracking-wider font-semibold hidden sm:inline"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {cmd.category}
                    </span>
                    {cmd.shortcut && (
                      <kbd
                        className="px-1.5 py-0.5 text-[10px] font-mono rounded tabular-nums"
                        style={{
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--border)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div
          className="px-4 py-2 flex items-center justify-between text-[11px]"
          style={{
            borderTop: "1px solid var(--border)",
            backgroundColor: "var(--surface-2)",
            color: "var(--text-muted)",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd
                className="px-1 py-0.5 text-[9px] font-mono rounded"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                ↑
              </kbd>
              <kbd
                className="px-1 py-0.5 text-[9px] font-mono rounded"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                ↓
              </kbd>
              <span className="ml-0.5">navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd
                className="px-1 py-0.5 text-[9px] font-mono rounded"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                ↵
              </kbd>
              <span className="ml-0.5">select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd
                className="px-1 py-0.5 text-[9px] font-mono rounded"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                esc
              </kbd>
              <span className="ml-0.5">close</span>
            </span>
          </div>

          <span className="hidden sm:inline font-medium">
            {isMac ? "⌘K" : "Ctrl+K"}
          </span>
        </div>
      </div>
    </div>
  );
}
