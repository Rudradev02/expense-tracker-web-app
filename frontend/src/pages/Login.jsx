import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../services/api";
import DarkModeToggle from "../components/DarkModeToggle";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [coldStartNotice, setColdStartNotice] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setColdStartNotice(false);

    const timer = setTimeout(() => {
      setColdStartNotice(true);
    }, 4500);

    try {
      const res = await loginUser(email, password);
      const name = res.data?.username || email.split("@")[0];
      localStorage.setItem("username", name);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Invalid email/username or password";
      setError(msg);
    } finally {
      clearTimeout(timer);
      setSubmitting(false);
      setColdStartNotice(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row"
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
    >
      {/* Left Obsidian Branding Showcase Panel */}
      <div
        className="lg:w-1/2 p-8 lg:p-16 flex flex-col justify-between"
        style={{
          backgroundColor: "var(--surface)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <div>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
              style={{
                backgroundColor: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--accent)",
              }}
            >
              ₹
            </div>
            <span className="text-base font-semibold tracking-tight">Expense Tracker</span>
          </div>

          <div className="mt-16 sm:mt-24 space-y-5 max-w-lg">
            <span
              className="section-label"
              style={{ color: "var(--text-muted)" }}
            >
              Private Financial Intelligence
            </span>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-normal font-serif tracking-tight leading-tight m-0"
              style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}
            >
              Master Your Capital with Composure.
            </h1>
            <p className="text-sm sm:text-base leading-relaxed m-0" style={{ color: "var(--text-muted)" }}>
              Discreet tracking, category breakdowns, and cashflow intelligence modeled after private banking systems.
            </p>

            <div className="pt-6 space-y-3 text-xs sm:text-sm" style={{ color: "var(--text-muted)" }}>
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
                <span>Real-time balance and category disbursement analytics</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
                <span>Minimalist monthly trajectory and cashflow trends</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
                <span>Secure authenticated ledger with persistent taxonomy</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-12 text-xs" style={{ color: "var(--text-muted)" }}>
          Expense Tracker • Obsidian & Champagne Edition
        </div>
      </div>

      {/* Right Login Form Container */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="absolute top-6 right-6">
          <DarkModeToggle />
        </div>

        <div
          className="w-full max-w-md p-8 animate-slide-up"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
          }}
        >
          <div className="mb-6">
            <span className="section-label" style={{ color: "var(--text-muted)" }}>
              Access
            </span>
            <h2
              className="text-2xl font-normal font-serif tracking-tight m-0 mt-1"
              style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}
            >
              Sign In
            </h2>
            <p className="text-xs m-0 mt-1" style={{ color: "var(--text-muted)" }}>
              Enter your account credentials to access your dashboard
            </p>
          </div>

          {error && (
            <div
              className="mb-4 p-3 rounded-lg text-xs font-medium"
              style={{
                backgroundColor: "var(--surface-2)",
                border: "1px solid var(--expense)",
                color: "var(--expense)",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-accent w-full py-2.5 mt-2"
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>

            {coldStartNotice && submitting && (
              <div
                className="p-3 rounded-lg text-xs flex items-center gap-2 mt-2"
                style={{
                  backgroundColor: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-ping shrink-0"
                  style={{ backgroundColor: "var(--accent)" }}
                />
                <span>Waking up free Render server... Cold start may take up to 50 seconds.</span>
              </div>
            )}
          </form>

          <div className="mt-6 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="font-semibold no-underline"
              style={{ color: "var(--accent)" }}
            >
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}