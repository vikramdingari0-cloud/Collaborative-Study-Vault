import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.DEV
    ? "http://localhost:5000/api/v1"
    : import.meta.env.VITE_API_URL + "/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;