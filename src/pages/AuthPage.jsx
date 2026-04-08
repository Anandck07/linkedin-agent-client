import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = isLogin
        ? await api.login({ email: form.email, password: form.password })
        : await api.register(form);
      login(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendReset = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMsg("");
    try {
      const data = await api.forgotPassword(forgotEmail);
      setForgotMsg(data.message);
    } catch (err) {
      setForgotMsg(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

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
          <h2 className="auth-card-title">
            {isLogin ? "Welcome back 👋" : "Create account"}
          </h2>
          <p className="auth-card-sub">
            {isLogin ? "Sign in to your LinkedIn AI Agent dashboard" : "Start generating viral LinkedIn posts today"}
          </p>

          <form onSubmit={submit}>
            {!isLogin && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" placeholder="John Doe" value={form.name} onChange={f("name")} required />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" placeholder="you@example.com" type="email" value={form.email} onChange={f("email")} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  className="form-input"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={f("password")}
                  style={{ paddingRight: 40 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--text-muted)", padding: 0 }}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              {isLogin && (
                <div style={{ textAlign: "right", marginTop: 6 }}>
                  <span
                    style={{ fontSize: 13, color: "var(--primary)", cursor: "pointer", fontWeight: 500 }}
                    onClick={() => { setForgotOpen(true); setForgotMsg(""); setForgotEmail(""); }}
                  >
                    Forgot password?
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>
                ❌ {error}
              </div>
            )}

            <button className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? <><span className="spinner" /> Please wait...</> : isLogin ? "Sign In →" : "Create Account →"}
            </button>
          </form>

          <div className="divider" />

          <p style={{ textAlign: "center", fontSize: 14, color: "var(--text-muted)" }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span
              onClick={() => { setIsLogin(!isLogin); setError(""); }}
              style={{ color: "var(--primary)", cursor: "pointer", fontWeight: 600 }}
            >
              {isLogin ? "Register for free" : "Sign in"}
            </span>
          </p>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "var(--card-bg, #fff)", borderRadius: 12, padding: 32, width: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <h3 style={{ marginBottom: 8 }}>Reset Password</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Enter your email and we'll send a reset link.</p>
            <form onSubmit={sendReset}>
              <input
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                style={{ marginBottom: 12 }}
              />
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
