import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true);
  const s = document.createElement("script");
  s.src = "https://checkout.razorpay.com/v1/checkout.js";
  s.onload = () => resolve(true);
  s.onerror = () => resolve(false);
  document.body.appendChild(s);
});

const FEATURE_LABELS = {
  free:    ["20 posts/month", "No scheduling", "No Peak Timing", "AI content generation", "Basic analytics"],
  pro:     ["200 posts/month", "50 scheduled posts/month", "Peak Timing (30/month)", "AI content generation", "Advanced analytics"],
  premium: ["Unlimited posts", "Unlimited scheduling", "Unlimited Peak Timing", "AI content generation", "Advanced analytics"],
};

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState("free");
  const [billing, setBilling] = useState("monthly");
  const [coupon, setCoupon] = useState("");
  const [couponResult, setCouponResult] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [loading, setLoading] = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const { token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.getPlans().then(d => setPlans(d.plans)).catch(() => {});
    if (token) {
      api.getMe(token).then(me => {
        if (me?.plan) setCurrentPlan(me.plan);
      }).catch(() => {});
    }
  }, [token]);

  const applyCoupon = async (planId) => {
    if (!coupon.trim()) return;
    setApplyingCoupon(true); setCouponError(""); setCouponResult(null);
    try {
      const data = await api.applyCoupon({ code: coupon, planId, billingCycle: billing }, token);
      setCouponResult({ ...data, planId });
    } catch (err) {
      setCouponError(err.message);
    } finally { setApplyingCoupon(false); }
  };

  const handleSubscribe = async (plan) => {
    if (!token) return navigate("/auth?mode=register");
    if (plan.id === "free") return;
    setLoading(plan.id);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Failed to load Razorpay");

      const couponCode = couponResult?.planId === plan.id ? coupon : undefined;
      const order = await api.createOrder({ planId: plan.id, billingCycle: billing, couponCode }, token);

      const options = {
        key: order.keyId,
        amount: order.amount * 100,
        currency: "INR",
        name: "LinkedIn AI Agent",
        description: `${plan.name} Plan - ${billing === "monthly" ? "Monthly" : "6 Months"}`,
        order_id: order.orderId,
        prefill: { name: order.name, email: order.email },
        theme: { color: "#0a66c2" },
        handler: async (response) => {
          try {
            await api.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }, token);
            navigate("/dashboard?upgrade=success");
          } catch (err) {
            alert("Payment verification failed: " + err.message);
          }
        }
      };
      new window.Razorpay(options).open();
    } catch (err) {
      alert(err.message);
    } finally { setLoading(null); }
  };

  const getPrice = (plan) => {
    const base = plan.price?.[billing] || 0;
    if (couponResult?.planId === plan.id) return couponResult.finalPrice;
    return base;
  };

  const getOriginalPrice = (plan) => plan.price?.[billing] || 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "60px 20px", fontFamily: "var(--font)" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "var(--text)", marginBottom: 12 }}>Simple, Transparent Pricing</h1>
          <p style={{ fontSize: 16, color: "var(--text-muted)" }}>Start free. Upgrade when you need more power.</p>

          {/* Billing Toggle */}
          <div style={{ display: "inline-flex", background: "#fff", border: "1px solid var(--border)", borderRadius: 99, padding: 4, marginTop: 24, gap: 4 }}>
            {["monthly", "halfyearly"].map(b => (
              <button key={b} onClick={() => setBilling(b)} style={{
                padding: "8px 20px", borderRadius: 99, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
                background: billing === b ? "var(--primary)" : "transparent",
                color: billing === b ? "#fff" : "var(--text-muted)",
                fontFamily: "var(--font)"
              }}>
                {b === "monthly" ? "Monthly" : "6 Months"} {b === "halfyearly" && <span style={{ color: billing === "halfyearly" ? "#86efac" : "var(--green)", fontSize: 12 }}>Save 25%</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Coupon Input */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 40 }}>
          <input
            className="form-input"
            placeholder="Have a coupon code?"
            value={coupon}
            onChange={e => { setCoupon(e.target.value.toUpperCase()); setCouponResult(null); setCouponError(""); }}
            style={{ maxWidth: 240, marginBottom: 0 }}
          />
          <button className="btn btn-ghost" onClick={() => applyCoupon(plans.find(p => p.id !== "free")?.id)} disabled={applyingCoupon || !coupon.trim()}>
            {applyingCoupon ? "Checking..." : "Apply"}
          </button>
        </div>
        {couponResult && <p style={{ textAlign: "center", color: "var(--green)", marginBottom: 24, fontWeight: 600 }}>✅ Coupon applied! You save ₹{couponResult.discount}</p>}
        {couponError && <p style={{ textAlign: "center", color: "var(--red)", marginBottom: 24 }}>❌ {couponError}</p>}

        {/* Plan Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
          {plans.map(plan => {
            const price = getPrice(plan);
            const original = getOriginalPrice(plan);
            const discounted = couponResult?.planId === plan.id && price < original;
            const isPremium = plan.id === "premium";
            const isPro = plan.id === "pro";
            const isCurrentPlan = currentPlan === plan.id;

            return (
              <div key={plan.id} style={{
                background: isPremium ? "linear-gradient(135deg, #0a66c2, #004182)" : "#fff",
                color: isPremium ? "#fff" : "var(--text)",
                border: `2px solid ${isPremium ? "#0a66c2" : isPro ? "#0a66c2" : "var(--border)"}`,
                borderRadius: 20, padding: "36px 28px", position: "relative",
                boxShadow: isPremium ? "0 12px 40px rgba(10,102,194,0.35)" : "var(--shadow-sm)",
                transform: isPremium ? "scale(1.04)" : "none",
              }}>
                {isPremium && <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#f59e0b", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 18px", borderRadius: 99 }}>BEST VALUE</div>}
                {isPro && <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "var(--primary)", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 18px", borderRadius: 99 }}>POPULAR</div>}

                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{plan.name}</div>

                <div style={{ marginBottom: 20 }}>
                  {discounted && <div style={{ fontSize: 14, textDecoration: "line-through", opacity: 0.6 }}>₹{original}</div>}
                  <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1 }}>
                    {price === 0 ? "Free" : `₹${price}`}
                    {price > 0 && <span style={{ fontSize: 15, fontWeight: 400, opacity: 0.7 }}>/{billing === "monthly" ? "mo" : "6mo"}</span>}
                  </div>
                </div>

                <div style={{ height: 1, background: isPremium ? "rgba(255,255,255,0.2)" : "var(--border)", margin: "20px 0" }} />

                <ul style={{ listStyle: "none", padding: 0, marginBottom: 28, display: "flex", flexDirection: "column", gap: 10 }}>
                  {(FEATURE_LABELS[plan.id] || []).map(f => (
                    <li key={f} style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: isPremium ? "#86efac" : "var(--green)", fontWeight: 700, fontSize: 16 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isCurrentPlan || loading === plan.id}
                  style={{
                    width: "100%", padding: "13px", borderRadius: 10, border: "none",
                    fontWeight: 700, fontSize: 15, cursor: isCurrentPlan ? "default" : "pointer",
                    background: isPremium ? (isCurrentPlan ? "#e0e0e0" : "#fff") : isCurrentPlan ? "var(--bg)" : "var(--primary)",
                    color: isPremium ? (isCurrentPlan ? "var(--text-muted)" : "var(--primary)") : isCurrentPlan ? "var(--text-muted)" : "#fff",
                    opacity: isCurrentPlan ? 0.7 : 1, fontFamily: "var(--font)",
                    transition: "all 0.2s"
                  }}
                >
                  {loading === plan.id ? "Opening..." : isCurrentPlan ? "Current Plan" : `Subscribe to ${plan.name} →`}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: 40 }}>
          <button className="btn btn-ghost" onClick={() => navigate(token ? "/dashboard" : "/")}>← Back</button>
        </div>
      </div>
    </div>
  );
}
