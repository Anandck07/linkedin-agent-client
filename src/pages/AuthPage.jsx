import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "register");
  const { login } = useAuth();
  const navigate = useNavigate();

  // ── Login state ──────────────────────────────────────────────
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [useOtp, setUseOtp] = useState(false);
  const [loginOtp, setLoginOtp] = useState("");
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginOtpLoading, setLoginOtpLoading] = useState(false);
  const [loginSeconds, setLoginSeconds] = useState(0);
  const [loginInfo, setLoginInfo] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPw, setShowLoginPw] = useState(false);

  // ── Register state ───────────────────────────────────────────
  const [regForm, setRegForm] = useState({ name: "", email: "", password: "" });
  const [regOtp, setRegOtp] = useState("");
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtpVerified, setRegOtpVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [regSeconds, setRegSeconds] = useState(0);
  const [regOtpLoading, setRegOtpLoading] = useState(false);
  const [regVerifying, setRegVerifying] = useState(false);
  const [regInfo, setRegInfo] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);

  // ── Forgot password state ────────────────────────────────────
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // ── Timers ───────────────────────────────────────────────────
  useEffect(() => {
    if (loginSeconds <= 0) return;
    const t = setInterval(() => setLoginSeconds((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [loginSeconds]);

  useEffect(() => {
    if (regSeconds <= 0) return;
    const t = setInterval(() => setRegSeconds((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [regSeconds]);

  // Reset OTP if email changes after verification (from Register.jsx)
  useEffect(() => {
    if (verifiedEmail && verifiedEmail !== regForm.email.toLowerCase().trim()) {
      setRegOtpVerified(false);
      setRegOtpSent(false);
      setRegOtp("");
      setRegInfo("Email changed. Please verify the new email with OTP.");
    }
  }, [regForm.email, verifiedEmail]);

  // ── Login handlers (from Login.jsx) ─────────────────────────
  const resetOtpState = () => {
    setLoginOtp(""); setLoginOtpSent(false);
    setLoginSeconds(0); setLoginInfo(""); setLoginError("");
  };

  const handleModeToggle = () => { setUseOtp((p) => !p); resetOtpState(); };

  const handleSendLoginOtp = async () => {
    const email = loginForm.email.toLowerCase().trim();
    if (!email) { setLoginError("Enter your email first."); return; }
    setLoginError(""); setLoginInfo(""); setLoginOtpLoading(true);
    try {
      const data = await api.sendLoginOtp(email);
      setLoginOtpSent(true);
      setLoginSeconds(data.resendAfterSec || 60);
      setLoginInfo("OTP sent to your email. Check your inbox and enter the code below.");
    } catch (err) {
      setLoginError(err.message || "Could not send OTP.");
    } finally {
      setLoginOtpLoading(false);
    }
  };

  const handleOtpLogin = async (e) => {
    e.preventDefault();
    setLoginError(""); setLoginLoading(true);
    try {
      const data = await api.loginWithOtp(loginForm.email.toLowerCase().trim(), loginOtp);
      login(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      setLoginError(err.message || "OTP login failed.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoginError(""); setLoginLoading(true);
    try {
      const data = await api.login({ email: loginForm.email, password: loginForm.password });
      login(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      setLoginError(err.message || "Login failed.");
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Register handlers (from Register.jsx) ───────────────────
  const handleSendRegOtp = async () => {
    const email = regForm.email.toLowerCase().trim();
    if (!email) { setRegError("Enter email first to receive OTP."); return; }
    setRegError(""); setRegInfo(""); setRegOtpLoading(true);
    try {
      const data = await api.sendOtp(email);
      setRegOtpSent(true);
      setRegOtpVerified(false);
      setVerifiedEmail("");
      setRegSeconds(data.resendAfterSec || 60);
      setRegInfo("OTP sent to your email. Check your inbox and enter the code below.");
    } catch (err) {
      setRegError(err.message || "Could not send OTP.");
    } finally {
      setRegOtpLoading(false);
    }
  };

  const handleVerifyRegOtp = async () => {
    const email = regForm.email.toLowerCase().trim();
    if (!email || !regOtp) { setRegError("Email and OTP are required."); return; }
    setRegError(""); setRegInfo(""); setRegVerifying(true);
    try {
      await api.verifyOtp(email, regOtp);
      setRegOtpVerified(true);
      setVerifiedEmail(email);
      setRegInfo("Email verified successfully. You can now complete registration.");
    } catch (err) {
      setRegError(err.message || "OTP verification failed.");
    } finally {
      setRegVerifying(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError("");
    const currentEmail = regForm.email.toLowerCase().trim();
    if (!regOtpVerified || verifiedEmail !== currentEmail) {
      setRegError("Verify your email with OTP before registering.");
      return;
    }
    setRegLoading(true);
    try {
      const data = await api.register({ ...regForm, email: currentEmail });
      login(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      setRegError(err.message || "Registration failed.");
    } finally {
      setRegLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setForgotLoading(true); setForgotMsg("");
    try {
      const data = await api.forgotPassword(forgotEmail);
      setForgotMsg(data.message);
    } catch (err) {
      setForgotMsg(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left Panel */}
      <div className="auth-left">
        <div className="auth-left-logo">🤖</div>
        <h1>LinkedIn AI Agent</h1>
        <p>Generate viral LinkedIn posts using multi-agent AI and publish directly to your profile.</p>
        <div className="auth-features">
          {[
            ["✨", "AI-powered post generation"],
            ["🤖", "5 specialized AI agents"],
            ["🚀", "One-click LinkedIn publishing"],
            ["📋", "Post history & analytics"],
          ].map(([icon, text]) => (
            <div className="auth-feature" key={text}>
              <div className="auth-feature-icon">{icon}</div>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="auth-right">
        <div className="auth-card">

          {/* ── LOGIN ── */}
          {isLogin && (
            <>
              <h2 className="auth-card-title">{useOtp ? "Login with OTP" : "Welcome back 👋"}</h2>
              <p className="auth-card-sub">Sign in to your LinkedIn AI Agent dashboard</p>

              {useOtp ? (
                <form onSubmit={handleOtpLogin}>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input className="form-input" type="email" placeholder="you@example.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required />
                  </div>
                  <div className="form-group">
                    <button type="button" className="btn btn-secondary btn-full"
                      onClick={handleSendLoginOtp}
                      disabled={loginOtpLoading || loginSeconds > 0}>
                      {loginOtpLoading ? "Sending..." : loginSeconds > 0 ? `Resend in ${loginSeconds}s` : "Send OTP"}
                    </button>
                  </div>
                  {loginOtpSent && (
                    <div className="form-group">
                      <label className="form-label">Enter 6-digit OTP</label>
                      <input className="form-input" placeholder="______"
                        value={loginOtp}
                        onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        required />
                    </div>
                  )}
                  {loginInfo && <p style={{ fontSize: 13, color: "var(--primary)", marginBottom: 12 }}>{loginInfo}</p>}
                  {loginError && <div className="alert alert-error" style={{ marginBottom: 12 }}>❌ {loginError}</div>}
                  <button className="btn btn-primary btn-full btn-lg"
                    disabled={loginLoading || !loginOtpSent || loginOtp.length !== 6}>
                    {loginLoading ? <><span className="spinner" /> Please wait...</> : "Login with OTP →"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handlePasswordLogin}>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input className="form-input" type="email" placeholder="you@example.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <div style={{ position: "relative" }}>
                      <input className="form-input" placeholder="••••••••"
                        type={showLoginPw ? "text" : "password"}
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        style={{ paddingRight: 40 }} required />
                      <button type="button" onClick={() => setShowLoginPw(!showLoginPw)}
                        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--text-muted)", padding: 0 }}>
                        {showLoginPw ? "🙈" : "👁️"}
                      </button>
                    </div>
                    <div style={{ textAlign: "right", marginTop: 6 }}>
                      <span style={{ fontSize: 13, color: "var(--primary)", cursor: "pointer", fontWeight: 500 }}
                        onClick={() => { setForgotOpen(true); setForgotMsg(""); setForgotEmail(""); }}>
                        Forgot password?
                      </span>
                    </div>
                  </div>
                  {loginError && <div className="alert alert-error" style={{ marginBottom: 12 }}>❌ {loginError}</div>}
                  <button className="btn btn-primary btn-full btn-lg" disabled={loginLoading} style={{ marginTop: 4 }}>
                    {loginLoading ? <><span className="spinner" /> Please wait...</> : "Sign In →"}
                  </button>
                </form>
              )}

              <div style={{ textAlign: "center", marginTop: 14 }}>
                <button type="button" className="btn btn-ghost"
                  onClick={handleModeToggle}
                  style={{ fontSize: 13, color: "var(--primary)", fontWeight: 500 }}>
                  {useOtp ? "Login with Password instead" : "Login with OTP instead"}
                </button>
              </div>
            </>
          )}

          {/* ── REGISTER ── */}
          {!isLogin && (
            <>
              <h2 className="auth-card-title">Create account</h2>
              <p className="auth-card-sub">Start generating viral LinkedIn posts today</p>

              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" placeholder="John Doe"
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" placeholder="you@example.com"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    required />
                </div>

                <div className="form-group">
                  <button type="button" className="btn btn-secondary btn-full"
                    onClick={handleSendRegOtp}
                    disabled={regOtpLoading || regSeconds > 0}>
                    {regOtpLoading ? "Sending..." : regSeconds > 0 ? `Resend in ${regSeconds}s` : "Send OTP"}
                  </button>
                </div>

                {regOtpSent && (
                  <div className="form-group">
                    <label className="form-label">Enter 6-digit OTP</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input className="form-input" placeholder="______"
                        value={regOtp}
                        onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        style={{ flex: 1 }} />
                      <button type="button"
                        className={`btn ${regOtpVerified ? "btn-success" : "btn-secondary"}`}
                        onClick={handleVerifyRegOtp}
                        disabled={regVerifying || regOtp.length !== 6 || regOtpVerified}
                        style={{ whiteSpace: "nowrap" }}>
                        {regVerifying ? "Verifying..." : regOtpVerified ? "✅ Verified" : "Verify OTP"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{ position: "relative" }}>
                    <input className="form-input" placeholder="••••••••"
                      type={showRegPw ? "text" : "password"}
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      style={{ paddingRight: 40 }} required />
                    <button type="button" onClick={() => setShowRegPw(!showRegPw)}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--text-muted)", padding: 0 }}>
                      {showRegPw ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                {regInfo && <p style={{ fontSize: 13, color: "var(--primary)", marginBottom: 12 }}>{regInfo}</p>}
                {regError && <div className="alert alert-error" style={{ marginBottom: 12 }}>❌ {regError}</div>}
                <button className="btn btn-primary btn-full btn-lg" disabled={regLoading} style={{ marginTop: 4 }}>
                  {regLoading ? <><span className="spinner" /> Please wait...</> : "Create Account →"}
                </button>
              </form>
            </>
          )}

          <div className="divider" />
          <p style={{ textAlign: "center", fontSize: 14, color: "var(--text-muted)" }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span onClick={() => { setIsLogin(!isLogin); setLoginError(""); setRegError(""); resetOtpState(); }}
              style={{ color: "var(--primary)", cursor: "pointer", fontWeight: 600 }}>
              {isLogin ? "Register for free" : "Sign in"}
            </span>
          </p>

          {/* Forgot Password Modal */}
          {forgotOpen && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
              <div style={{ background: "var(--card-bg, #fff)", borderRadius: 12, padding: 32, width: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
                <h3 style={{ marginBottom: 8 }}>Reset Password</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Enter your email and we'll send a reset link.</p>
                <form onSubmit={handleForgot}>
                  <input className="form-input" type="email" placeholder="you@example.com"
                    value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                    required style={{ marginBottom: 12 }} />
                  {forgotMsg && <p style={{ fontSize: 13, color: "var(--primary)", marginBottom: 12 }}>{forgotMsg}</p>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-primary" disabled={forgotLoading} style={{ flex: 1 }}>
                      {forgotLoading ? "Sending..." : "Send Reset Link"}
                    </button>
                    <button type="button" className="btn" onClick={() => setForgotOpen(false)} style={{ flex: 1 }}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
