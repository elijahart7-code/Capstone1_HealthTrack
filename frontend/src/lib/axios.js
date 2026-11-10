import axios from "axios";
import { clearSession, getCurrentUser, loginRouteForRole } from "./auth";

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
    const isAuthRequest = /\/auth\/(login|initiate|complete)$/.test(requestUrl);

    if (error.response?.status === 401 && !isAuthRequest) {
      const loginRoute = loginRouteForRole(getCurrentUser()?.role);
      clearSession();
      window.location.replace(loginRoute);
    }

    return Promise.reject(error);
  }
);
