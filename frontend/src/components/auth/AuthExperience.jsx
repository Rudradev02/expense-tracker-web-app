import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BrandPanel from "./BrandPanel";
import AuthForm from "./AuthForm";
import DarkModeToggle from "../DarkModeToggle";

export default function AuthExperience({ initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  // Keep internal state aligned if route changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Responsive breakpoint tracking (< 900px)
  useEffect(() => {
    const checkBreakpoint = () => {
      setIsMobile(window.innerWidth < 900);
    };
    checkBreakpoint();
    window.addEventListener("resize", checkBreakpoint);
    return () => window.removeEventListener("resize", checkBreakpoint);
  }, []);

  // Mode Switch with View Transitions API support where available
  const handleSwitchMode = (targetMode) => {
    if (targetMode === mode) return;

    const executeSwitch = () => {
      setMode(targetMode);
      // Synchronize URL route
      navigate(`/${targetMode}`, { replace: true });
    };

    if ("startViewTransition" in document) {
      document.startViewTransition(() => {
        executeSwitch();
      });
    } else {
      executeSwitch();
    }
  };

  const handleSuccessRedirect = (path) => {
    navigate(path, { replace: true });
  };

  const isRegister = mode === "register";

  return (
    <div
      className="relative w-screen h-screen min-h-screen overflow-hidden flex flex-col lg:flex-row"
      style={{
        backgroundColor: "var(--bg)",
        color: "var(--text)",
      }}
    >
      {/* Top Floating Dark Mode / Ambient Controls */}
      <div className="absolute top-5 right-5 z-40 flex items-center gap-3">
        <DarkModeToggle />
      </div>

      {/* Desktop Split-Screen Layout (>= 900px) */}
      {!isMobile ? (
        <div className="relative w-full h-full flex overflow-hidden">
          {/* Brand Showcase Panel (55% width) */}
          <div
            className="w-[55%] flex-shrink-0 h-full transition-transform duration-700 ease-[cubic-bezier(0.34,1.35,0.64,1)] will-change-transform z-10"
            style={{
              transform: isRegister ? "translateX(45vw)" : "translateX(0)",
            }}
          >
            <BrandPanel mode={mode} />
          </div>

          {/* Form Panel (45% width, fields on --bg) */}
          <div
            className="w-[45%] flex-shrink-0 h-full overflow-y-auto px-6 sm:px-12 flex items-center justify-center transition-transform duration-700 ease-[cubic-bezier(0.34,1.35,0.64,1)] will-change-transform z-20"
            style={{
              backgroundColor: "var(--bg)",
              transform: isRegister ? "translateX(-55vw)" : "translateX(0)",
            }}
          >
            <AuthForm
              mode={mode}
              onSwitchMode={handleSwitchMode}
              onSuccessRedirect={handleSuccessRedirect}
            />
          </div>
        </div>
      ) : (
        /* Mobile / Small Screen Layout (< 900px) */
        <div className="w-full h-full min-h-screen overflow-y-auto flex flex-col px-4 py-8">
          {/* Compact Animated Mobile Header */}
          <div className="w-full max-w-[400px] mx-auto mb-2 pt-4">
            <div
              className="p-4 rounded-2xl relative overflow-hidden mb-4"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              {/* Subtle ambient blur badge */}
              <div
                className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl pointer-events-none"
                style={{
                  background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 25%, transparent), transparent)",
                }}
              />
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

          {/* Form on Mobile */}
          <div className="flex-1 flex items-center justify-center">
            <AuthForm
              mode={mode}
              onSwitchMode={handleSwitchMode}
              onSuccessRedirect={handleSuccessRedirect}
            />
          </div>
        </div>
      )}
    </div>
  );
}
