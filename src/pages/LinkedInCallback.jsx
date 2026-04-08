import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

const API = "https://linkedin-agent-server.onrender.com";

export default function LinkedInCallback() {
  const [status, setStatus] = useState("Connecting LinkedIn...");
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code  = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error) {
      setStatus("❌ LinkedIn denied access.");
      setTimeout(() => navigate("/dashboard?linkedin=error"), 2000);
      return;
    }

    if (!code || !state) {
      setStatus("❌ Invalid callback.");
      setTimeout(() => navigate("/dashboard?linkedin=error"), 2000);
      return;
    }

    fetch(`${API}/auth/linkedin/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state })
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setStatus("✅ LinkedIn connected!");
        setTimeout(() => navigate("/dashboard?linkedin=connected"), 1000);
      })
      .catch((err) => {
        setStatus(`❌ ${err.message || "Failed to connect LinkedIn."}`);
        setTimeout(() => navigate("/dashboard?linkedin=error"), 4000);
      });
  }, []);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "Inter, sans-serif", background: "#f0f2f5"
    }}>
      <div style={{
        background: "#fff", padding: "40px 48px", borderRadius: 16,
        boxShadow: "0 4px 24px rgba(0,0,0,0.1)", textAlign: "center"
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
        <h2 style={{ margin: "0 0 8px", color: "#1e293b" }}>{status}</h2>
        <p style={{ color: "#64748b", fontSize: 14 }}>Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
