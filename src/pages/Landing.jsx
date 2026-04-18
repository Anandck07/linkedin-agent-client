import { useNavigate } from "react-router-dom";

const features = [
  { icon: "🪝", title: "Hook Agent", desc: "Crafts a viral opening line that stops the scroll" },
  { icon: "📝", title: "Content Agent", desc: "Writes engaging post body tailored to your topic" },
  { icon: "#️⃣", title: "Hashtag Agent", desc: "Picks 5 high-reach hashtags for maximum visibility" },
  { icon: "⭐", title: "Quality Agent", desc: "Refines tone and boosts engagement potential" },
  { icon: "✅", title: "Compliance Agent", desc: "Ensures your post follows LinkedIn guidelines" },
];

const steps = [
  { num: "1", title: "Sign up free", desc: "Create your account in seconds — no credit card needed" },
  { num: "2", title: "Add your API keys", desc: "Connect your Groq AI key and LinkedIn app credentials" },
  { num: "3", title: "Generate & publish", desc: "Type a topic, let AI agents craft your post, publish instantly" },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: "var(--font)", background: "#fff", color: "var(--text)" }}>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 60px", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "#fff", zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 18 }}>
          <span style={{ fontSize: 28 }}>🤖</span> LinkedIn AI Agent
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/auth?mode=login")}>Sign In</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate("/auth?mode=register")}>Get Started Free →</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: "linear-gradient(135deg, #0a66c2 0%, #004182 60%, #002855 100%)", color: "#fff", padding: "100px 60px", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", borderRadius: 99, padding: "6px 18px", fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
          🎉 100% Free — No credit card required
        </div>
        <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.15, marginBottom: 20, maxWidth: 700, margin: "0 auto 20px" }}>
          Generate Viral LinkedIn Posts with AI Agents
        </h1>
        <p style={{ fontSize: 18, opacity: 0.85, maxWidth: 560, margin: "0 auto 40px", lineHeight: 1.7 }}>
          5 specialized AI agents work together to craft, refine, and publish high-engagement LinkedIn posts — automatically.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-lg" onClick={() => navigate("/auth?mode=register")}
            style={{ background: "#fff", color: "var(--primary)", fontWeight: 700, fontSize: 16 }}>
            🚀 Start for Free
          </button>
          <button className="btn btn-lg" onClick={() => navigate("/auth?mode=login")}
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "2px solid rgba(255,255,255,0.4)", fontWeight: 600 }}>
            Sign In →
          </button>
        </div>
        <div style={{ marginTop: 48, display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap", opacity: 0.8, fontSize: 14 }}>
          {["✅ Free forever", "✅ No credit card", "✅ Auto-publish to LinkedIn", "✅ Schedule posts"].map(t => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: "80px 60px", background: "var(--bg)" }}>
        <h2 style={{ textAlign: "center", fontSize: 32, fontWeight: 700, marginBottom: 48 }}>How It Works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 28, maxWidth: 900, margin: "0 auto" }}>
          {steps.map((s) => (
            <div key={s.num} style={{ background: "#fff", borderRadius: 16, padding: "32px 28px", textAlign: "center", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ width: 48, height: 48, background: "var(--primary)", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, margin: "0 auto 16px" }}>{s.num}</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Agents */}
      <section style={{ padding: "80px 60px" }}>
        <h2 style={{ textAlign: "center", fontSize: 32, fontWeight: 700, marginBottom: 12 }}>5 AI Agents, One Perfect Post</h2>
        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 16, marginBottom: 48 }}>Each agent specializes in one job — together they produce posts that get results</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 20, maxWidth: 1000, margin: "0 auto" }}>
          {features.map((f) => (
            <div key={f.title} style={{ background: "var(--bg)", borderRadius: 14, padding: "24px 18px", textAlign: "center", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Free plan banner */}
      <section style={{ padding: "80px 60px", background: "linear-gradient(135deg, #0a66c2, #004182)", color: "#fff", textAlign: "center" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16 }}>Free Forever. No Limits.</h2>
        <p style={{ fontSize: 17, opacity: 0.85, marginBottom: 36, maxWidth: 500, margin: "0 auto 36px" }}>
          Generate unlimited posts, schedule them, publish to LinkedIn — all completely free.
        </p>
        <button className="btn btn-lg" onClick={() => navigate("/auth?mode=register")}
          style={{ background: "#fff", color: "var(--primary)", fontWeight: 700, fontSize: 16 }}>
          🎉 Create Free Account →
        </button>
      </section>

      {/* Footer */}
      <footer style={{ padding: "28px 60px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)" }}>
        <span>🤖 LinkedIn AI Agent — Free SaaS</span>
        <div style={{ display: "flex", gap: 20 }}>
          <span style={{ cursor: "pointer" }} onClick={() => navigate("/auth?mode=login")}>Sign In</span>
          <span style={{ cursor: "pointer" }} onClick={() => navigate("/auth?mode=register")}>Register</span>
        </div>
      </footer>
    </div>
  );
}
