import axios, { AxiosError } from "axios";
import { storage, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/utils/storage";
import { getApiUrl } from "@/config/api";
import { Toast } from "toastify-react-native";

const workoutApi = axios.create({
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (token) {
      promise.resolve(token);
    } else {
      promise.reject(error);
    }
  });
  failedQueue = [];
};

const refreshTokens = async (): Promise<boolean> => {
  const refreshToken = await storage.get(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;

  try {
    // Use auth service URL for refresh
    const response = await axios.post<{
      access_token: string;
      refresh_token: string;
    }>(`${getApiUrl()}/refresh`, { refresh_token: refreshToken });

    await storage.set(ACCESS_TOKEN_KEY, response.data.access_token);
    await storage.set(REFRESH_TOKEN_KEY, response.data.refresh_token);
    return true;
  } catch {
    await storage.remove(ACCESS_TOKEN_KEY);
    await storage.remove(REFRESH_TOKEN_KEY);
    return false;
  }
};

// Helper to extract error message from response
const getErrorMessage = (error: AxiosError<{ error?: string; message?: string }>): string => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  // Handle common HTTP status codes
  switch (error.response?.status) {
    case 400:
      return "Invalid request. Please check your input.";
    case 401:
      return "Session expired. Please log in again.";
    case 403:
      return "You don't have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 409:
      return "This resource already exists.";
    case 422:
      return "Invalid data provided.";
    case 500:
      return "Server error. Please try again later.";
    case 502:
    case 503:
    case 504:
      return "Service temporarily unavailable. Please try again.";
    default:
      if (!error.response) {
        return "Network error. Please check your connection.";
      }
      return "An unexpected error occurred.";
  }
};

workoutApi.interceptors.request.use(
  async (config) => {
    // Dynamically set baseURL on each request to support URL changes
    config.baseURL = getApiUrl();
    const token = await storage.get(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

workoutApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: string; message?: string }>) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    // Handle 401 with token refresh
    if (error.response?.status === 401 && !originalRequest?._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return workoutApi(originalRequest);
          }
        });
      }

      if (originalRequest) {
        originalRequest._retry = true;
      }
      isRefreshing = true;

      try {
        const success = await refreshTokens();
        if (success) {
          const newToken = await storage.get(ACCESS_TOKEN_KEY);
          processQueue(null, newToken);
          if (originalRequest) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return workoutApi(originalRequest);
          }
        } else {
          processQueue(error, null);
          Toast.error("Session expired. Please log in again.");
          return Promise.reject(error);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        Toast.error("Session expired. Please log in again.");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Show toast for non-401 errors (or 401 that couldn't be refreshed)
    // Don't show toast for 401 during refresh flow as we handle it above
    if (error.response?.status !== 401 || originalRequest?._retry) {
      const errorMessage = getErrorMessage(error);
      Toast.error(errorMessage);
    }

    return Promise.reject(error);
  }
);

export default workoutApi;
