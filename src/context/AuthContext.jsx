import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);
const AUTH_TOKEN_KEY = "auth_token";

export function AuthProvider({ children }) {
  const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(storedToken));
  const [token, setToken] = useState(storedToken);
  const [csrfToken, setCsrfToken] = useState(null);

  const fetchCsrfToken = async () => {
    const response = await fetch("/api/csrf", { credentials: "include" });
    if (!response.ok) {
      throw new Error("Failed to fetch CSRF token");
    }

    const data = await response.json();
    setCsrfToken(data.csrfToken);
    return data.csrfToken;
  };

  const getCsrfToken = async () => csrfToken || fetchCsrfToken();

  const login = async (email, password) => {
    if (!email || !password) {
      return { ok: false, message: "Email and password required" };
    }

    try {
      const csrf = await fetchCsrfToken();
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrf,
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return { ok: false, message: data.message || "Login failed" };
      }

      const data = await response.json();
      if (!data.token) {
        return { ok: false, message: "Login response missing token" };
      }

      setIsLoggedIn(true);
      setToken(data.token);
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      setCsrfToken(data.csrfToken);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: "Network error during login" };
    }
  };

  const logout = async () => {
    try {
      const csrf = await getCsrfToken();
      await fetch("/api/logout", {
        method: "POST",
        headers: { "x-csrf-token": csrf },
        credentials: "include",
      });
    } catch (error) {
      // Best-effort logout; client state still clears.
    }

    setIsLoggedIn(false);
    setToken(null);
    setCsrfToken(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  };

  const value = {
    isLoggedIn,
    token,
    csrfToken,
    fetchCsrfToken,
    getCsrfToken,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
