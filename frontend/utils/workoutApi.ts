import axios from "axios";
import { storage, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/utils/storage";

const WORKOUT_API_URL = "http://192.168.1.9:3001";

const workoutApi = axios.create({
  baseURL: WORKOUT_API_URL,
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
    }>("http://192.168.1.9:3000/refresh", { refresh_token: refreshToken });

    await storage.set(ACCESS_TOKEN_KEY, response.data.access_token);
    await storage.set(REFRESH_TOKEN_KEY, response.data.refresh_token);
    return true;
  } catch {
    await storage.remove(ACCESS_TOKEN_KEY);
    await storage.remove(REFRESH_TOKEN_KEY);
    return false;
  }
};

workoutApi.interceptors.request.use(
  async (config) => {
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
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return workoutApi(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const success = await refreshTokens();
      if (success) {
        const newToken = await storage.get(ACCESS_TOKEN_KEY);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return workoutApi(originalRequest);
      } else {
        processQueue(error, null);
        return Promise.reject(error);
      }
    } catch (refreshError) {
      processQueue(refreshError, null);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default workoutApi;
