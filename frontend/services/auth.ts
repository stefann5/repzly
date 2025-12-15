import api from "@/utils/api";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";
const ACCESS_TOKEN_KEY = "access-token";
const REFRESH_TOKEN_KEY = "refresh-token";

interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// Storage helpers
const storage = {
  get: async (key: string): Promise<string | null> => {
    return isWeb ? localStorage.getItem(key) : await SecureStore.getItemAsync(key);
  },
  set: async (key: string, value: string): Promise<void> => {
    isWeb ? localStorage.setItem(key, value) : await SecureStore.setItemAsync(key, value);
  },
  remove: async (key: string): Promise<void> => {
    isWeb ? localStorage.removeItem(key) : await SecureStore.deleteItemAsync(key);
  },
};

export const authService = {
  getAccessToken: () => storage.get(ACCESS_TOKEN_KEY),
  getRefreshToken: () => storage.get(REFRESH_TOKEN_KEY),

  isAuthenticated: async (): Promise<boolean> => {
    const token = await storage.get(ACCESS_TOKEN_KEY);
    return !!token;
  },

  setTokens: async (tokens: AuthResponse): Promise<void> => {
    await storage.set(ACCESS_TOKEN_KEY, tokens.access_token);
    await storage.set(REFRESH_TOKEN_KEY, tokens.refresh_token);
  },

  clearTokens: async (): Promise<void> => {
    await storage.remove(ACCESS_TOKEN_KEY);
    await storage.remove(REFRESH_TOKEN_KEY);
  },

  login: async (credentials: LoginCredentials): Promise<void> => {
    const response = await api.post<AuthResponse>("/login", credentials);
    await authService.setTokens(response.data);
  },

  refresh: async (): Promise<boolean> => {
    const refreshToken = await storage.get(REFRESH_TOKEN_KEY);
    if (!refreshToken) return false;
    console.log("Refreshing token...");
    try {
      const response = await api.post<AuthResponse>("/refresh", {
        refresh_token: refreshToken,
      });
      await authService.setTokens(response.data);
      return true;
    } catch {
      await authService.clearTokens();
      return false;
    }
  },

  logout: async (): Promise<void> => {
    const refreshToken = await storage.get(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        await api.post("/logout", { refresh_token: refreshToken });
      } catch {
        // Ignore logout errors
      }
    }
    await authService.clearTokens();
  },
};