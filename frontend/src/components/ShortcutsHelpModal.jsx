import { useEffect, useRef } from "react";

export default function ShortcutsHelpModal({ isOpen, onClose }) {
  const modalRef = useRef(null);
  const previouslyFocusedElementRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement;
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
        if (previouslyFocusedElementRef.current && previouslyFocusedElementRef.current.focus) {
          previouslyFocusedElementRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  const shortcutGroups = [
    {
      title: "Actions",
      shortcuts: [
        {
          keys: ["N"],
          description: "New transaction",
          detail: "Open the quick transaction entry form",
        },
        {
          keys: ["/"],
          description: "Focus search",
          detail: "Jump directly to the transactions search field",
        },
        {
          keys: ["T"],
          description: "Toggle theme",
          detail: "Switch between dark and light appearance",
        },
      ],
    },
    {
      title: "Navigation",
      shortcuts: [
        {
          keys: ["G", "then", "D"],
          isSequence: true,
          description: "Go to Dashboard",
          detail: "Overview of balances, metrics, and trends",
        },
        {
          keys: ["G", "then", "T"],
          isSequence: true,
          description: "Go to Transactions",
          detail: "View, filter, and audit transaction history",
        },
        {
          keys: ["G", "then", "C"],
          isSequence: true,
          description: "Go to Categories",
          detail: "Manage and organize expense categories",
        },
      ],
    },
    {
      title: "System & Navigation",
      shortcuts: [
        {
          keys: ["?"],
          description: "Keyboard shortcuts",
          detail: "Open this keyboard shortcuts reference modal",
        },
        {
          keys: [isMac ? "⌘" : "Ctrl", "K"],
          description: "Command palette",
          detail: "Search commands, navigate, and quick actions",
        },
        {
          keys: ["Esc"],
          description: "Close dialog / cancel",
          detail: "Dismiss active modal, palette, or dropdown",
        },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in"
      style={{ backgroundColor: "rgba(11, 11, 12, 0.75)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg overflow-hidden animate-slide-up"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center font-mono text-xs font-semibold"
              style={{
                backgroundColor: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--accent)",
              }}
            >
              ⌨
            </div>
            <div>
              <h2
                id="shortcuts-modal-title"
                className="text-sm font-semibold m-0 tracking-tight"
                style={{ color: "var(--text)" }}
              >
                Keyboard Shortcuts
              </h2>
              <p className="text-[11px] m-0" style={{ color: "var(--text-muted)" }}>
                Navigate and manage your finances swiftly
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-icon text-xs"
            aria-label="Close shortcuts modal"
            style={{ color: "var(--text-muted)" }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {shortcutGroups.map((group) => (
            <div key={group.title} className="space-y-2">
              <span
                className="text-[11px] font-semibold uppercase tracking-wider block"
                style={{ color: "var(--text-muted)" }}
              >
                {group.title}
              </span>

              <div
                className="rounded-lg divide-y"
                style={{
                  backgroundColor: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderColor: "var(--border)",
                }}
              >
                {group.shortcuts.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex flex-col pr-4 min-w-0">
                      <span className="font-medium truncate" style={{ color: "var(--text)" }}>
                        {item.description}
                      </span>
                      {item.detail && (
                        <span className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                          {item.detail}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, kIdx) => {
                        if (k === "then") {
                          return (
                            <span
                              key={kIdx}
                              className="text-[10px] px-1 font-mono"
                              style={{ color: "var(--text-muted)" }}
                            >
                              then
                            </span>
                          );
                        }
                        return (
                          <kbd
                            key={kIdx}
                            className="px-2 py-1 text-[11px] font-mono font-medium rounded select-none tabular-nums"
                            style={{
                              backgroundColor: "var(--surface)",
                              border: "1px solid var(--border)",
                              color: "var(--accent)",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                            }}
                          >
                            {k}
                          </kbd>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Quiet Note */}
          <div
            className="p-3 rounded-lg text-xs flex items-center gap-2"
            style={{
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            <span style={{ color: "var(--accent)" }}>ℹ</span>
            <span className="text-[11px]">
              Single-letter shortcuts are automatically ignored while typing in text inputs or textareas.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 flex items-center justify-between text-xs"
          style={{
            borderTop: "1px solid var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--text-muted)",
          }}
        >
          <span className="text-[11px]">Press <kbd className="font-mono text-[10px] px-1 rounded" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>Esc</kbd> anytime to close</span>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary py-1 px-3 text-xs"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
