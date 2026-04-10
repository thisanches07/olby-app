import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  NotificationPermissionState,
  RegisteredPushTokenSnapshot,
} from "@/services/notifications.types";

const KEYS = {
  tokenSnapshot: "@obra:notifications:token-snapshot",
  permissionState: "@obra:notifications:permission-state",
} as const;

async function getJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function setJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const notificationsStorage = {
  getTokenSnapshot: () =>
    getJson<RegisteredPushTokenSnapshot>(KEYS.tokenSnapshot),

  setTokenSnapshot: (snapshot: RegisteredPushTokenSnapshot) =>
    setJson(KEYS.tokenSnapshot, snapshot),

  clearTokenSnapshot: () => AsyncStorage.removeItem(KEYS.tokenSnapshot),

  getPermissionState: async (): Promise<NotificationPermissionState> => {
    const value = await AsyncStorage.getItem(KEYS.permissionState);
    if (
      value === "granted" ||
      value === "denied" ||
      value === "blocked" ||
      value === "unknown"
    ) {
      return value;
    }

    return "unknown";
  },

  setPermissionState: (value: NotificationPermissionState) =>
    AsyncStorage.setItem(KEYS.permissionState, value),
};
