import api from "@/utils/api";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";
const TOKEN_KEY = "auth-token";

interface LoginCredentials {
  username: string;
  password: string;
}

interface LoginResponse {
  token: string;
}

export const authService = {
  // Get stored token
  getToken: async (): Promise<string | null> => {
    return isWeb
      ? localStorage.getItem(TOKEN_KEY)
      : await SecureStore.getItemAsync(TOKEN_KEY);
  },

  // Check if token exists
  isAuthenticated: async (): Promise<boolean> => {
    const token = await authService.getToken();
    return !!token;
  },

  // Login
  login: async (credentials: LoginCredentials): Promise<void> => {
    const response = await api.post<LoginResponse>("/login", credentials);
    const { token } = response.data;
    if (isWeb) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  },

  // Logout
  logout: async (): Promise<void> => {
    if (isWeb) {
      localStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  },
};