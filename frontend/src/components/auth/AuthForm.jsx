import { useState, useRef, useEffect, useId } from "react";
import { loginUser, registerUser } from "../../services/api";

export default function AuthForm({
  mode = "login",
  onSwitchMode,
  onSuccessRedirect,
}) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [shakeFields, setShakeFields] = useState(false);
  const [coldStartNotice, setColdStartNotice] = useState(false);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [btnMagnet, setBtnMagnet] = useState({ x: 0, y: 0 });
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const firstInputRef = useRef(null);

  const isRegister = mode === "register";

  // Check prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mq.matches);
    const listener = (e) => setIsReducedMotion(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  // Autofocus first input when mode changes
  useEffect(() => {
    setError("");
    setShakeFields(false);
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [mode]);

  // Subtle cursor spotlight inside form container
  const handleContainerMouseMove = (e) => {
    if (isReducedMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleContainerMouseLeave = () => {
    setMousePos({ x: -1000, y: -1000 });
  };

  // Magnetic Button Hover (max 4px towards cursor)
  const handleButtonMouseMove = (e) => {
    if (isReducedMotion || !buttonRef.current || submitting || isSuccess) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = (e.clientX - centerX) / (rect.width / 2);
    const deltaY = (e.clientY - centerY) / (rect.height / 2);

    setBtnMagnet({
      x: Math.max(-4, Math.min(4, deltaX * 4)),
      y: Math.max(-4, Math.min(4, deltaY * 4)),
    });
  };

  const handleButtonMouseLeave = () => {
    setBtnMagnet({ x: 0, y: 0 });
  };

  // Password strength evaluation (for Register)
  const passwordStrength = (() => {
    if (!password) return { score: 0, label: "" };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-zA-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password) && password.length >= 10) score += 1;

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

  const passwordsMatch = !isRegister || (password && confirmPassword && password === confirmPassword);

  // Form Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || isSuccess) return;

    setError("");
    setShakeFields(false);
    setColdStartNotice(false);

    // Validation
    if (isRegister) {
      if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        setError("Password must be at least 8 characters long and contain both letters and numbers.");
        triggerShake();
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please re-enter.");
        triggerShake();
        return;
      }
    }

    setSubmitting(true);

    // Cold start timer for free Render tier
    const coldTimer = setTimeout(() => {
      setColdStartNotice(true);
    }, 4500);

    try {
      if (isRegister) {
        const res = await registerUser(username, email, password);
        clearTimeout(coldTimer);
        setIsSuccess(true);
        setTimeout(() => {
          onSuccessRedirect(res.data?.token ? "/dashboard" : "/login");
        }, 850);
      } else {
        const res = await loginUser(email, password);
        clearTimeout(coldTimer);
        const name = res.data?.username || email.split("@")[0];
        localStorage.setItem("username", name);
        setIsSuccess(true);
        setTimeout(() => {
          onSuccessRedirect("/dashboard");
        }, 850);
      }
    } catch (err) {
      clearTimeout(coldTimer);
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        (isRegister ? "Registration failed. Username or email may already exist." : "Invalid email/username or password");
      setError(msg);
      triggerShake();
    } finally {
      clearTimeout(coldTimer);
      setSubmitting(false);
      setColdStartNotice(false);
    }
  };

  const triggerShake = () => {
    setShakeFields(true);
    setTimeout(() => setShakeFields(false), 300);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleContainerMouseMove}
      onMouseLeave={handleContainerMouseLeave}
      className="relative w-full max-w-[400px] mx-auto py-8 sm:py-12 px-2 flex flex-col justify-center"
      style={{ color: "var(--text)" }}
    >
      {/* Subtle Cursor Spotlight Overlay */}
      {!isReducedMotion && mousePos.x >= 0 && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(380px circle at ${mousePos.x}px ${mousePos.y}px, color-mix(in srgb, var(--accent) 5%, transparent), transparent 75%)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Form Header */}
      <div className="auth-stagger-item mb-6" style={{ animationDelay: "60ms" }}>
        <span className="section-label" style={{ color: "var(--text-muted)", fontSize: "11px" }}>
          {isRegister ? "Registration" : "Authentication"}
        </span>
        <h1
          className="text-2xl sm:text-3xl font-normal font-serif tracking-tight m-0 mt-1"
          style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}
        >
          {isRegister ? "Create Account" : "Sign In"}
        </h1>
        <p className="text-xs sm:text-sm m-0 mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {isRegister
            ? "Enter your credentials to create your personal financial account."
            : "Enter your account credentials to access your intelligence dashboard."}
        </p>
      </div>



      {/* Error Banner with Slide-Down & Field Shake */}
      <div
        aria-live="assertive"
        className={`overflow-hidden transition-all duration-200 ${
          error ? "max-h-24 opacity-100 mb-4" : "max-h-0 opacity-0 mb-0"
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
          <span className="flex-1">{error}</span>
        </div>
      </div>

      {/* Main Credentials Form */}
      <form
        onSubmit={handleSubmit}
        className={`space-y-4 ${shakeFields ? "animate-field-shake" : ""}`}
        noValidate
      >
        {/* Username (Register only) */}
        {isRegister && (
          <div className="auth-stagger-item floating-field-container" style={{ animationDelay: "160ms" }}>
            <input
              ref={firstInputRef}
              id="username-input"
              type="text"
              required
              placeholder=" "
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="floating-field-input"
              autoComplete="username"
            />
            <label htmlFor="username-input" className="floating-field-label">
              Legal Username
            </label>
          </div>
        )}

        {/* Email Field */}
        <div
          className="auth-stagger-item floating-field-container"
          style={{ animationDelay: isRegister ? "200ms" : "160ms" }}
        >
          <input
            ref={!isRegister ? firstInputRef : null}
            id="email-input"
            type="email"
            required
            placeholder=" "
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="floating-field-input"
            autoComplete="email"
          />
          <label htmlFor="email-input" className="floating-field-label">
            Email Address
          </label>
        </div>

        {/* Password Field with Show/Hide Morph */}
        <div
          className="auth-stagger-item floating-field-container"
          style={{ animationDelay: isRegister ? "240ms" : "200ms" }}
        >
          <input
            id="password-input"
            type={showPassword ? "text" : "password"}
            required
            placeholder=" "
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="floating-field-input pr-12"
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
          <label htmlFor="password-input" className="floating-field-label">
            Password {isRegister && "(min. 8 characters)"}
          </label>

          {/* Show/Hide Password Morph Button */}
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md cursor-pointer transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            {showPassword ? (
              // Eye Closed SVG
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              // Eye Open SVG
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {/* Register: Animated Segmented Password Strength Meter */}
        {isRegister && password && (
          <div className="space-y-1.5 pt-1" aria-live="polite">
            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: "var(--text-muted)" }}>Strength Security</span>
              <span className="font-semibold" style={{ color: passwordStrength.color }}>
                {passwordStrength.label}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 h-1.5">
              {[1, 2, 3, 4].map((seg) => (
                <div
                  key={seg}
                  className="rounded-full transition-all duration-300"
                  style={{
                    backgroundColor:
                      passwordStrength.score >= seg ? passwordStrength.color : "var(--border)",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Confirm Password (Register only) */}
        {isRegister && (
          <div className="auth-stagger-item floating-field-container" style={{ animationDelay: "280ms" }}>
            <input
              id="confirm-password-input"
              type={showPassword ? "text" : "password"}
              required
              placeholder=" "
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="floating-field-input"
              autoComplete="new-password"
            />
            <label htmlFor="confirm-password-input" className="floating-field-label">
              Confirm Password
            </label>
            {confirmPassword && (
              <div
                className="mt-1 text-[11px] font-medium"
                style={{ color: passwordsMatch ? "var(--income)" : "var(--expense)" }}
              >
                {passwordsMatch ? "✓ Passwords align" : "✕ Passwords do not match"}
              </div>
            )}
          </div>
        )}

        {/* Magnetic Primary Submit Button */}
        <div
          className="auth-stagger-item pt-2"
          style={{ animationDelay: isRegister ? "320ms" : "240ms" }}
        >
          <button
            ref={buttonRef}
            type="submit"
            disabled={submitting || isSuccess}
            onMouseMove={handleButtonMouseMove}
            onMouseLeave={handleButtonMouseLeave}
            className="btn-accent btn-sheen-sweep w-full py-3 px-4 font-semibold text-xs tracking-wide rounded-xl relative flex items-center justify-center gap-2 cursor-pointer transition-transform duration-150 active:scale-[0.98]"
            style={{
              transform: isReducedMotion
                ? "none"
                : `translate(${btnMagnet.x}px, ${btnMagnet.y}px)`,
            }}
          >
            {isSuccess ? (
              // Success Morph Checkmark
              <span className="flex items-center gap-2 animate-fade-in">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" className="checkmark-path" />
                </svg>
                <span>Authenticated</span>
              </span>
            ) : submitting ? (
              // Submitting Spinner Pill
              <span className="flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                <span>{isRegister ? "Creating Account..." : "Signing in..."}</span>
              </span>
            ) : (
              <span>{isRegister ? "Create Account" : "Sign In"}</span>
            )}
          </button>
        </div>

        {/* Render Free Tier Cold-Start Indicator */}
        {coldStartNotice && submitting && (
          <div
            className="p-3 rounded-lg text-xs flex items-center gap-2 animate-fade-in mt-3"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-ping shrink-0"
              style={{ backgroundColor: "var(--accent)" }}
            />
            <span>Waking up free Render backend... This can take up to 50 seconds on cold start.</span>
          </div>
        )}
      </form>

      {/* Bottom Switch Link */}
      <div
        className="auth-stagger-item mt-8 text-center text-xs"
        style={{
          color: "var(--text-muted)",
          animationDelay: isRegister ? "360ms" : "280ms",
        }}
      >
        <span>{isRegister ? "Already have an account?" : "Don't have an account?"} </span>
        <button
          type="button"
          onClick={() => onSwitchMode(isRegister ? "login" : "register")}
          className="font-semibold underline underline-offset-4 cursor-pointer hover:opacity-85 transition-opacity"
          style={{ color: "var(--accent)", background: "transparent", border: "none", padding: 0 }}
        >
          {isRegister ? "Sign In" : "Create Account"}
        </button>
      </div>
    </div>
  );
}
