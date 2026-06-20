import axios from "axios";

const apiBase = import.meta.env.VITE_API_URL || "https://collaborative-study-vault-kzjt.onrender.com";

const axiosInstance = axios.create({
  baseURL: import.meta.env.DEV
    ? "http://localhost:5000/api/v1"
    : `${apiBase}/api/v1`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;