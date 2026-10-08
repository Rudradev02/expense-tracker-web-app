import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../services/api";
import DarkModeToggle from "../components/DarkModeToggle";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await registerUser(username, email, password);
      alert("Registration successful! Please sign in.");
      navigate("/login");
    } catch (err) {
      console.error(err);
      setError(err?.message || "Registration failed. Email or username might be taken.");
    } finally {
      setSubmitting(false);
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
              Account Enrollment
            </span>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-normal font-serif tracking-tight leading-tight m-0"
              style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}
            >
              Open Your Private Financial Workspace.
            </h1>
            <p className="text-sm sm:text-base leading-relaxed m-0" style={{ color: "var(--text-muted)" }}>
              Take full control of revenue, recurring disbursements, and category budgets with bespoke precision.
            </p>

            <div className="pt-6 space-y-3 text-xs sm:text-sm" style={{ color: "var(--text-muted)" }}>
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
                <span>Instant profile creation and encrypted authentication</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
                <span>Custom category structuring tailored to your flow</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
                <span>Responsive interface designed for desktop and mobile</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-12 text-xs" style={{ color: "var(--text-muted)" }}>
          Expense Tracker • Obsidian & Champagne Edition
        </div>
      </div>

      {/* Right Register Form Container */}
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
              Enrollment
            </span>
            <h2
              className="text-2xl font-normal font-serif tracking-tight m-0 mt-1"
              style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}
            >
              Create Account
            </h2>
            <p className="text-xs m-0 mt-1" style={{ color: "var(--text-muted)" }}>
              Enter your details to register a new account
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
              <label htmlFor="username" className="form-label">
                Full Name or Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="Rudra"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="input-field"
              />
            </div>

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
              {submitting ? "Registering..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold no-underline"
              style={{ color: "var(--accent)" }}
            >
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}