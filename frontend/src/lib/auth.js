const TOKEN_KEY = "healthtrack_token";
const USER_KEY = "healthtrack_user";
export const AUTH_CHANGED_EVENT = "healthtrack-auth-changed";

function notifyAuthChange() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyAuthChange();
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notifyAuthChange();
}

export function getCurrentUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function homeRouteForRole(role) {
  return `/${role}`;
}

export function roleLabel(role) {
  switch (role) {
    case "admin":
      return "Admin";
    case "health_worker":
      return "Health Worker";
    case "patient":
      return "Patient";
    default:
      return role;
  }
}
