import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

export const ACCESS_TOKEN_KEY = "access-token";
export const REFRESH_TOKEN_KEY = "refresh-token";

export const storage = {
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