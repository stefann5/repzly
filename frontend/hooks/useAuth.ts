import { useEffect } from "react";
import { useAuthStore, type UserRole } from "@/utils/authStore";
import { authService } from "@/services/auth";

export function useAuth() {
  const { isLoggedIn, userRole, setIsLoggedIn, setUserRole, logout: storeLogout } = useAuthStore();

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const isAuth = await authService.isAuthenticated();
    setIsLoggedIn(isAuth);

    if (isAuth) {
      const role = await authService.getUserRole();
      setUserRole(role);
    } else {
      setUserRole(null);
    }
  };

  const login = async (username: string, password: string) => {
    const role = await authService.login({ username, password });
    setIsLoggedIn(true);
    setUserRole(role);
  };

  const register = async (
    username: string,
    email: string,
    password: string,
    confirm_password: string,
    role: "user" | "coach"
  ) => {
    await authService.register({ username, email, password, confirm_password, role });
    // Note: After registration, user needs to verify email before logging in
    // So we don't set isLoggedIn to true here
  };

  const logout = async () => {
    await authService.logout();
    storeLogout();
  };

  // Role check helpers
  const isUser = userRole === "user" || userRole === "coach" || userRole === "admin";
  const isCoach = userRole === "coach" || userRole === "admin";
  const isAdmin = userRole === "admin";

  return {
    isLoggedIn,
    userRole,
    login,
    logout,
    checkAuthStatus,
    register,
    // Role helpers
    isUser,
    isCoach,
    isAdmin,
  };
}
