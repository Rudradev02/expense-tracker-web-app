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
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#090E17] flex flex-col lg:flex-row">
      {/* Left Deep Navy Branding Showcase Panel */}
      <div className="lg:w-1/2 bg-[#0B1F3A] dark:bg-[#071325] text-white p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/30">
              ₹
            </div>
            <span className="text-xl font-extrabold tracking-tight">Expense Tracker</span>
          </div>

          <div className="mt-16 sm:mt-24 space-y-6 max-w-lg">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/20">
              Create Free Account
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Start Tracking Your Finances Today.
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Join thousands of users organizing transactions, tracking budgets, and visualizing spending patterns.
            </p>

            {/* Feature Bullets */}
            <div className="pt-6 space-y-3 text-xs sm:text-sm text-slate-300">
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">✓</span>
                <span>Fast setup — no credit card required</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">✓</span>
                <span>Custom category management & spend limits</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">✓</span>
                <span>End-to-end data isolation per user account</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-12 text-xs text-slate-400">
          © {new Date().getFullYear()} Expense Tracker. Production Fintech SaaS.
        </div>
      </div>

      {/* Right Register Form Container */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="absolute top-6 right-6">
          <DarkModeToggle />
        </div>

        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xl">
          <div className="mb-6">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Registration
            </span>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              Create your account
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Get started with full-stack expense tracking in seconds
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5 mt-2"
            >
              {submitting ? "Creating account..." : "Complete Registration"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500 dark:text-zinc-400">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}