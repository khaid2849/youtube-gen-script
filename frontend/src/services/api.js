import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post("/users/register", data),
  login: (data) =>
    api.post("/users/login", data, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }),
  getProfile: () => api.get("/users/me"),
  updateProfile: (data) => api.put("/users/profile", data),
  getUsage: () => api.get("/users/usage"),
  getStats: () => api.get("/users/stats"),
  upgradeToPro: () => api.post("/users/upgrade-to-pro"),
  changePassword: (data) => api.post("/users/change-password", data),
  deleteAccount: (password) =>
    api.delete("/users/account", { data: { password } }),
};

// Transcription API
export const transcriptionAPI = {
  create: (data) => api.post("/transcribe/", data),
  getStatus: (taskId) => api.get(`/transcribe/status/${taskId}`),
};

// Scripts API
export const scriptsAPI = {
  // Get paginated scripts with filters
  getList: (params) => api.get("/scripts/", { params }),

  // Get all scripts (no pagination)
  getAll: () => api.get("/scripts/all"),

  // Get single script
  getById: (id) => api.get(`/scripts/${id}`),

  // Download single script
  download: (id, format = "txt") =>
    api.get(`/scripts/${id}/download`, {
      params: { format },
      responseType: "blob",
    }),

  // Delete script
  delete: (id) => api.delete(`/scripts/${id}`),

  // Get dashboard data
  getDashboard: () => api.get("/scripts/dashboard"),

  // Export multiple scripts
  export: (data) =>
    api.post("/scripts/export", data, {
      responseType: "blob",
    }),

  // Regenerate failed script
  regenerate: (id) => api.post(`/scripts/${id}/regenerate`),
};

// Helper function to download blob
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

// Helper function to get filename from response headers
export const getFilenameFromResponse = (response) => {
  const contentDisposition = response.headers["content-disposition"];
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(
      /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
    );
    if (filenameMatch && filenameMatch[1]) {
      return filenameMatch[1].replace(/['"]/g, "");
    }
  }
  return "download";
};

export default api;
