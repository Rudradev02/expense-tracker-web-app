import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BrandPanel from "../components/auth/BrandPanel";
import AuthForm from "../components/auth/AuthForm";
import DarkModeToggle from "../components/DarkModeToggle";

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize mode from URL path
  const getInitialMode = () =>
    window.location.pathname.toLowerCase().includes("register") ||
    location.pathname.toLowerCase().includes("register")
      ? "register"
      : "login";

  const [mode, setMode] = useState(getInitialMode);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Sync mode if location pathname changes externally (e.g. initial load or programmatic route)
  useEffect(() => {
    const currentMode = location.pathname.toLowerCase().includes("register") ? "register" : "login";
    if (currentMode !== mode) {
      setMode(currentMode);
    }
  }, [location.pathname]);

  // Handle browser back and forward button clicks via popstate
  useEffect(() => {
    const handlePopState = () => {
      const newMode = window.location.pathname.toLowerCase().includes("register") ? "register" : "login";
      setMode(newMode);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Smooth mode switch without page reload or unmounting
  const handleSwitchMode = useCallback(
    (targetMode) => {
      if (isTransitioning || targetMode === mode) return;

      setIsTransitioning(true);
      setMode(targetMode);

      // Update URL without triggering a component unmount/remount
      const newPath = `/${targetMode}`;
      window.history.pushState(null, "", newPath);

      // Transition completes in 650ms (matching CSS transition curve)
      setTimeout(() => {
        setIsTransitioning(false);
      }, 650);
    },
    [isTransitioning, mode]
  );

  const handleSuccessRedirect = (path) => {
    navigate(path, { replace: true });
  };

  return (
    <div
      className="auth-shell"
      data-mode={mode}
      data-transitioning={isTransitioning ? "true" : "false"}
    >
      {/* Top Floating Dark Mode Toggle */}
      <div className="absolute top-5 right-5 z-40 flex items-center gap-3">
        <DarkModeToggle />
      </div>

      {/* Persistent Brand Showcase Panel (55% width on desktop) */}
      <div className="auth-brand-column">
        <BrandPanel mode={mode} />
      </div>

      {/* Persistent Form Column (45% width on desktop) */}
      <div className="auth-form-column">
        {/* Compact Mobile Header (Visible under 900px only) */}
        <div className="block lg:hidden w-full max-w-[400px] mx-auto mb-2 pt-2 px-2">
          <div
            className="p-3.5 rounded-2xl relative overflow-hidden mb-2"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="relative z-10 flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
                style={{
                  backgroundColor: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--accent)",
                }}
              >
                ₹
              </div>
              <div>
                <div className="text-xs font-semibold tracking-tight" style={{ color: "var(--text)" }}>
                  Expense Tracker
                </div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  Private Financial Intelligence
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dual Form Host: Both Forms Remain Mounted */}
        <AuthForm
          mode={mode}
          onSwitchMode={handleSwitchMode}
          onSuccessRedirect={handleSuccessRedirect}
          isTransitioning={isTransitioning}
        />
      </div>
    </div>
  );
}
