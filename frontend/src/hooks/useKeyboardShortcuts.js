import { useEffect, useRef } from "react";

/**
 * Checks if the user is currently focused on an editable text control.
 */
function isTyping(event) {
  const target = event.target;
  if (!target) return false;

  const tag = target.tagName ? target.tagName.toUpperCase() : "";
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  return false;
}

/**
 * Global Keyboard Shortcuts Hook
 *
 * Supported shortcuts:
 * - N: Open new transaction modal
 * - /: Focus transaction search
 * - G then D / T / C: Navigate to Dashboard, Transactions, or Categories
 * - T: Toggle dark/light theme (when not in a G sequence)
 * - ?: Open shortcuts help modal
 *
 * Features:
 * - Safely ignored when typing in inputs/textareas
 * - Preserves browser defaults by checking modifier keys (Ctrl/Cmd/Alt)
 */
export function useKeyboardShortcuts({
  onOpenAddTransaction,
  onFocusSearch,
  onNavigate,
  onToggleTheme,
  onOpenShortcutsHelp,
  enabled = true,
}) {
  const pendingGRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // 1. Never intercept if typing in input, textarea, select, or contenteditable
      if (isTyping(e)) {
        return;
      }

      // 2. Never intercept if Ctrl, Meta, or Alt is held (preserves browser & screen-reader defaults)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const key = e.key;
      const lowerKey = key.toLowerCase();

      // 3. Shortcuts Help Modal: '?' (or Shift + '/')
      if (key === "?" || (e.shiftKey && key === "/")) {
        e.preventDefault();
        pendingGRef.current = false;
        if (timerRef.current) clearTimeout(timerRef.current);
        onOpenShortcutsHelp?.();
        return;
      }

      // 4. Handle second key of 'G' sequence (G then D, T, or C)
      if (pendingGRef.current) {
        pendingGRef.current = false;
        if (timerRef.current) clearTimeout(timerRef.current);

        if (lowerKey === "d") {
          e.preventDefault();
          onNavigate?.("/dashboard");
          return;
        }
        if (lowerKey === "t") {
          e.preventDefault();
          onNavigate?.("/transactions");
          return;
        }
        if (lowerKey === "c") {
          e.preventDefault();
          onNavigate?.("/categories");
          return;
        }
        // If another key was pressed, clear G sequence and continue evaluating
      }

      // 5. 'G' prefix for sequence
      if (lowerKey === "g") {
        pendingGRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          pendingGRef.current = false;
        }, 1200);
        return;
      }

      // 6. 'N' -> New Transaction
      if (lowerKey === "n") {
        e.preventDefault();
        onOpenAddTransaction?.();
        return;
      }

      // 7. '/' -> Focus Search
      if (key === "/") {
        e.preventDefault();
        onFocusSearch?.();
        return;
      }

      // 8. 'T' -> Toggle Theme
      if (lowerKey === "t") {
        e.preventDefault();
        onToggleTheme?.();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    enabled,
    onOpenAddTransaction,
    onFocusSearch,
    onNavigate,
    onToggleTheme,
    onOpenShortcutsHelp,
  ]);
}
