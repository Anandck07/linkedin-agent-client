import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import "./Dashboard.css"

const NAV = [
  { id: "generate", icon: "✨", label: "Generate" },
  { id: "schedule", icon: "⏰", label: "Schedule"  },
  { id: "history",  icon: "📋", label: "History"  },
  { id: "settings", icon: "⚙️", label: "Settings"  },
  { id: "billing",  icon: "💳", label: "Upgrade"   },
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
    if (!topic.trim()) return;
    setLoading(true);
    setPost(""); setPostId(null); setStatus(null);
    try {
      const data = await api.generate(topic, token);
      setPost(data.post);
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

  const totalPosts     = me?.posts?.length ?? 0;
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
    <div className="dashboard">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">🤖</div>
            LinkedIn AI
          </div>
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-email">{user?.email}</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ id, icon, label }) => (
            <button
              key={id}
              className={`nav-btn ${tab === id ? "active" : ""}`}
              onClick={() => setTab(id)}
            >
              <span className="nav-btn-icon">{icon}</span>
              {label}
              {id === "history" && totalPosts > 0 && (
                <span className="badge badge-blue" style={{ marginLeft: "auto", fontSize: 10 }}>{totalPosts}</span>
              )}
              {id === "schedule" && scheduledCount > 0 && (
                <span className="badge badge-orange" style={{ marginLeft: "auto", fontSize: 10 }}>{scheduledCount}</span>
              )}
              {id === "settings" && !me?.hasCredentials && (
                <span style={{ marginLeft: "auto", color: "#f59e0b", fontSize: 14 }}>●</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {me?.plan === "free" && (
            <div style={{ marginBottom: 12, padding: "10px 12px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                <span>Free plan</span>
                <span>{me?.postsThisMonth ?? 0} / 5 posts</span>
              </div>
              <div style={{ height: 4, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(((me?.postsThisMonth ?? 0) / 5) * 100, 100)}%`, background: "var(--primary)", borderRadius: 99, transition: "width 0.3s" }} />
              </div>
              <button className="btn btn-primary btn-full btn-sm" style={{ marginTop: 10 }} onClick={() => setTab("billing")}>
                ⬆️ Upgrade Plan
              </button>
            </div>
          )}
          <button className="btn btn-danger btn-full btn-sm" onClick={() => { logout(); navigate("/"); }}>
            ↩ Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main">
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
            <div className="page-header">
              <div className="page-title">✨ Generate Post</div>
              <div className="page-sub">AI agents will craft a viral LinkedIn post for you</div>
            </div>

            {/* Stats */}
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-icon stat-icon-blue">📝</div>
                <div><div className="stat-value">{totalPosts}</div><div className="stat-label">Total Posts</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon stat-icon-green">🚀</div>
                <div><div className="stat-value">{postedCount}</div><div className="stat-label">Published</div></div>
              </div>
              <div className="stat-card" style={{ cursor: "pointer" }} onClick={() => setTab("schedule")}>
                <div className="stat-icon stat-icon-orange">⏰</div>
                <div><div className="stat-value">{scheduledCount}</div><div className="stat-label">Scheduled</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon stat-icon-purple">📄</div>
                <div><div className="stat-value">{draftCount}</div><div className="stat-label">Drafts</div></div>
              </div>
            </div>

            {!me?.hasCredentials && (
              <div className="alert alert-warning">
                ⚠️ Add your API credentials in{" "}
                <span onClick={() => setTab("settings")} style={{ fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>
                  Settings
                </span>{" "}
                to start generating posts.
              </div>
            )}

            <div className="card">
              <div className="card-title">What do you want to post about?</div>
              <div className="card-sub">Enter a topic and our AI agents will do the rest</div>

              <div className="generate-input-row">
                <input
                  className="form-input form-input-lg"
                  placeholder="e.g. My MERN Stack Journey, AI in Healthcare, First Job Experience..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && generate()}
                  disabled={loading}
                />
                <button
                  className="btn btn-primary btn-lg"
                  onClick={generate}
                  disabled={loading || !me?.hasCredentials || !topic.trim()}
                  style={{ minWidth: 160 }}
                >
                  {loading ? <><span className="spinner" /> Generating...</> : "✨ Generate"}
                </button>
              </div>

              {/* Agent Steps shown while loading */}
              {loading && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  {["🪝 Hook", "📝 Content", "#️⃣ Hashtags", "⭐ Quality", "✅ Compliance"].map((a, i) => (
                    <span key={a} className="badge badge-blue" style={{ animation: `pulse 1.5s ${i * 0.2}s infinite` }}>{a}</span>
                  ))}
                </div>
              )}

              {/* Post Output */}
              {post && (
                <div className="post-output">
                  <div className="post-output-header">
                    <span>📄 Generated Post — edit before publishing</span>
                    <span style={{ color: charCount > 3000 ? "var(--red)" : "var(--text-light)" }}>
                      {charCount} chars
                    </span>
                  </div>

                  {selectedPost && (
                    <div style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 13, color: "var(--text-light)" }}>
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
                      {typeof selectedPost.scheduleAttempts === "number" && selectedPost.scheduleAttempts > 0 && (
                        <span> | <strong style={{ color: "#0f172a" }}>Attempts:</strong> {selectedPost.scheduleAttempts}</span>
                      )}
                      {selectedPost.lastScheduleError && (
                        <div style={{ marginTop: 6, color: "var(--red)" }}>
                          Last Error: {selectedPost.lastScheduleError}
                        </div>
                      )}
                    </div>
                  )}

                  <textarea
                    className="form-input"
                    value={post}
                    onChange={(e) => { setPost(e.target.value); setCharCount(e.target.value.length); }}
                    style={{ borderRadius: 0, border: "none", minHeight: 260 }}
                  />

                  <div className="post-output-footer">
                    {/* Image Upload */}
                    {!preview ? (
                      <label style={{ cursor: "pointer" }}>
                        <span className="btn btn-ghost btn-sm">🖼️ Add Image</span>
                        <input type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
                      </label>
                    ) : (
                      <div className="image-preview-wrap">
                        <img src={preview} alt="preview" className="image-preview" />
                        <button className="image-remove" onClick={() => { setImage(null); setPreview(null); }}>✕</button>
                      </div>
                    )}

                    <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {!me?.linkedinConnected ? (
                        <button className="btn btn-primary btn-sm" onClick={connectLinkedIn}>
                          🔗 Connect LinkedIn
                        </button>
                      ) : (
                        <>
                          <button className="btn btn-green btn-sm" onClick={publish} disabled={publishing}>
                            {publishing ? <><span className="spinner" /> Publishing...</> : "🚀 Post to LinkedIn"}
                          </button>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input
                              type="datetime-local"
                              className="form-input"
                              value={scheduleAt}
                              onChange={(e) => setScheduleAt(e.target.value)}
                              style={{ marginTop: 0, width: 220 }}
                            />
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={schedulePost}
                              disabled={scheduling || !postId || !scheduleAt}
                            >
                              {scheduling ? "Scheduling..." : "⏰ Schedule"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
                  try { const d = await api.billingPortal(token); window.location.href = d.url; }
                  catch (err) { setStatus({ type: "error", msg: err.message }); }
                }}>Manage Subscription →</button>
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
                    ${plan.price}<span style={{ fontSize: 14, fontWeight: 400, opacity: 0.7 }}>/mo</span>
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
                    onClick={async () => {
                      if (!plan.priceId) return;
                      setBillingLoading(plan.id);
                      try {
                        const d = await api.checkout(plan.priceId, token);
                        window.location.href = d.url;
                      } catch (err) {
                        setStatus({ type: "error", msg: err.message });
                      } finally { setBillingLoading(null); }
                    }}
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
      </main>
    </div>
  );
}
