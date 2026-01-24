import axios from "axios";
import { storage, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_ROLE_KEY } from "@/utils/storage";
import type { UserRole } from "@/utils/authStore";
import { API_BASE_URL } from "@/config/api";

// Separate axios instance for auth endpoints (no interceptors)
const authApi = axios.create({
  baseURL: API_BASE_URL,
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
  username: string;
  email: string;
  password: string;
  confirm_password: string;
  role: "user" | "coach";
}

interface JwtPayload {
  sub: string;
  exp: number;
  aud: string;
  role: UserRole;
}

// Decode JWT payload without verification (verification is done server-side)
function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    // Handle base64url encoding
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = atob(base64);
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const authService = {
  getAccessToken: () => storage.get(ACCESS_TOKEN_KEY),
  getRefreshToken: () => storage.get(REFRESH_TOKEN_KEY),

  getUserRole: async (): Promise<UserRole | null> => {
    const role = await storage.get(USER_ROLE_KEY);
    if (role && (role === "user" || role === "coach" || role === "admin")) {
      return role as UserRole;
    }
    return null;
  },

  isAuthenticated: async (): Promise<boolean> => {
    const token = await storage.get(ACCESS_TOKEN_KEY);
    return !!token;
  },

  setTokens: async (tokens: AuthResponse): Promise<UserRole | null> => {
    await storage.set(ACCESS_TOKEN_KEY, tokens.access_token);
    await storage.set(REFRESH_TOKEN_KEY, tokens.refresh_token);

    // Decode JWT to get role
    const payload = decodeJwtPayload(tokens.access_token);
    if (payload?.role) {
      await storage.set(USER_ROLE_KEY, payload.role);
      return payload.role;
    }
    return null;
  },

  clearTokens: async (): Promise<void> => {
    await storage.remove(ACCESS_TOKEN_KEY);
    await storage.remove(REFRESH_TOKEN_KEY);
    await storage.remove(USER_ROLE_KEY);
  },

  login: async (credentials: LoginCredentials): Promise<UserRole | null> => {
    const response = await authApi.post<AuthResponse>("/login", credentials);
    return await authService.setTokens(response.data);
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
