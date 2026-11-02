import axios from "axios";
import { clearSession } from "./auth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("healthtrack_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";
    const isLoginRequest = requestUrl.endsWith("/auth/login");

    if (error.response?.status === 401 && !isLoginRequest) {
      clearSession();
      window.location.replace("/login");
    }

    return Promise.reject(error);
  }
);
