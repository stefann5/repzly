import { create } from "zustand";

export type UserRole = "user" | "coach" | "admin";

interface AuthState {
  isLoggedIn: boolean;
  userRole: UserRole | null;
  setIsLoggedIn: (value: boolean) => void;
  setUserRole: (role: UserRole | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  userRole: null,
  setIsLoggedIn: (value) => set({ isLoggedIn: value }),
  setUserRole: (role) => set({ userRole: role }),
  logout: () => set({ isLoggedIn: false, userRole: null }),
}));
