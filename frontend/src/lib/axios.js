import axios from "axios";
import { clearSession, getCurrentUser, getSessionToken, loginRouteForRole } from "./auth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  // Carry the staff ht_site unlock cookie on split deployments.
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getSessionToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";
    const isAuthRequest = /\/auth\/(login|verify-2fa|resend-2fa|initiate|complete)$/.test(requestUrl);

    if (error.response?.status === 401 && !isAuthRequest) {
      const loginRoute = loginRouteForRole(getCurrentUser()?.role);
      clearSession();
      window.location.replace(loginRoute);
    }

    return Promise.reject(error);
  }
);
