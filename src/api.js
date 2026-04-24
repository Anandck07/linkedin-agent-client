const BASE = import.meta.env.VITE_API_URL || "https://linkedin-agent-server.onrender.com/api";

const headers = (token, isForm = false) => ({
  ...(!isForm && { "Content-Type": "application/json" }),
  ...(token && { Authorization: `Bearer ${token}` })
});

const req = async (method, path, body, token, isForm = false) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000); // 35s for Render cold start
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: headers(token, isForm),
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal
    });
    clearTimeout(timeout);

    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json() : { error: await res.text() };

    if (!res.ok) throw new Error(data.error || `Request failed with status ${res.status}`);
    if (data?.error) throw new Error(data.error);
    return data;
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Server is waking up, please try again in a moment.");
    if (err instanceof TypeError && (err.message.includes("fetch") || err.message.includes("Failed to fetch") || err.message.includes("NetworkError")))
      throw new Error("Cannot reach server. Please try again.");
    throw err;
  }
};

export const api = {
  register: (body) => req("POST", "/auth/register", body),
  login: (body) => req("POST", "/auth/login", body),
  forgotPassword: (email) => req("POST", "/auth/forgot-password", { email }),
  resetPassword: (token, password) => req("POST", "/auth/reset-password", { token, password }),
  getPlans: () => req("GET", "/billing/plans"),
  checkout: (planId, token) => req("POST", "/billing/checkout", { planId }, token),
  verifyPayment: (body, token) => req("POST", "/billing/verify", body, token),
  cancelSubscription: (token) => req("POST", "/billing/cancel", {}, token),
  getMe: (token) => req("GET", "/dashboard/me", null, token),
  getBestTime: (industry, token) => req("GET", `/dashboard/best-time?industry=${encodeURIComponent(industry)}`, null, token),
  saveCredentials: (body, token) => req("POST", "/dashboard/credentials", body, token),
  generate: (topic, token) => req("POST", "/dashboard/generate", { topic }, token),
  generateFromPromptForSchedule: (prompt, token) => req("POST", "/dashboard/schedule/generate-from-prompt", { prompt }, token),
  generateFromImageForSchedule: (form, token) => req("POST", "/dashboard/schedule/generate-from-image", form, token, true),
  getLinkedInAuthUrl: (token) => req("GET", "/dashboard/linkedin/auth", null, token),
  publish: (form, token) => req("POST", "/dashboard/publish", form, token, true),
  schedulePost: (form, token) => req("POST", "/dashboard/schedule", form, token, true),
  scheduleNewPost: (form, token) => req("POST", "/dashboard/schedule/new", form, token, true),
  scheduleNewPostJSON: (body, token) => req("POST", "/dashboard/schedule/new", body, token, false),
  uploadPostImage: (postId, form, token) => req("POST", `/dashboard/posts/${postId}/image`, form, token, true),
  cancelScheduledPost: (postId, token) => req("POST", `/dashboard/schedule/${postId}/cancel`, null, token),
  deletePost: (postId, token) => req("DELETE", `/dashboard/posts/${postId}`, null, token)
};
