// API Configuration
// Change this to match your deployment environment

import { storage, API_URL_KEY } from "@/utils/storage";

// Default API URL (used if no custom URL is configured)
export const DEFAULT_API_URL = "https://5be4b0c81674.ngrok-free.app";

// In-memory cache for the API URL to avoid async calls on every request
let cachedApiUrl: string | null = null;

/**
 * Get the current API base URL.
 * Returns cached value if available, otherwise returns default.
 * Call initApiUrl() on app startup to load from storage.
 */
export const getApiUrl = (): string => {
  return cachedApiUrl || DEFAULT_API_URL;
};

/**
 * Initialize the API URL from storage.
 * Should be called once on app startup.
 */
export const initApiUrl = async (): Promise<string> => {
  const storedUrl = await storage.get(API_URL_KEY);
  cachedApiUrl = storedUrl || DEFAULT_API_URL;
  return cachedApiUrl;
};

/**
 * Set a custom API URL and persist to storage.
 */
export const setApiUrl = async (url: string): Promise<void> => {
  const trimmedUrl = url.trim().replace(/\/+$/, ""); // Remove trailing slashes
  await storage.set(API_URL_KEY, trimmedUrl);
  cachedApiUrl = trimmedUrl;
};

/**
 * Reset to default API URL.
 */
export const resetApiUrl = async (): Promise<void> => {
  await storage.remove(API_URL_KEY);
  cachedApiUrl = DEFAULT_API_URL;
};

// For backward compatibility - a getter that returns current URL
export const API_BASE_URL = DEFAULT_API_URL;
