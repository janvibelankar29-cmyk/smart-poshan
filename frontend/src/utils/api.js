import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Attach JWT to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('poshan_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('poshan_token');
      localStorage.removeItem('poshan_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
