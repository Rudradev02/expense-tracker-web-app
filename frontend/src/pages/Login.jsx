import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../services/api";
import { useDarkMode } from "../context/DarkModeContext";
import DarkModeToggle from "../components/DarkModeToggle";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { darkMode, toggleDarkMode } = useDarkMode();

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await loginUser(email, password);
      alert("Login successful");
      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      alert("Invalid email or password");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-zinc-900">
      <div className="w-full max-w-md p-8 bg-white/30 backdrop-blur-md rounded-xl shadow-lg dark:bg-zinc-800/30">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold dark:text-white">Login</h1>
          <DarkModeToggle darkMode={darkMode} onToggle={toggleDarkMode} />
        </div>
        <form onSubmit={handleSubmit}>
          <input
            className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            className="w-full p-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            type="submit"
          >
            Login
          </button>
        </form>
        <p className="mt-4 text-center dark:text-zinc-300">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}