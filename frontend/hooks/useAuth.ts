import { useEffect } from "react";
import { useAuthStore } from "@/utils/authStore";
import { authService } from "@/services/auth";

export function useAuth() {
  const { isLoggedIn, setIsLoggedIn } = useAuthStore();

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const isAuth = await authService.isAuthenticated();
    setIsLoggedIn(isAuth);
  };

  const login = async (username: string, password: string) => {
    await authService.login({ username, password });
    setIsLoggedIn(true);
  };

  const logout = async () => {
    await authService.logout();
    setIsLoggedIn(false);
  };

  return {
    isLoggedIn,
    login,
    logout,
    checkAuthStatus,
  };
}