import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
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
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/users/register', data),
  login: (data) => api.post('/users/login', data),
  getProfile: () => api.get('/users/me'),
  getUsage: () => api.get('/users/usage'),
  upgradeToPro: () => api.post('/users/upgrade-to-pro'),
};

// Transcription API
export const transcriptionAPI = {
  create: (data) => api.post('/transcribe/', data),
  getStatus: (taskId) => api.get(`/transcribe/status/${taskId}`),
};

// Scripts API
export const scriptsAPI = {
  getList: (params) => api.get('/scripts/', { params }),
  getById: (id) => api.get(`/scripts/${id}`),
  download: (id, format = 'txt') => 
    api.get(`/scripts/${id}/download`, { 
      params: { format },
      responseType: 'blob'
    }),
  delete: (id) => api.delete(`/scripts/${id}`),
  getDashboard: () => api.get('/scripts/dashboard'),
};

export default api;