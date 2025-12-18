import axios from "axios";
import { storage, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/utils/storage";

const API_URL = "http://192.168.1.9:3000";

// Separate axios instance for auth endpoints (no interceptors)
const authApi = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface RegisterRequest {
    username: string,
    email: string,
    password: string,
    confirm_password: string,
}

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
    const response = await authApi.post<AuthResponse>("/login", credentials);
    await authService.setTokens(response.data);
  },

  refresh: async (): Promise<boolean> => {
    const refreshToken = await storage.get(REFRESH_TOKEN_KEY);
    if (!refreshToken) return false;

    try {
      const response = await authApi.post<AuthResponse>("/refresh", {
        refresh_token: refreshToken,
      });
      await authService.setTokens(response.data);
      return true;
    } catch {
      await authService.clearTokens();
      return false;
    }
  },

  register: async (data: RegisterRequest): Promise<void> => {
    await authApi.post("/register", data);
  },

  logout: async (): Promise<void> => {
    const refreshToken = await storage.get(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        await authApi.post("/logout", { refresh_token: refreshToken });
      } catch {
        // Ignore logout errors
      }
    }
    await authService.clearTokens();
  },
};