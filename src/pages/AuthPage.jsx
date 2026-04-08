import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
              <input className="form-input" placeholder="••••••••" type="password" value={form.password} onChange={f("password")} required />
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
        </div>
      </div>
    </div>
  );
}
