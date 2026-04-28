import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function AdminPanel() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("stats");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [couponForm, setCouponForm] = useState({ code: "", discountType: "percentage", discountValue: "", expiryDate: "", usageLimit: 100, applicablePlans: ["pro", "premium"] });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!token) return navigate("/");
    loadStats();
  }, [token]);

  const loadStats = async () => {
    try { setStats(await api.adminStats(token)); } catch { navigate("/"); }
  };

  const loadUsers = async () => {
    const d = await api.adminUsers(token);
    setUsers(d.users);
  };

  const loadCoupons = async () => {
    const d = await api.adminCoupons(token);
    setCoupons(d.coupons);
  };

  useEffect(() => {
    if (tab === "users") loadUsers();
    if (tab === "coupons") loadCoupons();
  }, [tab]);

  const createCoupon = async (e) => {
    e.preventDefault();
    try {
      await api.adminCreateCoupon(couponForm, token);
      setMsg("✅ Coupon created!");
      setCouponForm({ code: "", discountType: "percentage", discountValue: "", expiryDate: "", usageLimit: 100, applicablePlans: ["pro", "premium"] });
      loadCoupons();
    } catch (err) { setMsg("❌ " + err.message); }
  };

  const deleteCoupon = async (id) => {
    if (!confirm("Delete this coupon?")) return;
    await api.adminDeleteCoupon(id, token);
    loadCoupons();
  };

  const updateUserPlan = async (userId, plan) => {
    const expiry = plan === "free" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await api.adminUpdateUserPlan(userId, { plan, planExpiry: expiry }, token);
    loadUsers();
  };

  const tabs = [{ id: "stats", label: "📊 Stats" }, { id: "users", label: "👥 Users" }, { id: "coupons", label: "🎟️ Coupons" }];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "40px 20px", fontFamily: "var(--font)" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>🛡️ Admin Panel</h1>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/dashboard")}>← Dashboard</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`btn ${tab === t.id ? "btn-primary" : "btn-ghost"} btn-sm`}>{t.label}</button>
          ))}
        </div>

        {msg && <div className="alert alert-success" style={{ marginBottom: 20 }}>{msg}<button onClick={() => setMsg("")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer" }}>✕</button></div>}

        {/* Stats Tab */}
        {tab === "stats" && stats && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginBottom: 28 }}>
              {[
                { label: "Total Users", value: stats.totalUsers, icon: "👥" },
                { label: "Active Subscriptions", value: stats.activeSubscriptions, icon: "✅" },
                { label: "Total Revenue", value: `₹${stats.revenue}`, icon: "💰" },
              ].map(s => (
                <div key={s.label} className="card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)" }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title">Plan Distribution</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {stats.planBreakdown?.map(p => (
                  <div key={p._id} style={{ padding: "10px 20px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)" }}>
                    <span style={{ fontWeight: 700, textTransform: "capitalize" }}>{p._id}</span>: {p.count} users
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {tab === "users" && (
          <div className="card">
            <div className="card-title">All Users</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)" }}>
                    {["Name", "Email", "Plan", "Expiry", "Actions"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 12px" }}>{u.name}</td>
                      <td style={{ padding: "10px 12px" }}>{u.email}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span className={`badge ${u.plan === "premium" ? "badge-blue" : u.plan === "pro" ? "badge-orange" : "badge-gray"}`} style={{ textTransform: "capitalize" }}>{u.plan}</span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-muted)" }}>
                        {u.planExpiry ? new Date(u.planExpiry).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <select onChange={e => updateUserPlan(u._id, e.target.value)} value={u.plan}
                          style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 13, fontFamily: "var(--font)" }}>
                          <option value="free">Free</option>
                          <option value="pro">Pro</option>
                          <option value="premium">Premium</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Coupons Tab */}
        {tab === "coupons" && (
          <div>
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-title">Create Coupon</div>
              <form onSubmit={createCoupon}>
                <div className="creds-grid">
                  <div className="form-group">
                    <label className="form-label">Coupon Code</label>
                    <input className="form-input" placeholder="SAVE20" value={couponForm.code} onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Discount Type</label>
                    <select className="form-input" value={couponForm.discountType} onChange={e => setCouponForm({ ...couponForm, discountType: e.target.value })}>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed (₹)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Discount Value</label>
                    <input className="form-input" type="number" placeholder={couponForm.discountType === "percentage" ? "20" : "50"} value={couponForm.discountValue} onChange={e => setCouponForm({ ...couponForm, discountValue: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expiry Date</label>
                    <input className="form-input" type="date" value={couponForm.expiryDate} onChange={e => setCouponForm({ ...couponForm, expiryDate: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Usage Limit</label>
                    <input className="form-input" type="number" value={couponForm.usageLimit} onChange={e => setCouponForm({ ...couponForm, usageLimit: e.target.value })} />
                  </div>
                </div>
                <button className="btn btn-primary" style={{ marginTop: 8 }}>Create Coupon</button>
              </form>
            </div>

            <div className="card">
              <div className="card-title">All Coupons</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {coupons.map(c => (
                  <div key={c._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)" }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 15, marginRight: 12 }}>{c.code}</span>
                      <span className="badge badge-blue">{c.discountType === "percentage" ? `${c.discountValue}% off` : `₹${c.discountValue} off`}</span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 12 }}>Expires: {new Date(c.expiryDate).toLocaleDateString()} | Used: {c.usedCount}/{c.usageLimit}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => api.adminUpdateCoupon(c._id, { isActive: !c.isActive }, token).then(loadCoupons)}
                        className={`btn btn-sm ${c.isActive ? "btn-ghost" : "btn-primary"}`}>
                        {c.isActive ? "Disable" : "Enable"}
                      </button>
                      <button onClick={() => deleteCoupon(c._id)} className="btn btn-danger btn-sm">Delete</button>
                    </div>
                  </div>
                ))}
                {coupons.length === 0 && <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 20 }}>No coupons yet</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
