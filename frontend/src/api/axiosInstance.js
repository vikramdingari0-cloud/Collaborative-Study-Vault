import axios from "axios";

const axiosInstance = axios.create({
  // In development, point to the backend port. In production, use relative path since they are hosted together.
  baseURL: import.meta.env.DEV 
    ? "http://localhost:5000/api/v1" 
    : "/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const publicPaths = ["/", "/login", "/register"];
      const path = window.location.pathname;
      if (!publicPaths.includes(path)) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
