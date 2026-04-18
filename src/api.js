const BASE = "https://linkedin-agent-server.onrender.com/api";

const headers = (token, isForm = false) => ({
  ...(!isForm && { "Content-Type": "application/json" }),
  ...(token && { Authorization: `Bearer ${token}` })
});

const req = async (method, path, body, token, isForm = false) => {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: headers(token, isForm),
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined
    });

    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json() : { error: await res.text() };

    if (!res.ok) {
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }

    if (data?.error) throw new Error(data.error);
    return data;
  } catch (err) {
    if (err instanceof TypeError && /fetch/i.test(err.message)) {
      throw new Error("Cannot reach server. Please try again.");
    }
    throw err;
  }
};

export const api = {
  register: (body) => req("POST", "/auth/register", body),
  login: (body) => req("POST", "/auth/login", body),
  forgotPassword: (email) => req("POST", "/auth/forgot-password", { email }),
  resetPassword: (token, password) => req("POST", "/auth/reset-password", { token, password }),
  getPlans: () => req("GET", "/billing/plans"),
  checkout: (priceId, token) => req("POST", "/billing/checkout", { priceId }, token),
  billingPortal: (token) => req("POST", "/billing/portal", {}, token),
  getMe: (token) => req("GET", "/dashboard/me", null, token),
  saveCredentials: (body, token) => req("POST", "/dashboard/credentials", body, token),
  generate: (topic, token) => req("POST", "/dashboard/generate", { topic }, token),
  generateFromPromptForSchedule: (prompt, token) => req("POST", "/dashboard/schedule/generate-from-prompt", { prompt }, token),
  generateFromImageForSchedule: (form, token) => req("POST", "/dashboard/schedule/generate-from-image", form, token, true),
  getLinkedInAuthUrl: (token) => req("GET", "/dashboard/linkedin/auth", null, token),
  publish: (form, token) => req("POST", "/dashboard/publish", form, token, true),
  schedulePost: (form, token) => req("POST", "/dashboard/schedule", form, token, true),
  scheduleNewPost: (form, token) => req("POST", "/dashboard/schedule/new", form, token, true),
  uploadPostImage: (postId, form, token) => req("POST", `/dashboard/posts/${postId}/image`, form, token, true),
  cancelScheduledPost: (postId, token) => req("POST", `/dashboard/schedule/${postId}/cancel`, null, token),
  deletePost: (postId, token) => req("DELETE", `/dashboard/posts/${postId}`, null, token)
};
