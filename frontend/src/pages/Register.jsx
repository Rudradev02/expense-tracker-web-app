import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../services/api";
import DarkModeToggle from "../components/DarkModeToggle";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Password validation checks
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!hasMinLength || !hasLetter || !hasNumber) {
      setError("Password must be at least 8 characters long and contain both letters and numbers.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await registerUser(username, email, password);
      if (res.data?.token) {
        navigate("/dashboard");
      } else {
        navigate("/login");
      }
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Registration failed. Email or username might already be in use.";
      setError(msg);
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
                placeholder="e.g. Alex Vance"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="input-field"
                minLength={3}
                maxLength={50}
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
                placeholder="At least 8 characters (letters & numbers)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field"
              />
              <div className="flex items-center gap-3 mt-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                <span style={{ color: hasMinLength ? "var(--income)" : "var(--text-muted)" }}>
                  {hasMinLength ? "✓" : "○"} 8+ chars
                </span>
                <span style={{ color: hasLetter && hasNumber ? "var(--income)" : "var(--text-muted)" }}>
                  {hasLetter && hasNumber ? "✓" : "○"} letters & numbers
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="input-field"
              />
              {confirmPassword && (
                <div className="mt-1 text-[11px]" style={{ color: passwordsMatch ? "var(--income)" : "var(--expense)" }}>
                  {passwordsMatch ? "✓ Passwords match" : "✕ Passwords do not match"}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-accent w-full py-2.5 mt-2 cursor-pointer"
            >
              {submitting ? "Creating Workspace..." : "Create Account"}
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