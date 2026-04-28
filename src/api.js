const BASE = import.meta.env.VITE_API_URL || "https://linkedin-agent-server.onrender.com/api";

const SERVER_ROOT = BASE.replace(/\/api\/?$/, "");

// Wake up server before any request
const wakeUp = async () => {
  try { await fetch(`${SERVER_ROOT}/ping`, { signal: AbortSignal.timeout(40000) }); } catch {}
};

const headers = (token, isForm = false) => ({
  ...(!isForm && { "Content-Type": "application/json" }),
  ...(token && { Authorization: `Bearer ${token}` })
});

const req = async (method, path, body, token, isForm = false, retry = true) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
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
    if (err.name === "AbortError") {
      // Server was sleeping - wake it up and retry once
      if (retry) {
        await wakeUp();
        return req(method, path, body, token, isForm, false);
      }
      throw new Error("Server is waking up, please try again in a moment.");
    }
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
  getPlans: () => req("GET", "/subscription/plans"),
  applyCoupon: (body, token) => req("POST", "/subscription/apply-coupon", body, token),
  createOrder: (body, token) => req("POST", "/subscription/create-order", body, token),
  verifyPayment: (body, token) => req("POST", "/subscription/verify-payment", body, token),
  getMySubscription: (token) => req("GET", "/subscription/my", null, token),
  // Admin
  adminStats: (token) => req("GET", "/admin/stats", null, token),
  adminUsers: (token) => req("GET", "/admin/users", null, token),
  adminCoupons: (token) => req("GET", "/admin/coupons", null, token),
  adminCreateCoupon: (body, token) => req("POST", "/admin/coupons", body, token),
  adminUpdateCoupon: (id, body, token) => req("PUT", `/admin/coupons/${id}`, body, token),
  adminDeleteCoupon: (id, token) => req("DELETE", `/admin/coupons/${id}`, null, token),
  adminUpdateUserPlan: (id, body, token) => req("PUT", `/admin/users/${id}/plan`, body, token),
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
