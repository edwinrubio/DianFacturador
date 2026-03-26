import { useState, useCallback } from "react";
import api from "@/lib/api";

interface LoginCredentials {
  username: string;
  password: string;
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => !!localStorage.getItem("access_token")
  );

  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await api.post("/auth/login", credentials);
    const { access_token } = response.data;
    localStorage.setItem("access_token", access_token);
    setIsAuthenticated(true);
    return response.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, login, logout };
}
