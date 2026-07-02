import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../services/api";
import { useDarkMode } from "../context/DarkModeContext";
import DarkModeToggle from "../components/DarkModeToggle";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { darkMode, toggleDarkMode } = useDarkMode();

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await registerUser(username, email, password);

      alert("Registration successful");
      navigate("/login");
    } catch (error) {
      console.error(error);
      alert("Registration failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen app-bg relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative w-full max-w-md p-8 mx-4">
        <div className="dashboard-card p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="section-label mb-2">Get Started</p>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Create Account
              </h1>
            </div>
            <DarkModeToggle darkMode={darkMode} onToggle={toggleDarkMode} className="ml-4" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="form-label">Username</label>
              <input
                id="username"
                className="input-field"
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="email" className="form-label">Email Address</label>
              <input
                id="email"
                className="input-field"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">Password</label>
              <input
                id="password"
                className="input-field"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <button
              className="btn-primary w-full py-3 text-base"
              type="submit"
            >
              Create Account
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600 dark:text-zinc-400">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer text */}
        <p className="mt-6 text-center text-xs text-slate-500 dark:text-zinc-500">
          Join thousands managing their finances with Expense Tracker
        </p>
      </div>
    </div>
  );
}