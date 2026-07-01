import axios from "axios";

const apiBase = import.meta.env.VITE_API_URL || window.location.origin;

const axiosInstance = axios.create({
  baseURL: import.meta.env.DEV
    ? "http://localhost:5000/api/v1"
    : `${apiBase}/api/v1`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor to catch 401s and automatically refresh the session
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loops and don't try to refresh on login/register/refresh endpoints
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.endsWith("/auth/login") &&
      !originalRequest.url.endsWith("/auth/refresh") &&
      !originalRequest.url.endsWith("/auth/register")
    ) {
      originalRequest._retry = true;
      try {
        // Call the public refresh token endpoint
        await axios.post(
          `${axiosInstance.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        // Retry the original request with the fresh cookie
        return axiosInstance(originalRequest);
      } catch (refreshErr) {
        // Refresh token is expired or invalid — user needs to log in again
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;