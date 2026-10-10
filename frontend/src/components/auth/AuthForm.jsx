import { useState, useRef, useEffect } from "react";
import { loginUser, registerUser } from "../../services/api";

export default function AuthForm({
  mode = "login",
  onSwitchMode,
  onSuccessRedirect,
  isTransitioning = false,
}) {
  // Login Form State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPassword, setLoginShowPassword] = useState(false);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginShake, setLoginShake] = useState(false);
  const [loginColdStart, setLoginColdStart] = useState(false);

  // Register Form State
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState("");
  const [regShake, setRegShake] = useState(false);
  const [regColdStart, setRegColdStart] = useState(false);

  // Mouse Spotlight & Magnetic Buttons
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [loginBtnMagnet, setLoginBtnMagnet] = useState({ x: 0, y: 0 });
  const [regBtnMagnet, setRegBtnMagnet] = useState({ x: 0, y: 0 });
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const containerRef = useRef(null);
  const loginBtnRef = useRef(null);
  const regBtnRef = useRef(null);
  const loginEmailInputRef = useRef(null);
  const regUsernameInputRef = useRef(null);

  // Reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mq.matches);
    const listener = (e) => setIsReducedMotion(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  // Autofocus first input of active form on mode change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mode === "login" && loginEmailInputRef.current) {
        loginEmailInputRef.current.focus();
      } else if (mode === "register" && regUsernameInputRef.current) {
        regUsernameInputRef.current.focus();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [mode]);

  // Spotlight mouse tracking
  const handleMouseMove = (e) => {
    if (isReducedMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: -1000, y: -1000 });
  };

  // Magnetic hover for login button
  const handleLoginBtnMouseMove = (e) => {
    if (isReducedMotion || !loginBtnRef.current || loginSubmitting || loginSuccess) return;
    const rect = loginBtnRef.current.getBoundingClientRect();
    const deltaX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const deltaY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    setLoginBtnMagnet({
      x: Math.max(-4, Math.min(4, deltaX * 4)),
      y: Math.max(-4, Math.min(4, deltaY * 4)),
    });
  };

  // Magnetic hover for register button
  const handleRegBtnMouseMove = (e) => {
    if (isReducedMotion || !regBtnRef.current || regSubmitting || regSuccess) return;
    const rect = regBtnRef.current.getBoundingClientRect();
    const deltaX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const deltaY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    setRegBtnMagnet({
      x: Math.max(-4, Math.min(4, deltaX * 4)),
      y: Math.max(-4, Math.min(4, deltaY * 4)),
    });
  };

  // Password strength calculation for registration
  const regPasswordStrength = (() => {
    if (!regPassword) return { score: 0, label: "" };
    let score = 0;
    if (regPassword.length >= 8) score += 1;
    if (/[a-zA-Z]/.test(regPassword)) score += 1;
    if (/[0-9]/.test(regPassword)) score += 1;
    if (/[^a-zA-Z0-9]/.test(regPassword) && regPassword.length >= 10) score += 1;

    let label = "Weak";
    let color = "var(--expense)";
    if (score === 2) {
      label = "Fair";
      color = "var(--warning)";
    } else if (score === 3) {
      label = "Good";
      color = "var(--accent)";
    } else if (score >= 4) {
      label = "Strong";
      color = "var(--income)";
    }
    return { score, label, color };
  })();

  const regPasswordsMatch = !regPassword || !regConfirmPassword || regPassword === regConfirmPassword;

  // Handle Login Submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (loginSubmitting || loginSuccess || isTransitioning) return;

    setLoginError("");
    setLoginShake(false);
    setLoginColdStart(false);
    setLoginSubmitting(true);

    const coldTimer = setTimeout(() => {
      setLoginColdStart(true);
    }, 4500);

    try {
      const res = await loginUser(loginEmail, loginPassword);
      clearTimeout(coldTimer);
      const name = res.data?.username || loginEmail.split("@")[0];
      localStorage.setItem("username", name);
      setLoginSuccess(true);
      setTimeout(() => {
        onSuccessRedirect("/dashboard");
      }, 700);
    } catch (err) {
      clearTimeout(coldTimer);
      console.error(err);
      const msg = err?.response?.data?.message || err?.message || "Invalid email or password";
      setLoginError(msg);
      setLoginShake(true);
      setTimeout(() => setLoginShake(false), 300);
    } finally {
      clearTimeout(coldTimer);
      setLoginSubmitting(false);
      setLoginColdStart(false);
    }
  };

  // Handle Register Submission
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (regSubmitting || regSuccess || isTransitioning) return;

    setRegError("");
    setRegShake(false);
    setRegColdStart(false);

    if (regPassword.length < 8 || !/[a-zA-Z]/.test(regPassword) || !/[0-9]/.test(regPassword)) {
      setRegError("Password must be at least 8 characters long and contain both letters and numbers.");
      setRegShake(true);
      setTimeout(() => setRegShake(false), 300);
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError("Passwords do not match. Please re-enter.");
      setRegShake(true);
      setTimeout(() => setRegShake(false), 300);
      return;
    }

    setRegSubmitting(true);

    const coldTimer = setTimeout(() => {
      setRegColdStart(true);
    }, 4500);

    try {
      const res = await registerUser(regUsername, regEmail, regPassword);
      clearTimeout(coldTimer);
      setRegSuccess(true);
      setTimeout(() => {
        onSuccessRedirect(res.data?.token ? "/dashboard" : "/login");
      }, 700);
    } catch (err) {
      clearTimeout(coldTimer);
      console.error(err);
      const msg = err?.response?.data?.message || err?.message || "Registration failed. Username or email may already exist.";
      setRegError(msg);
      setRegShake(true);
      setTimeout(() => setRegShake(false), 300);
    } finally {
      clearTimeout(coldTimer);
      setRegSubmitting(false);
      setRegColdStart(false);
    }
  };

  const isLoginActive = mode === "login";
  const isRegisterActive = mode === "register";

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-[400px] mx-auto py-8 px-2 flex flex-col justify-center"
      style={{ color: "var(--text)" }}
    >
      {/* Subtle Cursor Spotlight */}
      {!isReducedMotion && mousePos.x >= 0 && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(380px circle at ${mousePos.x}px ${mousePos.y}px, color-mix(in srgb, var(--accent) 5%, transparent), transparent 75%)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* 3D Flip Card Viewport */}
      <div className="auth-flip-viewport">
        <div className="auth-flip-card" data-mode={mode}>
          {/* ─────────────────────────────────────────────────────────────
             FRONT FACE: LOGIN FORM
             ───────────────────────────────────────────────────────────── */}
          <div
            className="auth-card-face auth-card-front"
            inert={!isLoginActive ? "" : undefined}
            aria-hidden={!isLoginActive}
          >
          {/* Header */}
          <div className="auth-stagger-item mb-6">
            <span className="section-label" style={{ color: "var(--text-muted)", fontSize: "11px" }}>
              Authentication
            </span>
            <h1
              className="text-2xl sm:text-3xl font-normal font-serif tracking-tight m-0 mt-1"
              style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}
            >
              Sign In
            </h1>
            <p className="text-xs sm:text-sm m-0 mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Enter your account credentials to access your intelligence dashboard.
            </p>
          </div>

          {/* Login Error Banner */}
          <div
            aria-live="assertive"
            className={`overflow-hidden transition-all duration-200 ${
              loginError ? "max-h-24 opacity-100 mb-4" : "max-h-0 opacity-0 mb-0"
            }`}
          >
            <div
              className="p-3 rounded-lg text-xs font-medium flex items-start gap-2"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--expense)",
                color: "var(--expense)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: "var(--expense)" }} />
              <span className="flex-1">{loginError}</span>
            </div>
          </div>

          {/* Login Form */}
          <form
            onSubmit={handleLoginSubmit}
            className={`space-y-4 ${loginShake ? "animate-field-shake" : ""}`}
            noValidate
          >
            {/* Email Field */}
            <div className="auth-stagger-item floating-field-container">
              <input
                ref={loginEmailInputRef}
                id="login-email-input"
                type="email"
                required
                placeholder=" "
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="floating-field-input"
                autoComplete="email"
                tabIndex={isLoginActive ? 0 : -1}
              />
              <label htmlFor="login-email-input" className="floating-field-label">
                Email Address
              </label>
            </div>

            {/* Password Field */}
            <div className="auth-stagger-item floating-field-container">
              <input
                id="login-password-input"
                type={loginShowPassword ? "text" : "password"}
                required
                placeholder=" "
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="floating-field-input pr-12"
                autoComplete="current-password"
                tabIndex={isLoginActive ? 0 : -1}
              />
              <label htmlFor="login-password-input" className="floating-field-label">
                Password
              </label>
              <button
                type="button"
                onClick={() => setLoginShowPassword((p) => !p)}
                aria-label={loginShowPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md cursor-pointer transition-colors"
                style={{ color: "var(--text-muted)" }}
                tabIndex={isLoginActive ? 0 : -1}
              >
                {loginShowPassword ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            {/* Single Login Submit Button */}
            <div className="auth-stagger-item pt-2">
              <button
                ref={loginBtnRef}
                type="submit"
                disabled={loginSubmitting || loginSuccess || isTransitioning}
                onMouseMove={handleLoginBtnMouseMove}
                onMouseLeave={() => setLoginBtnMagnet({ x: 0, y: 0 })}
                className="btn-accent btn-sheen-sweep w-full py-3 px-4 font-semibold text-xs tracking-wide rounded-xl relative flex items-center justify-center gap-2 cursor-pointer transition-transform duration-150 active:scale-[0.98]"
                style={{
                  transform: isReducedMotion
                    ? "none"
                    : `translate(${loginBtnMagnet.x}px, ${loginBtnMagnet.y}px)`,
                }}
                tabIndex={isLoginActive ? 0 : -1}
              >
                {loginSuccess ? (
                  <span className="flex items-center gap-2 animate-fade-in">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" className="checkmark-path" />
                    </svg>
                    <span>Signed In</span>
                  </span>
                ) : loginSubmitting ? (
                  <span className="flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    <span>Signing in...</span>
                  </span>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>

            {/* Login Cold Start Notice */}
            {loginColdStart && loginSubmitting && (
              <div
                className="p-3 rounded-lg text-xs flex items-center gap-2 animate-fade-in mt-3"
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                <span className="w-2 h-2 rounded-full animate-ping shrink-0" style={{ backgroundColor: "var(--accent)" }} />
                <span>Waking up free Render backend... This can take up to 50 seconds on cold start.</span>
              </div>
            )}
          </form>

          {/* Switch to Register Link */}
          <div className="auth-stagger-item mt-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            <span>Don&apos;t have an account? </span>
            <button
              type="button"
              disabled={isTransitioning}
              onClick={() => onSwitchMode("register")}
              className="font-semibold underline underline-offset-4 cursor-pointer hover:opacity-85 transition-opacity"
              style={{ color: "var(--accent)", background: "transparent", border: "none", padding: 0 }}
              tabIndex={isLoginActive ? 0 : -1}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
           BACK FACE: REGISTER FORM
           ───────────────────────────────────────────────────────────── */}
        <div
          className="auth-card-face auth-card-back"
          inert={!isRegisterActive ? "" : undefined}
          aria-hidden={!isRegisterActive}
        >
          {/* Header */}
          <div className="auth-stagger-item mb-6">
            <span className="section-label" style={{ color: "var(--text-muted)", fontSize: "11px" }}>
              Registration
            </span>
            <h1
              className="text-2xl sm:text-3xl font-normal font-serif tracking-tight m-0 mt-1"
              style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}
            >
              Create Account
            </h1>
            <p className="text-xs sm:text-sm m-0 mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Enter your credentials to create your personal financial account.
            </p>
          </div>

          {/* Register Error Banner */}
          <div
            aria-live="assertive"
            className={`overflow-hidden transition-all duration-200 ${
              regError ? "max-h-24 opacity-100 mb-4" : "max-h-0 opacity-0 mb-0"
            }`}
          >
            <div
              className="p-3 rounded-lg text-xs font-medium flex items-start gap-2"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--expense)",
                color: "var(--expense)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: "var(--expense)" }} />
              <span className="flex-1">{regError}</span>
            </div>
          </div>

          {/* Register Form */}
          <form
            onSubmit={handleRegisterSubmit}
            className={`space-y-4 ${regShake ? "animate-field-shake" : ""}`}
            noValidate
          >
            {/* Username Field */}
            <div className="auth-stagger-item floating-field-container">
              <input
                ref={regUsernameInputRef}
                id="reg-username-input"
                type="text"
                required
                placeholder=" "
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                className="floating-field-input"
                autoComplete="username"
                tabIndex={isRegisterActive ? 0 : -1}
              />
              <label htmlFor="reg-username-input" className="floating-field-label">
                Legal Username
              </label>
            </div>

            {/* Email Field */}
            <div className="auth-stagger-item floating-field-container">
              <input
                id="reg-email-input"
                type="email"
                required
                placeholder=" "
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="floating-field-input"
                autoComplete="email"
                tabIndex={isRegisterActive ? 0 : -1}
              />
              <label htmlFor="reg-email-input" className="floating-field-label">
                Email Address
              </label>
            </div>

            {/* Password Field */}
            <div className="auth-stagger-item floating-field-container">
              <input
                id="reg-password-input"
                type={regShowPassword ? "text" : "password"}
                required
                placeholder=" "
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="floating-field-input pr-12"
                autoComplete="new-password"
                tabIndex={isRegisterActive ? 0 : -1}
              />
              <label htmlFor="reg-password-input" className="floating-field-label">
                Password (min. 8 chars)
              </label>
              <button
                type="button"
                onClick={() => setRegShowPassword((p) => !p)}
                aria-label={regShowPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md cursor-pointer transition-colors"
                style={{ color: "var(--text-muted)" }}
                tabIndex={isRegisterActive ? 0 : -1}
              >
                {regShowPassword ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            {/* Password Strength Meter */}
            {regPassword && (
              <div className="space-y-1.5 pt-1" aria-live="polite">
                <div className="flex items-center justify-between text-[11px]">
                  <span style={{ color: "var(--text-muted)" }}>Strength Security</span>
                  <span className="font-semibold" style={{ color: regPasswordStrength.color }}>
                    {regPasswordStrength.label}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 h-1.5">
                  {[1, 2, 3, 4].map((seg) => (
                    <div
                      key={seg}
                      className="rounded-full transition-all duration-300"
                      style={{
                        backgroundColor:
                          regPasswordStrength.score >= seg ? regPasswordStrength.color : "var(--border)",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Confirm Password Field */}
            <div className="auth-stagger-item floating-field-container">
              <input
                id="reg-confirm-password-input"
                type={regShowPassword ? "text" : "password"}
                required
                placeholder=" "
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                className="floating-field-input"
                autoComplete="new-password"
                tabIndex={isRegisterActive ? 0 : -1}
              />
              <label htmlFor="reg-confirm-password-input" className="floating-field-label">
                Confirm Password
              </label>
              {regConfirmPassword && (
                <div
                  className="mt-1 text-[11px] font-medium"
                  style={{ color: regPasswordsMatch ? "var(--income)" : "var(--expense)" }}
                >
                  {regPasswordsMatch ? "✓ Passwords align" : "✕ Passwords do not match"}
                </div>
              )}
            </div>

            {/* Single Register Submit Button */}
            <div className="auth-stagger-item pt-2">
              <button
                ref={regBtnRef}
                type="submit"
                disabled={regSubmitting || regSuccess || isTransitioning}
                onMouseMove={handleRegBtnMouseMove}
                onMouseLeave={() => setRegBtnMagnet({ x: 0, y: 0 })}
                className="btn-accent btn-sheen-sweep w-full py-3 px-4 font-semibold text-xs tracking-wide rounded-xl relative flex items-center justify-center gap-2 cursor-pointer transition-transform duration-150 active:scale-[0.98]"
                style={{
                  transform: isReducedMotion
                    ? "none"
                    : `translate(${regBtnMagnet.x}px, ${regBtnMagnet.y}px)`,
                }}
                tabIndex={isRegisterActive ? 0 : -1}
              >
                {regSuccess ? (
                  <span className="flex items-center gap-2 animate-fade-in">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" className="checkmark-path" />
                    </svg>
                    <span>Account Created</span>
                  </span>
                ) : regSubmitting ? (
                  <span className="flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    <span>Creating Account...</span>
                  </span>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </div>

            {/* Register Cold Start Notice */}
            {regColdStart && regSubmitting && (
              <div
                className="p-3 rounded-lg text-xs flex items-center gap-2 animate-fade-in mt-3"
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                <span className="w-2 h-2 rounded-full animate-ping shrink-0" style={{ backgroundColor: "var(--accent)" }} />
                <span>Waking up free Render backend... This can take up to 50 seconds on cold start.</span>
              </div>
            )}
          </form>

          {/* Switch to Login Link */}
          <div className="auth-stagger-item mt-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            <span>Already have an account? </span>
            <button
              type="button"
              disabled={isTransitioning}
              onClick={() => onSwitchMode("login")}
              className="font-semibold underline underline-offset-4 cursor-pointer hover:opacity-85 transition-opacity"
              style={{ color: "var(--accent)", background: "transparent", border: "none", padding: 0 }}
              tabIndex={isRegisterActive ? 0 : -1}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
