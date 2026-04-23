import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import "./Dashboard.css"

const NAV = [
  { id: "generate", icon: "✨", label: "Generate" },
  { id: "schedule", icon: "⏰", label: "Schedule"  },
  { id: "history",  icon: "📋", label: "History"  },
  { id: "settings", icon: "⚙️", label: "Settings"  },
];

export default function Dashboard() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("generate");
  const [topic, setTopic] = useState("");
  const [post, setPost] = useState("");
  const [postId, setPostId] = useState(null);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bestTime, setBestTime] = useState(null);
  const [fetchingBestTime, setFetchingBestTime] = useState(false);
  const [expandedDay, setExpandedDay] = useState(null);
  const hasFetchedInitialBestTime = useRef(false);
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState(null); // { type, msg }
  const [creds, setCreds] = useState({
    groqApiKey: "", linkedinClientId: "",
    linkedinClientSecret: "", linkedinRedirectUri: "http://localhost:5000/auth/linkedin/callback"
  });
  const [savingCreds, setSavingCreds] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ content: "", scheduledFor: "" });
  const [scheduleImage, setScheduleImage] = useState(null);
  const [schedulePreview, setSchedulePreview] = useState(null);
  const [creatingSchedule, setCreatingSchedule] = useState(false);
  const [generatingScheduleText, setGeneratingScheduleText] = useState(false);
  const [generatingPromptText, setGeneratingPromptText] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState({});
  const [uploadingImageFor, setUploadingImageFor] = useState(null);
  const [plans, setPlans] = useState([]);
  const [billingLoading, setBillingLoading] = useState(null);

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const handleUpgrade = async (plan) => {
    if (!plan.planId) return;
    setBillingLoading(plan.id);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Failed to load Razorpay.");
      const data = await api.checkout(plan.planId, token);
      const options = {
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "LinkedIn AI Agent",
        description: `${plan.name} Plan - ₹${plan.price}/month`,
        prefill: { name: data.name, email: data.email },
        theme: { color: "#0a66c2" },
        handler: async (response) => {
          try {
            await api.verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
              planType: plan.id,
            }, token);
            setStatus({ type: "success", msg: "🎉 Upgrade successful!" });
            loadMe();
          } catch (err) {
            setStatus({ type: "error", msg: err.message });
          }
        },
      };
      new window.Razorpay(options).open();
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    } finally {
      setBillingLoading(null);
    }
  };

  const loadMe = useCallback(async () => {
    try {
      const meData = await api.getMe(token);
      setMe(meData);
      if (!plans.length) api.getPlans().then((d) => setPlans(d.plans)).catch(() => {});
    }
    catch { logout(); navigate("/"); }
  }, [token, logout, navigate]);

  useEffect(() => {
    if (!token) return navigate("/");
    loadMe();
    const params = new URLSearchParams(window.location.search);
    if (params.get("linkedin") === "connected") {
      setStatus({ type: "success", msg: "🎉 LinkedIn connected successfully!" });
      window.history.replaceState({}, "", "/dashboard");
      loadMe();
    }
    if (params.get("linkedin") === "error") {
      setStatus({ type: "error", msg: "❌ LinkedIn connection failed. Please try again." });
      window.history.replaceState({}, "", "/dashboard");
    }
    if (params.get("upgrade") === "success") {
      setStatus({ type: "success", msg: "🎉 Upgrade successful! Your plan has been updated." });
      setTab("billing");
      window.history.replaceState({}, "", "/dashboard");
      loadMe();
    }
    if (params.get("upgrade") === "cancelled") {
      setStatus({ type: "error", msg: "Upgrade cancelled." });
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [token, navigate, loadMe]);

  useEffect(() => {
    const fetchInitial = async () => {
      if (!me?.hasCredentials || hasFetchedInitialBestTime.current || bestTime) return;
      hasFetchedInitialBestTime.current = true;
      setFetchingBestTime(true);
      try {
        const data = await api.getBestTime("general professional network", token);
        setBestTime(data.bestTime);
      } catch (err) {
        console.error(err);
      } finally {
        setFetchingBestTime(false);
      }
    };
    fetchInitial();
  }, [me?.hasCredentials, token, bestTime]);

  const saveCreds = async (e) => {
    e.preventDefault();
    setSavingCreds(true);
    try {
      await api.saveCredentials(creds, token);
      setStatus({ type: "success", msg: "✅ Credentials saved successfully!" });
      loadMe();
      setTimeout(() => setTab("generate"), 800);
    } catch (err) {
      setStatus({ type: "error", msg: `❌ ${err.message}` });
    } finally { setSavingCreds(false); }
  };

  const generate = async () => {
    const topicToGenerate = post; // Use text area content as the topic/prompt if generating
    if (!topicToGenerate.trim()) return;
    setLoading(true);
    setPostId(null); setStatus(null); setBestTime(null);
    try {
      const data = await api.generate(topicToGenerate, token);
      console.log("DATA FROM BACKEND", data);
      setPost(data.post);
      setBestTime(data.bestTime);
      setPostId(data.postId);
      setCharCount(data.post.length);
      loadMe();
    } catch (err) {
      setStatus({ type: "error", msg: `❌ ${err.message}` });
    } finally { setLoading(false); }
  };

  const connectLinkedIn = async () => {
    try {
      const data = await api.getLinkedInAuthUrl(token);
      window.location.href = data.url;
    } catch (err) {
      setStatus({ type: "error", msg: `❌ ${err.message}` });
    }
  };

  const publish = async () => {
    if (!post || !postId) return;
    setPublishing(true); setStatus(null);
    try {
      const form = new FormData();
      form.append("postId", postId);
      form.append("content", post);
      if (image) form.append("image", image);
      await api.publish(form, token);
      setStatus({ type: "success", msg: "🚀 Posted to LinkedIn successfully!" });
      loadMe();
    } catch (err) {
      setStatus({ type: "error", msg: `❌ ${err.message}` });
    } finally { setPublishing(false); }
  };

  const schedulePost = async () => {
    if (!postId || !scheduleAt) return;

    setScheduling(true);
    setStatus(null);
    try {
      const form = new FormData();
      form.append("postId", postId);
      form.append("content", post);
      form.append("scheduledFor", new Date(scheduleAt).toISOString());
      if (image) form.append("image", image);
      await api.schedulePost(form, token);
      setStatus({ type: "success", msg: "⏰ Post scheduled successfully." });
      setScheduleAt("");
      loadMe();
    } catch (err) {
      setStatus({ type: "error", msg: `❌ ${err.message}` });
    } finally {
      setScheduling(false);
    }
  };

  const createScheduledPost = async (e) => {
    e.preventDefault();
    if (!scheduleForm.content.trim() || !scheduleForm.scheduledFor) return;
    setCreatingSchedule(true); setStatus(null);
    try {
      const form = new FormData();
      form.append("content", scheduleForm.content);
      form.append("scheduledFor", new Date(scheduleForm.scheduledFor).toISOString());
      if (scheduleImage) form.append("image", scheduleImage);
      await api.scheduleNewPost(form, token);
      setStatus({ type: "success", msg: `⏰ Post scheduled for ${new Date(scheduleForm.scheduledFor).toLocaleString()}` });
      setScheduleForm({ content: "", scheduledFor: "" });
      setScheduleImage(null); setSchedulePreview(null);
      loadMe();
    } catch (err) {
      setStatus({ type: "error", msg: `❌ ${err.message}` });
    } finally { setCreatingSchedule(false); }
  };

  const generateScheduleTextFromImage = async () => {
    if (!scheduleImage) {
      setStatus({ type: "error", msg: "❌ Please upload an image first." });
      return;
    }

    setGeneratingScheduleText(true);
    setStatus(null);
    try {
      const form = new FormData();
      form.append("image", scheduleImage);
      form.append("prompt", scheduleForm.content || "");
      const data = await api.generateFromImageForSchedule(form, token);
      setScheduleForm((prev) => ({ ...prev, content: data.post || prev.content }));
      setStatus({ type: "success", msg: "✅ Generated text from image. You can edit it before scheduling." });
    } catch (err) {
      setStatus({ type: "error", msg: `❌ ${err.message}` });
    } finally {
      setGeneratingScheduleText(false);
    }
  };

  const generateScheduleTextFromPrompt = async () => {
    if (!scheduleForm.content?.trim()) {
      setStatus({ type: "error", msg: "❌ Enter prompt text first." });
      return;
    }

    setGeneratingPromptText(true);
    setStatus(null);
    try {
      const data = await api.generateFromPromptForSchedule(scheduleForm.content, token);
      setScheduleForm((prev) => ({ ...prev, content: data.post || prev.content }));
      setStatus({ type: "success", msg: "✅ Generated text from your entered prompt/data." });
    } catch (err) {
      setStatus({ type: "error", msg: `❌ ${err.message}` });
    } finally {
      setGeneratingPromptText(false);
    }
  };

  const handleScheduleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScheduleImage(file);
    setSchedulePreview(URL.createObjectURL(file));
  };

  const cancelSchedule = async (id) => {
    try {
      await api.cancelScheduledPost(id, token);
      setStatus({ type: "success", msg: "Schedule cancelled." });
      loadMe();
    } catch (err) {
      setStatus({ type: "error", msg: `❌ ${err.message}` });
    }
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const deletePost = async (id) => {
    if (!confirm("Delete this post?")) return;
    await api.deletePost(id, token);
    loadMe();
  };

  const togglePostExpanded = (id) => {
    setExpandedPosts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyPostContent = async (content) => {
    try {
      await navigator.clipboard.writeText(content || "");
      setStatus({ type: "success", msg: "Post text copied." });
    } catch {
      setStatus({ type: "error", msg: "Could not copy text." });
    }
  };

  const uploadHistoryImage = async (postId, file) => {
    if (!file) return;
    setUploadingImageFor(postId);
    try {
      const form = new FormData();
      form.append("image", file);
      await api.uploadPostImage(postId, form, token);
      setStatus({ type: "success", msg: "Image updated in history." });
      loadMe();
    } catch (err) {
      setStatus({ type: "error", msg: `❌ ${err.message}` });
    } finally {
      setUploadingImageFor(null);
    }
  };

  // Convert datetime-local value to proper UTC ISO string accounting for local timezone
  const toUTC = (localDateTimeStr) => {
    if (!localDateTimeStr) return null;
    // datetime-local gives "YYYY-MM-DDTHH:mm" in local time
    // new Date() parses it as local time correctly
    return new Date(localDateTimeStr).toISOString();
  };
  const postedCount    = me?.posts?.filter(p => p.postedToLinkedIn).length ?? 0;
  const scheduledCount = me?.posts?.filter(p => ["scheduled","retrying"].includes(p.scheduleStatus)).length ?? 0;
  const draftCount     = totalPosts - postedCount - scheduledCount;
  const initials       = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";
  const selectedPost   = me?.posts?.find((p) => p._id === postId) || null;
  const apiOrigin      = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

  const getLinkedInPostUrl = (post) => {
    if (!post?.linkedinPostUrn) return null;

    if (post.linkedinPostUrn.startsWith("urn:li:")) {
      return `https://www.linkedin.com/feed/update/${encodeURIComponent(post.linkedinPostUrn)}/`;
    }

    if (/^\d+$/.test(post.linkedinPostUrn)) {
      return `https://www.linkedin.com/feed/update/${encodeURIComponent(`urn:li:ugcPost:${post.linkedinPostUrn}`)}/`;
    }

    return null;
  };

  const getPostImageUrl = (imagePath) => {
    if (!imagePath || imagePath === "uploaded") return null;
    if (/^https?:\/\//i.test(imagePath)) return imagePath;
    if (imagePath.startsWith("/uploads/")) return `${apiOrigin}${imagePath}`;
    return `${apiOrigin}/uploads/${imagePath.replace(/^\/+/, "")}`;
  };

  return (
    <div className="li-layout">
      {/* ── Global Top Navbar ── */}
      <nav className="li-global-nav">
        <div className="li-nav-content">
          <div className="li-nav-left">
            <div className="li-logo">
              <span className="li-logo-icon">in</span>
              <span className="li-logo-text">LinkedIn Agent</span>
            </div>
            <div className="li-search">
              <span className="li-search-icon">🔍</span>
              <input type="text" placeholder="Search" />
            </div>
          </div>
          <div className="li-nav-links">
            {NAV.map(({ id, icon, label }) => (
              <button
                key={id}
                className={`li-nav-item ${tab === id ? "active" : ""}`}
                onClick={() => setTab(id)}
              >
                <span className="li-nav-icon">{icon}</span>
                <span className="li-nav-label">{label}</span>
                {id === "history" && totalPosts > 0 && <span className="li-nav-badge blue">{totalPosts}</span>}
                {id === "schedule" && scheduledCount > 0 && <span className="li-nav-badge orange">{scheduledCount}</span>}
                {id === "settings" && !me?.hasCredentials && <span className="li-nav-dot"></span>}
              </button>
            ))}
            <div className="li-nav-divider"></div>
            <button className="li-nav-item" onClick={() => { logout(); navigate("/"); }}>
              <div className="li-nav-avatar">{initials}</div>
              <span className="li-nav-label">Me ▼</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main Container (3-column) ── */}
      <div className="li-main-container">
        {/* Left Column */}
        <aside className="li-left-sidebar">
          <div className="li-profile-card">
            <div className="li-profile-bg"></div>
            <div className="li-profile-info">
              <div className="li-profile-avatar-lg">{initials}</div>
              <div className="li-profile-name">{user?.name}</div>
              <div className="li-profile-headline">{me?.plan === "pro" ? "Pro Member • LinkedIn AI Agent" : "LinkedIn AI Agent User"}</div>
            </div>
            <div className="li-profile-stats">
              <div className="li-stat-row">
                <span>Posts Generated</span>
                <strong>{totalPosts}</strong>
              </div>
              <div className="li-stat-row" onClick={() => setTab("history")} style={{ cursor: "pointer" }}>
                <span>Published</span>
                <strong>{postedCount}</strong>
              </div>
            </div>
          </div>

          <div className="li-profile-card" style={{ marginTop: 16 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #e0dfdc" }}>
              <div style={{ fontSize: 13, fontWeight: "600", color: "rgba(0,0,0,0.9)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Real-Time Peak Timing</span>
                <span style={{ fontSize: "16px" }}>🔥</span>
              </div>
            </div>
            <div style={{ padding: "12px 16px" }}>
               {fetchingBestTime ? (
                 <div style={{ fontSize: 12, color: "rgba(0,0,0,0.6)", lineHeight: "1.5" }}>
                    <span style={{ display: "block", marginBottom: 4 }}>Connecting to Real-time API...</span>
                    <div style={{ background: "#e0dfdc", height: 8, borderRadius: 4, width: "100%", marginBottom: 4, animation: "pulse 1.5s infinite" }}></div>
                    <div style={{ background: "#e0dfdc", height: 8, borderRadius: 4, width: "80%", marginBottom: 4, animation: "pulse 1.5s 0.2s infinite" }}></div>
                    <div style={{ background: "#e0dfdc", height: 8, borderRadius: 4, width: "60%", animation: "pulse 1.5s 0.4s infinite" }}></div>
                 </div>
               ) : bestTime ? (
                 <div style={{ fontSize: 12, color: "rgba(0,0,0,0.9)", lineHeight: "1.6" }}>
                   <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                     {bestTime.split("\n").filter(line => line.trim().length > 0 && line.includes("|")).map((line, i, arr) => {
                       let cleanText = line.replace(/^-\s*/, "").replace(/^\*\s*/, "").replace(/^\d+\.\s*/, "").trim();
                       let [dayTimeStr, detailStr] = cleanText.split("|");
                       if (dayTimeStr && detailStr) {
                          let parts = dayTimeStr.split(":");
                          let day = parts[0].trim();
                          let rest = parts.slice(1).join(":").trim();
                          let isHigh = detailStr.toLowerCase().includes("high") || detailStr.toLowerCase().includes("peak") || detailStr.toLowerCase().includes("spike");
                          let isExpanded = expandedDay === i;
                          return (
                            <li key={i} style={{ borderBottom: i !== arr.length - 1 ? "1px solid #f3f2ef" : "none" }}>
                              <div 
                                onClick={() => setExpandedDay(isExpanded ? null : i)}
                                style={{ padding: "8px 0", display: "flex", alignItems: "flex-start", cursor: "pointer", userSelect: "none" }}
                              >
                                <strong style={{ color: isHigh ? "#d97706" : "rgba(0,0,0,0.9)", minWidth: "40px", display: "inline-block" }}>{day}:</strong>
                                <span style={{ color: isHigh ? "#b45309" : "rgba(0,0,0,0.7)", marginLeft: 6, flex: 1 }}>
                                  {rest} {isHigh ? " 🔥" : ""}
                                </span>
                                <span style={{ marginLeft: "auto", fontSize: "10px", color: "#ccc", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
                              </div>
                              {isExpanded && (
                                <div style={{ padding: "0 8px 12px 46px", fontSize: "11px", color: "rgba(0,0,0,0.6)", lineHeight: "1.4" }}>
                                  {detailStr.trim()}
                                </div>
                              )}
                            </li>
                          );
                       }
                       return null;
                     })}
                   </ul>
                 </div>
               ) : (
                 <div style={{ fontSize: 12, color: "rgba(0,0,0,0.6)", lineHeight: "1.5" }}>
                   <ul style={{ paddingLeft: 16, margin: "0 0 10px 0", color: "rgba(0,0,0,0.7)", lineHeight: "1.6" }}>
                     <li><strong>Mon:</strong> Afternoons / Low</li>
                     <li><strong style={{ color: "#d97706" }}>Tue: 10:00 AM - 11:00 AM 🔥</strong></li>
                     <li><strong style={{ color: "#d97706" }}>Wed: 10:00 AM - 12:00 PM 🔥</strong></li>
                     <li><strong style={{ color: "#d97706" }}>Thu: 10:00 AM - 1:00 PM 🔥</strong></li>
                     <li><strong>Fri:</strong> Variable</li>
                     <li><strong>Sat-Sun:</strong> Lowest / Ineffective</li>
                   </ul>
                 </div>
               )}
            </div>
          </div>
        </aside>

        {/* Center Column */}
        <main className="li-feed">
          {/* Status Alert */}
          {status && (
            <div className={`alert alert-${status.type}`}>
              {status.msg}
              <button onClick={() => setStatus(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "inherit" }}>✕</button>
            </div>
          )}

        {/* ── Generate Tab ── */}
        {tab === "generate" && (
          <div className="fade-in">
            {/* Page Header omitted to match LinkedIn's simpler feed */}

            {!me?.hasCredentials && (
              <div className="alert alert-warning">
                ⚠️ Add your API credentials in{" "}
                <span onClick={() => setTab("settings")} style={{ fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>
                  Settings
                </span>{" "}
                to start generating posts.
              </div>
            )}

            <div className="generate-split-layout">
              {/* === CENTER PANE: Editor (acting as 'Start a post') === */}
              <div className="generate-left-pane">
                {/* Manually Write / Edit Post with AI Generation */}
                <div className="card post-editor-card" style={{ marginTop: 0, overflow: 'hidden' }}>
                  <div className="post-editor-header">
                    <span style={{ fontWeight: 600, fontSize: 15 }}>📝 Post Editor</span>
                    <span style={{ color: charCount > 3000 ? "var(--red)" : "var(--text-light)", fontSize: 13 }}>
                      {charCount} / 3000 chars
                    </span>
                  </div>

                  {selectedPost && (
                    <div style={{ padding: "8px 16px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, color: "var(--text-light)" }}>
                      <strong style={{ color: "#0f172a" }}>Status:</strong>{" "}
                      {selectedPost.postedToLinkedIn
                        ? "Published"
                        : selectedPost.scheduleStatus === "scheduled"
                          ? "Scheduled"
                          : selectedPost.scheduleStatus === "retrying"
                            ? "Retrying"
                            : selectedPost.scheduleStatus === "failed"
                              ? "Failed"
                              : "Draft"}
                      {selectedPost.scheduledFor && (
                        <span> | <strong style={{ color: "#0f172a" }}>Scheduled For:</strong> {new Date(selectedPost.scheduledFor).toLocaleString()}</span>
                      )}
                    </div>
                  )}

                  <div className="post-editor-body">
                    {loading && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                        {["🪝 Hook", "📝 Content", "#️⃣ Hashtags", "⭐ Quality", "✅ Compliance"].map((a, i) => (
                          <span key={a} className="badge badge-blue" style={{ animation: `pulse 1.5s ${i * 0.2}s infinite` }}>{a}</span>
                        ))}
                      </div>
                    )}

                    <textarea
                      className="form-input"
                      placeholder="Write your post here... Or type a topic and click '✨ Generate AI' below to magically write it for you!"
                      value={post}
                      onChange={(e) => { setPost(e.target.value); setCharCount(e.target.value.length); }}
                      style={{ borderRadius: "8px", border: "1px solid var(--border)", minHeight: 220, marginTop: 0 }}
                    />
                    
                    {preview && (
                      <div className="image-preview-wrap" style={{ marginTop: 12 }}>
                        <img src={preview} alt="preview" className="image-preview" />
                        <button className="image-remove" onClick={() => { setImage(null); setPreview(null); }}>✕</button>
                      </div>
                    )}
                  </div>

                  <div className="post-editor-footer">
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={generate}
                        disabled={loading || !me?.hasCredentials || !post.trim()}
                        style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))", border: "none" }}
                      >
                        {loading ? <><span className="spinner" /> Generating...</> : "✨ Generate AI"}
                      </button>

                      <label style={{ cursor: "pointer" }}>
                        <span className="btn btn-ghost btn-sm">🖼️ {preview ? "Change Image" : "Add Image"}</span>
                        <input type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
                      </label>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {!me?.linkedinConnected ? (
                        <button className="btn btn-primary btn-sm" onClick={connectLinkedIn}>
                          🔗 Connect LinkedIn
                        </button>
                      ) : (
                        <>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <input
                              type="datetime-local"
                              className="form-input"
                              value={scheduleAt}
                              onChange={(e) => setScheduleAt(e.target.value)}
                              style={{ width: "170px", padding: "7px 10px", fontSize: "13px", marginTop: 0 }}
                            />
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={schedulePost}
                              disabled={scheduling || !postId || !scheduleAt || !post.trim()}
                              title="Schedule Post"
                            >
                              {scheduling ? "..." : "⏰ Schedule"}
                            </button>
                          </div>
                          <button className="btn btn-green btn-sm" onClick={publish} disabled={publishing || !post.trim()}>
                            {publishing ? <><span className="spinner" /> Posting...</> : "🚀 Publish Now"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* === RIGHT PANE: Live Preview === */}
              <div className="generate-right-pane">
                <div className="linkedin-post-card">
                  <div className="lp-header">
                    <div className="lp-avatar">{initials}</div>
                    <div className="lp-meta">
                      <div className="lp-name">{user?.name || "LinkedIn User"}</div>
                      <div className="lp-headline">{me?.plan === "pro" ? "Pro Member • LinkedIn AI Agent" : "LinkedIn AI Agent User"}</div>
                      <div className="lp-time">Just now • <span style={{ fontSize: 10 }}>🌐</span></div>
                    </div>
                    <div className="lp-options">•••</div>
                  </div>
                  <div className="lp-body">
                    {post ? (
                      <p>{post}</p>
                    ) : (
                      <p style={{ color: "rgba(0,0,0,0.6)", fontSize: "14px", margin: 0 }}>Your post preview will appear here.</p>
                    )}
                    
                    {preview && (
                        <div className="lp-image-container">
                          <img src={preview} alt="Post embedded media" />
                        </div>
                    )}
                  </div>
                  <div className="lp-stats">
                    <span className="lp-stat-likes">👍❤️ 0</span>
                    <span className="lp-stat-comments">0 comments • 0 reposts</span>
                  </div>
                  <div className="lp-divider" />
                  <div className="lp-footer">
                    <button className="lp-action"><span className="lp-icon">👍</span> Like</button>
                    <button className="lp-action"><span className="lp-icon">💬</span> Comment</button>
                    <button className="lp-action"><span className="lp-icon">🔁</span> Repost</button>
                    <button className="lp-action"><span className="lp-icon">✈️</span> Send</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Schedule Tab ── */}
        {tab === "schedule" && (
          <div className="fade-in">
            <div className="page-header">
              <div className="page-title">⏰ Schedule Post</div>
              <div className="page-sub">Write your post, add a photo, pick a date & time — we'll publish it automatically</div>
            </div>

            {!me?.linkedinConnected && (
              <div className="alert alert-warning">
                ⚠️ Connect LinkedIn in{" "}
                <span onClick={() => setTab("settings")} style={{ fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>Settings</span>{" "}
                before scheduling.
              </div>
            )}

            {/* Create Schedule Form */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-title">📝 Create Scheduled Post</div>
              <div className="card-sub">Your post will be automatically published at the selected date and time</div>

              <form onSubmit={createScheduledPost}>
                {/* Text Content */}
                <div className="form-group">
                  <label className="form-label">Prompt / Post Content</label>
                  <textarea
                    className="form-input"
                    placeholder="Write prompt or post text. Example: Build a motivational post from this image about coding consistency."
                    value={scheduleForm.content}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, content: e.target.value })}
                    style={{ minHeight: 180 }}
                    required
                  />
                  <div style={{ textAlign: "right", fontSize: 12, color: scheduleForm.content.length > 3000 ? "var(--red)" : "var(--text-light)", marginTop: 4 }}>
                    {scheduleForm.content.length} / 3000
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={generateScheduleTextFromPrompt}
                      disabled={generatingPromptText || !scheduleForm.content.trim()}
                    >
                      {generatingPromptText ? "Generating..." : "✨ Generate from Entered Prompt"}
                    </button>
                  </div>
                </div>

                {/* Image Upload */}
                <div className="form-group">
                  <label className="form-label">🖼️ Photo (optional)</label>
                  {!schedulePreview ? (
                    <label className="schedule-upload-area">
                      <div className="schedule-upload-icon">🖼️</div>
                      <div className="schedule-upload-text">Click to upload image</div>
                      <div className="schedule-upload-sub">PNG, JPG, WEBP up to 5MB</div>
                      <input type="file" accept="image/*" onChange={handleScheduleImage} style={{ display: "none" }} />
                    </label>
                  ) : (
                    <div className="schedule-preview-wrap">
                      <img src={schedulePreview} alt="preview" className="schedule-preview-img" />
                      <button type="button" className="schedule-preview-remove" onClick={() => { setScheduleImage(null); setSchedulePreview(null); }}>
                        ✕ Remove
                      </button>
                    </div>
                  )}
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={generateScheduleTextFromImage}
                      disabled={generatingScheduleText || !scheduleImage}
                    >
                      {generatingScheduleText ? "Generating..." : "✨ Generate Text from Image + Prompt"}
                    </button>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="form-group">
                  <label className="form-label">📅 Schedule Date & Time</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={scheduleForm.scheduledFor}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledFor: e.target.value })}
                    required
                  />
                  {scheduleForm.scheduledFor && (
                    <div className="schedule-time-preview">
                      📅 Will post on: <strong>{new Date(scheduleForm.scheduledFor).toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</strong>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingSchedule || !me?.linkedinConnected || !scheduleForm.content.trim() || !scheduleForm.scheduledFor}
                >
                  {creatingSchedule ? <><span className="spinner" /> Scheduling...</> : "⏰ Schedule Post"}
                </button>
              </form>
            </div>

            {/* Scheduled Posts List */}
            <div className="card">
              <div className="card-title">🗓️ Upcoming Scheduled Posts</div>
              <div className="card-sub">{scheduledCount} post{scheduledCount !== 1 ? "s" : ""} waiting to be published</div>

              {scheduledCount === 0 ? (
                <div className="empty-state" style={{ padding: "32px 0" }}>
                  <div className="empty-state-icon">🗓️</div>
                  <div className="empty-state-title">No scheduled posts</div>
                  <div className="empty-state-sub">Create one above to get started</div>
                </div>
              ) : (
                <div className="scheduled-list">
                  {me.posts
                    .filter(p => ["scheduled", "retrying", "failed"].includes(p.scheduleStatus))
                    .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))
                    .map((p) => (
                      <div className="scheduled-item" key={p._id}>
                        <div className="scheduled-item-left">
                          <div className="scheduled-item-time">
                            <span className="scheduled-item-date">{new Date(p.scheduledFor).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                            <span className="scheduled-item-clock">{new Date(p.scheduledFor).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <div className="scheduled-item-content">{p.content.slice(0, 100)}{p.content.length > 100 ? "..." : ""}</div>
                          {p.scheduleStatus === "retrying" && (
                            <div className="scheduled-item-retry">🔄 Retrying — attempt {p.scheduleAttempts}</div>
                          )}
                          {p.scheduleStatus === "failed" && (
                            <div className="scheduled-item-error">❌ Failed: {p.lastScheduleError}</div>
                          )}
                        </div>
                        <div className="scheduled-item-right">
                          <span className={`badge ${
                            p.scheduleStatus === "scheduled" ? "badge-orange" :
                            p.scheduleStatus === "retrying"  ? "badge-blue"   : "badge-red"
                          }`}>
                            {p.scheduleStatus === "scheduled" ? "⏰ Scheduled" :
                             p.scheduleStatus === "retrying"  ? "🔄 Retrying"  : "❌ Failed"}
                          </span>
                          {["scheduled", "retrying"].includes(p.scheduleStatus) && (
                            <button className="btn btn-danger btn-sm" style={{ marginTop: 8 }} onClick={() => cancelSchedule(p._id)}>
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── History Tab ── */}
        {tab === "history" && (
          <div className="fade-in">
            <div className="page-header">
              <div className="page-title">📋 Post History</div>
              <div className="page-sub">{totalPosts} posts generated</div>
            </div>

            <div className="history-summary-row">
              <div className="history-summary-card">
                <div className="history-summary-label">Generated</div>
                <div className="history-summary-value">{totalPosts}</div>
              </div>
              <div className="history-summary-card">
                <div className="history-summary-label">Published</div>
                <div className="history-summary-value">{postedCount}</div>
              </div>
              <div className="history-summary-card">
                <div className="history-summary-label">Scheduled</div>
                <div className="history-summary-value">{scheduledCount}</div>
              </div>
              <div className="history-summary-card">
                <div className="history-summary-label">Draft</div>
                <div className="history-summary-value">{draftCount}</div>
              </div>
            </div>

            {!me?.posts?.length ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon">📭</div>
                  <div className="empty-state-title">No posts yet</div>
                  <div className="empty-state-sub">Generate your first LinkedIn post to see it here</div>
                  <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setTab("generate")}>
                    ✨ Generate First Post
                  </button>
                </div>
              </div>
            ) : (
              <div className="history-grid">
                {me.posts.map((p) => (
                  <div className="post-card" key={p._id}>
                    <div className="post-card-header">
                      <div>
                        <div className="post-card-topic">📌 {p.topic || "Manual post"}</div>
                        <div className="post-card-date">Created: {new Date(p.createdAt).toLocaleString()}</div>
                      </div>
                      <span className={`badge ${p.postedToLinkedIn ? "badge-green" : p.scheduleStatus === "scheduled" || p.scheduleStatus === "retrying" ? "badge-blue" : p.scheduleStatus === "failed" ? "badge-red" : "badge-gray"}`}>
                        {p.postedToLinkedIn
                          ? "✅ Published"
                          : p.scheduleStatus === "scheduled"
                            ? "⏰ Scheduled"
                            : p.scheduleStatus === "retrying"
                              ? "🔁 Retrying"
                              : p.scheduleStatus === "failed"
                                ? "❌ Failed"
                                : "Draft"}
                      </span>
                    </div>

                    <div className="post-card-body-grid">
                      <div className="post-card-main">
                        <div className="history-box history-content-box">
                          <div className="history-box-title">Generated Text</div>
                          <div className="post-card-preview">
                            {expandedPosts[p._id] || (p.content?.trim() || "").length <= 280
                              ? (p.content?.trim() || "No generated text available for this post.")
                              : `${(p.content?.trim() || "").slice(0, 280)}...`}
                          </div>
                          <div className="history-content-actions">
                            {(p.content?.trim() || "").length > 280 && (
                              <button className="btn btn-ghost btn-sm" onClick={() => togglePostExpanded(p._id)}>
                                {expandedPosts[p._id] ? "Show less" : "Show more"}
                              </button>
                            )}
                            <button className="btn btn-ghost btn-sm" onClick={() => copyPostContent(p.content?.trim() || "")}>Copy Text</button>
                          </div>
                        </div>

                        {getPostImageUrl(p.image) && (
                          <div className="history-box">
                            <div className="history-box-title">Image</div>
                            <img
                              src={getPostImageUrl(p.image)}
                              alt="post"
                              className="post-card-image"
                            />
                          </div>
                        )}
                        {!getPostImageUrl(p.image) && (
                          <div className="history-box history-empty-image-box">
                            <div className="history-box-title">Image</div>
                            <div className="history-side-text">No image added yet.</div>
                          </div>
                        )}
                      </div>

                      <div className="post-card-side">
                        <div className="history-box history-side-box">
                          <div className="history-box-title">Prompt</div>
                          <div className="history-side-text">{p.topic || "Manual post"}</div>
                        </div>

                        <div className="history-box history-side-box">
                          <div className="history-box-title">Timeline</div>
                          <div className="history-side-text">Created: {new Date(p.createdAt).toLocaleString()}</div>
                          {p.publishedAt && <div className="history-side-text">Published: {new Date(p.publishedAt).toLocaleString()}</div>}
                          {p.scheduledFor && <div className="history-side-text">Scheduled: {new Date(p.scheduledFor).toLocaleString()}</div>}
                        </div>

                        {p.postedToLinkedIn && (
                          <div className="history-box history-side-box">
                            <div className="history-box-title">Engagement</div>
                            <div className="history-metrics-row">
                              <span className="history-metric-pill">👍 {p.likesCount ?? 0}</span>
                              <span className="history-metric-pill">💬 {p.commentsCount ?? 0}</span>
                            </div>
                          </div>
                        )}

                        {(p.scheduleStatus === "scheduled" || p.scheduleStatus === "retrying" || p.scheduleStatus === "failed") && (
                          <div className="history-box history-side-box">
                            <div className="history-box-title">Schedule Status</div>
                            {p.scheduledFor && <div className="history-side-text">{new Date(p.scheduledFor).toLocaleString()}</div>}
                            {p.lastScheduleError && p.scheduleStatus === "failed" && (
                              <div className="history-schedule-error">{p.lastScheduleError}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="post-card-footer">
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => { setPost(p.content); setPostId(p._id); setTab("generate"); }}
                        >
                          ✏️ Edit & Publish
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => deletePost(p._id)}>
                          🗑️ Delete
                        </button>
                        {p.postedToLinkedIn && getLinkedInPostUrl(p) && (
                          <a
                            className="btn btn-primary btn-sm"
                            href={getLinkedInPostUrl(p)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            🔗 Open in LinkedIn
                          </a>
                        )}
                        {(p.scheduleStatus === "scheduled" || p.scheduleStatus === "retrying") && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={async () => {
                              try {
                                await api.cancelScheduledPost(p._id, token);
                                setStatus({ type: "success", msg: "Schedule cancelled." });
                                loadMe();
                              } catch (err) {
                                setStatus({ type: "error", msg: `❌ ${err.message}` });
                              }
                            }}
                          >
                            Cancel Schedule
                          </button>
                        )}
                        <label className="btn btn-ghost btn-sm" style={{ display: "inline-flex", alignItems: "center" }}>
                          {uploadingImageFor === p._id ? "Uploading..." : "Add/Replace Image"}
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            disabled={uploadingImageFor === p._id}
                            onChange={(e) => uploadHistoryImage(p._id, e.target.files?.[0])}
                          />
                        </label>
                      </div>
                      <span style={{ fontSize: 12, color: "var(--text-light)" }}>
                        {(p.content || "").length} chars
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Settings Tab ── */}
        {tab === "settings" && (
          <div className="fade-in">
            <div className="page-header">
              <div className="page-title">⚙️ Settings</div>
              <div className="page-sub">Your credentials are stored securely per account</div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-title">🔑 API Credentials</div>
              <div className="card-sub">Each user has their own isolated keys — never shared</div>

              {/* Step by step guide */}
              <div className="settings-guide">
                <div className="settings-guide-title">📖 How to get your credentials</div>

                <div className="settings-step">
                  <div className="settings-step-num">1</div>
                  <div>
                    <div className="settings-step-title">Groq API Key</div>
                    <div className="settings-step-desc">
                      Go to <a href="https://console.groq.com" target="_blank" rel="noreferrer">console.groq.com</a> → Sign up → Click <strong>API Keys</strong> → <strong>Create API Key</strong> → Copy the key starting with <code>gsk_...</code>
                    </div>
                  </div>
                </div>

                <div className="settings-step">
                  <div className="settings-step-num">2</div>
                  <div>
                    <div className="settings-step-title">LinkedIn Client ID &amp; Secret</div>
                    <div className="settings-step-desc">
                      Go to <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noreferrer">linkedin.com/developers/apps</a> → <strong>Create App</strong> → Fill name &amp; logo → Go to <strong>Auth</strong> tab → Copy <strong>Client ID</strong> and <strong>Client Secret</strong>
                    </div>
                  </div>
                </div>

                <div className="settings-step">
                  <div className="settings-step-num">3</div>
                  <div>
                    <div className="settings-step-title">LinkedIn Redirect URI</div>
                    <div className="settings-step-desc">
                      In your LinkedIn App → <strong>Auth</strong> tab → <strong>OAuth 2.0 settings</strong> → Add this exact URL as redirect URI:
                      <div className="settings-copy-box">
                        <code>https://linkedin-agent-client-git-main-anands-projects-d6093bf1.vercel.app/auth/linkedin/callback</code>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText("https://linkedin-agent-client-git-main-anands-projects-d6093bf1.vercel.app/auth/linkedin/callback"); setStatus({ type: "success", msg: "✅ Redirect URI copied!" }); }}>Copy</button>
                      </div>
                      Then paste the same URL in the field below.
                    </div>
                  </div>
                </div>

                <div className="settings-step">
                  <div className="settings-step-num">4</div>
                  <div>
                    <div className="settings-step-title">LinkedIn App Permissions</div>
                    <div className="settings-step-desc">
                      In your LinkedIn App → <strong>Products</strong> tab → Request access to:
                      <ul className="settings-step-list">
                        <li>✅ <strong>Sign In with LinkedIn using OpenID Connect</strong></li>
                        <li>✅ <strong>Share on LinkedIn</strong> (gives <code>w_member_social</code>)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="settings-step">
                  <div className="settings-step-num">5</div>
                  <div>
                    <div className="settings-step-title">LinkedIn Connection</div>
                    <div className="settings-step-desc">
                      After saving all credentials above → scroll down to the <strong>LinkedIn Connection</strong> section below → click <strong>Connect →</strong> button → login with your LinkedIn account → allow permissions → you will be redirected back and see <strong>✅ Connected</strong>.
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={saveCreds}>
                <div className="creds-grid">
                  {[
                    ["groqApiKey",           "Groq API Key",          "gsk_...",                                                                                                                          true ],
                    ["linkedinClientId",     "LinkedIn Client ID",    "86xxx...",                                                                                                                         false],
                    ["linkedinClientSecret", "LinkedIn Client Secret", "WPL_...",                                                                                                                        true ],
                    ["linkedinRedirectUri",  "LinkedIn Redirect URI", "https://linkedin-agent-client-git-main-anands-projects-d6093bf1.vercel.app/auth/linkedin/callback", false],
                  ].map(([key, label, ph, secret]) => (
                    <div className="form-group" key={key}>
                      <label className="form-label">
                        {label}
                        {me?.savedFields?.[key] && (
                          <span style={{ marginLeft: 8, color: "var(--green)", fontWeight: 400, fontSize: 12 }}>✅ Saved</span>
                        )}
                      </label>
                      <input
                        className="form-input"
                        placeholder={me?.savedFields?.[key] ? "Leave blank to keep existing value" : ph}
                        value={creds[key]}
                        type={secret ? "password" : "text"}
                        onChange={(e) => setCreds({ ...creds, [key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary" disabled={savingCreds} style={{ marginTop: 8 }}>
                  {savingCreds ? <><span className="spinner" /> Saving...</> : "💾 Save Credentials"}
                </button>
              </form>
            </div>

            {/* LinkedIn Connection */}
            <div className="card">
              <div className="card-title">🔗 LinkedIn Connection</div>
              <div className="card-sub">Connect your LinkedIn account to enable auto-publishing</div>

              <div className="linkedin-banner">
                <div className="linkedin-banner-info">
                  <div className="linkedin-banner-icon">in</div>
                  <div>
                    <div className="linkedin-banner-title">LinkedIn Account</div>
                    <div className="linkedin-banner-sub">
                      {me?.linkedinConnected ? "Connected and ready to publish" : "Not connected yet"}
                    </div>
                  </div>
                </div>
                {me?.linkedinConnected ? (
                  <span className="badge badge-green">✅ Connected</span>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={connectLinkedIn}
                    disabled={!me?.hasCredentials}
                  >
                    Connect →
                  </button>
                )}
              </div>

              {!me?.hasCredentials && (
                <div className="alert alert-warning" style={{ marginTop: 16, marginBottom: 0 }}>
                  ⚠️ Save your LinkedIn credentials above before connecting.
                </div>
              )}
            </div>
          </div>
        )}
        {/* Billing Tab */}
        {tab === "billing" && (
          <div className="fade-in">
            <div className="page-header">
              <div className="page-title">💳 Plans & Billing</div>
              <div className="page-sub">You are on the <strong>{me?.plan || "free"}</strong> plan · {me?.postsThisMonth ?? 0} posts used this month</div>
            </div>

            <div className="card" style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Current Plan: <span style={{ color: "var(--primary)", textTransform: "capitalize" }}>{me?.plan || "free"}</span></div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                  {me?.plan === "free" ? `${me?.postsThisMonth ?? 0} / 5 posts used this month` : "Unlimited posts & scheduling"}
                </div>
              </div>
              {me?.plan !== "free" && (
                <button className="btn btn-ghost btn-sm" onClick={async () => {
                  if (!confirm("Cancel your subscription? You'll be downgraded to Free.")) return;
                  try {
                    await api.cancelSubscription(token);
                    setStatus({ type: "success", msg: "Subscription cancelled. You are now on Free plan." });
                    loadMe();
                  } catch (err) { setStatus({ type: "error", msg: err.message }); }
                }}>Cancel Subscription</button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
              {plans.map((plan) => (
                <div key={plan.id} style={{
                  background: plan.id === "pro" ? "var(--primary)" : "#fff",
                  color: plan.id === "pro" ? "#fff" : "var(--text)",
                  border: `2px solid ${plan.id === "pro" ? "var(--primary)" : "var(--border)"}`,
                  borderRadius: 16, padding: "28px 24px", position: "relative",
                  boxShadow: plan.id === "pro" ? "0 8px 32px rgba(10,102,194,0.25)" : "var(--shadow-sm)",
                  transform: plan.id === "pro" ? "scale(1.03)" : "none",
                }}>
                  {plan.id === "pro" && (
                    <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: "#f59e0b", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 99 }}>POPULAR</div>
                  )}
                  <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{plan.name}</div>
                  <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 4 }}>
                    ₹{plan.price}<span style={{ fontSize: 14, fontWeight: 400, opacity: 0.7 }}>/mo</span>
                  </div>
                  <div style={{ height: 1, background: plan.id === "pro" ? "rgba(255,255,255,0.2)" : "var(--border)", margin: "16px 0" }} />
                  <ul style={{ listStyle: "none", padding: 0, marginBottom: 24, display: "flex", flexDirection: "column", gap: 8 }}>
                    {plan.features.map((f) => (
                      <li key={f} style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: plan.id === "pro" ? "#86efac" : "var(--green)", fontWeight: 700 }}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    disabled={me?.plan === plan.id || plan.id === "free" || billingLoading === plan.id}
                    onClick={() => handleUpgrade(plan)}
                    style={{
                      width: "100%", padding: "11px", borderRadius: 8, border: "none",
                      fontWeight: 700, fontSize: 14,
                      cursor: me?.plan === plan.id || plan.id === "free" ? "default" : "pointer",
                      background: plan.id === "pro" ? "#fff" : plan.id === "free" ? "var(--bg)" : "var(--primary)",
                      color: plan.id === "pro" ? "var(--primary)" : plan.id === "free" ? "var(--text-muted)" : "#fff",
                      opacity: me?.plan === plan.id || plan.id === "free" ? 0.6 : 1,
                      fontFamily: "var(--font)",
                    }}
                  >
                    {billingLoading === plan.id ? "Redirecting..." :
                     me?.plan === plan.id ? "✅ Current Plan" :
                     plan.id === "free" ? "Free Plan" :
                     `Upgrade to ${plan.name} →`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* ── End of Main ── */}
        </main>
      </div>
    </div>
  );
}
