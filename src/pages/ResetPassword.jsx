import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    setError("");
    try {
      const data = await api.resetPassword(params.get("token"), password);
      setMsg(data.message);
      setTimeout(() => navigate("/"), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg, #f5f5f5)" }}>
      <div style={{ background: "var(--card-bg, #fff)", borderRadius: 12, padding: 36, width: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
        <h2 style={{ marginBottom: 8 }}>Set New Password</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Enter your new password below.</p>
        {msg ? (
          <p style={{ color: "green", fontSize: 14 }}>✅ {msg} Redirecting to login...</p>
        ) : (
          <form onSubmit={submit}>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <input
                className="form-input"
                type={showPw ? "text" : "password"}
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: 40 }}
                required
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 0 }}>
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>
            <input
              className="form-input"
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              style={{ marginBottom: 12 }}
              required
            />
            {error && <p style={{ color: "red", fontSize: 13, marginBottom: 12 }}>❌ {error}</p>}
            <button className="btn btn-primary btn-full" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
