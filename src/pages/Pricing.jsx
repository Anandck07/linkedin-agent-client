import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(null);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.getPlans().then((d) => setPlans(d.plans)).catch(() => {});
  }, []);

  const handleUpgrade = async (plan) => {
    if (!token) return navigate("/");
    if (plan.id === "free") return;
    setLoading(plan.id);
    try {
      const data = await api.checkout(plan.priceId, token);
      window.location.href = data.url;
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "60px 20px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>
            Simple, Transparent Pricing
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-muted)" }}>
            Start free. Upgrade when you need more.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              style={{
                background: plan.id === "pro" ? "var(--primary)" : "#fff",
                color: plan.id === "pro" ? "#fff" : "var(--text)",
                border: `2px solid ${plan.id === "pro" ? "var(--primary)" : "var(--border)"}`,
                borderRadius: 16,
                padding: "32px 28px",
                position: "relative",
                boxShadow: plan.id === "pro" ? "0 8px 32px rgba(10,102,194,0.3)" : "var(--shadow-sm)",
                transform: plan.id === "pro" ? "scale(1.04)" : "none",
              }}
            >
              {plan.id === "pro" && (
                <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#f59e0b", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 16px", borderRadius: 99 }}>
                  MOST POPULAR
                </div>
              )}
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{plan.name}</div>
              <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 4 }}>
                ${plan.price}<span style={{ fontSize: 16, fontWeight: 400, opacity: 0.7 }}>/mo</span>
              </div>
              <div style={{ height: 1, background: plan.id === "pro" ? "rgba(255,255,255,0.2)" : "var(--border)", margin: "20px 0" }} />
              <ul style={{ listStyle: "none", padding: 0, marginBottom: 28, display: "flex", flexDirection: "column", gap: 10 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 8, opacity: 0.9 }}>
                    <span style={{ color: plan.id === "pro" ? "#86efac" : "var(--green)", fontWeight: 700 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(plan)}
                disabled={plan.id === "free" || loading === plan.id}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 8,
                  border: "none",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: plan.id === "free" ? "default" : "pointer",
                  background: plan.id === "pro" ? "#fff" : plan.id === "free" ? "var(--bg)" : "var(--primary)",
                  color: plan.id === "pro" ? "var(--primary)" : plan.id === "free" ? "var(--text-muted)" : "#fff",
                  opacity: plan.id === "free" ? 0.6 : 1,
                  fontFamily: "var(--font)",
                }}
              >
                {loading === plan.id ? "Redirecting..." : plan.id === "free" ? "Current Plan" : `Upgrade to ${plan.name} →`}
              </button>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 40 }}>
          <button className="btn btn-ghost" onClick={() => navigate(token ? "/dashboard" : "/")}>
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
