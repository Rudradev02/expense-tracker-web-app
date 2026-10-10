import { useState, useEffect, useRef, useMemo } from "react";

const TAGLINES = [
  "Know where every rupee goes.",
  "Discreet analytics modeled after private banking.",
  "Master your personal cashflow in silence.",
  "Autonomous category tracking with absolute composure."
];

export default function BrandPanel({ mode = "login" }) {
  const containerRef = useRef(null);
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [displayBalance, setDisplayBalance] = useState(0);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // Check reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mq.matches);
    const listener = (e) => setIsReducedMotion(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  // Pause ambient animations on tab visibility change or offscreen
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabHidden(document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibility);

    let observer;
    if (containerRef.current && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) {
            setIsTabHidden(true);
          } else if (!document.hidden) {
            setIsTabHidden(false);
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(containerRef.current);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (observer) observer.disconnect();
    };
  }, []);

  // Smooth number counter to 70,000 on mount
  useEffect(() => {
    if (isReducedMotion) {
      setDisplayBalance(70000);
      return;
    }

    let startTime = null;
    const target = 70000;
    const duration = 1500; // ms

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out expo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayBalance(Math.floor(ease * target));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayBalance(target);
      }
    };

    const rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isReducedMotion]);

  // Rotating tagline every 4s
  useEffect(() => {
    if (isTabHidden) return;
    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % TAGLINES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isTabHidden]);

  // Mouse 3D tilt tracking (max 6deg)
  const handleMouseMove = (e) => {
    if (isReducedMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    // Smoothed max 6 deg
    const rotateY = Math.max(-6, Math.min(6, x * 12));
    const rotateX = Math.max(-6, Math.min(6, -y * 12));
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const isRegister = mode === "register";

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full h-full min-h-[560px] flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden select-none ${
        isTabHidden ? "animations-paused" : ""
      }`}
      style={{
        backgroundColor: "var(--surface)",
        borderRight: isRegister ? "none" : "1px solid var(--border)",
        borderLeft: isRegister ? "1px solid var(--border)" : "none",
        perspective: "1000px",
      }}
    >
      {/* Ambient Mesh: 3 Champagne Radial Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Blob 1 */}
        <div
          className="absolute ambient-blob-1 -top-24 -left-20 w-[420px] h-[420px] rounded-full blur-[90px]"
          style={{
            background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 18%, transparent) 0%, transparent 70%)",
          }}
        />
        {/* Blob 2 */}
        <div
          className="absolute ambient-blob-2 top-1/2 -right-24 w-[480px] h-[480px] rounded-full blur-[110px]"
          style={{
            background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 14%, transparent) 0%, transparent 75%)",
          }}
        />
        {/* Blob 3 */}
        <div
          className="absolute ambient-blob-3 -bottom-28 left-1/4 w-[360px] h-[360px] rounded-full blur-[80px]"
          style={{
            background: "radial-gradient(circle, color-mix(in srgb, var(--income) 12%, transparent) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Subtle Grid with Faded Edge Mask */}
      <div className="absolute inset-0 auth-grid-faded pointer-events-none" aria-hidden="true" />

      {/* Faint Film-Grain Noise Overlay */}
      <div className="absolute inset-0 auth-noise-overlay pointer-events-none" aria-hidden="true" />

      {/* Brand Header Badge */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm transition-transform duration-300 hover:scale-105"
            style={{
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--accent)",
            }}
          >
            ₹
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight leading-tight" style={{ color: "var(--text)" }}>
              Expense Tracker
            </span>
            <span className="text-[10px] tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>
              Obsidian &amp; Champagne
            </span>
          </div>
        </div>

        <div
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
          style={{
            backgroundColor: "var(--surface-2)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--income)" }} />
          <span>Encrypted Ledger</span>
        </div>
      </div>

      {/* Centerpiece: Floating 3D Tilt Product Preview Mockup */}
      <div className="relative z-10 my-auto py-8 flex flex-col items-center justify-center">
        <div
          className="w-full max-w-md auth-preview-floating transition-transform duration-200 ease-out"
          style={{
            transform: isReducedMotion
              ? "none"
              : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Mockup Card */}
          <div
            className="p-5 sm:p-6 rounded-2xl relative shadow-xl backdrop-blur-sm"
            style={{
              backgroundColor: "color-mix(in srgb, var(--surface-2) 90%, transparent)",
              border: "1px solid var(--border)",
            }}
          >
            {/* Top Mockup Row */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="section-label" style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                  Active Portfolio
                </span>
                <div
                  className="text-2xl sm:text-3xl font-normal font-serif tracking-tight mt-1 tabular-nums flex items-baseline gap-1"
                  style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}
                >
                  <span>₹</span>
                  <span>{displayBalance.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--income) 12%, transparent)",
                  color: "var(--income)",
                  border: "1px solid color-mix(in srgb, var(--income) 25%, transparent)",
                }}
              >
                <span>↑ 14.8%</span>
              </div>
            </div>

            {/* Sparkline Line Chart & Mini Donut Row */}
            <div className="grid grid-cols-3 gap-3 my-4 items-center">
              {/* SVG Sparkline that draws itself */}
              <div className="col-span-2 p-2.5 rounded-xl" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex justify-between items-center text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>
                  <span>Cashflow Trend</span>
                  <span style={{ color: "var(--income)" }}>Surplus</span>
                </div>
                <svg viewBox="0 0 160 48" className="w-full h-10 overflow-visible">
                  <defs>
                    <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 38 Q 30 40 50 24 T 100 20 T 135 10 T 160 4 L 160 48 L 0 48 Z"
                    fill="url(#sparkGradient)"
                  />
                  <path
                    d="M 0 38 Q 30 40 50 24 T 100 20 T 135 10 T 160 4"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="sparkline-path"
                  />
                  <circle cx="160" cy="4" r="3.5" fill="var(--accent)" />
                </svg>
              </div>

              {/* Mini Donut Chart */}
              <div className="p-2.5 rounded-xl flex flex-col items-center justify-center text-center" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="relative w-11 h-11 mb-1">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="var(--border)"
                      strokeWidth="3.2"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="3.2"
                      strokeDasharray="100, 100"
                      strokeDashoffset="28"
                      className="donut-segment"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold" style={{ color: "var(--text)" }}>
                    72%
                  </div>
                </div>
                <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                  Discipline
                </span>
              </div>
            </div>

            {/* Stat Chips */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div
                className="p-2.5 rounded-lg flex items-center justify-between"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  Burn Rate
                </span>
                <span className="font-semibold text-[11px]" style={{ color: "var(--text)" }}>
                  28.4%
                </span>
              </div>
              <div
                className="p-2.5 rounded-lg flex items-center justify-between"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  Runway
                </span>
                <span className="font-semibold text-[11px]" style={{ color: "var(--income)" }}>
                  18.2 mo
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Masked Headline and Subtitle Reveal */}
        <div className="mt-8 text-center max-w-md w-full px-2">
          <div className="overflow-hidden py-1">
            <h2
              key={`title-${mode}`}
              className="text-2xl sm:text-3xl font-normal font-serif tracking-tight m-0 animate-text-reveal"
              style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}
            >
              {isRegister ? "Build Your Sovereign Wealth Archive." : "Master Your Capital with Composure."}
            </h2>
          </div>

          <div className="overflow-hidden mt-2">
            <p
              key={`sub-${mode}`}
              className="text-xs sm:text-sm m-0 leading-relaxed animate-text-reveal"
              style={{ color: "var(--text-muted)" }}
            >
              {isRegister
                ? "Initiate discreet accounting, persistent taxonomy, and cashflow intelligence."
                : "Discreet tracking, category breakdowns, and analytics modeled after private banking."}
            </p>
          </div>
        </div>
      </div>

      {/* Rotating Tagline Crossfade Footer */}
      <div className="relative z-10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 overflow-hidden h-5">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "var(--accent)" }} />
          <span
            key={taglineIndex}
            className="animate-fade-in font-medium truncate"
            style={{ color: "var(--text-muted)" }}
          >
            {TAGLINES[taglineIndex]}
          </span>
        </div>

        <span className="text-[11px] shrink-0" style={{ color: "var(--text-muted)" }}>
          Private Vault • Edition 2.0
        </span>
      </div>
    </div>
  );
}
