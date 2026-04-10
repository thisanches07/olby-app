import Constants from "expo-constants";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { notificationsApi } from "@/services/notifications.api";
import { notificationsStorage } from "@/services/notifications.storage";
import type {
  NotificationPermissionState,
  PushTokenRegistrationDto,
  RegisteredPushTokenSnapshot,
} from "@/services/notifications.types";

function mapPermissionState(
  settings: Notifications.NotificationPermissionsStatus,
): NotificationPermissionState {
  if (settings.granted) return "granted";
  if (settings.canAskAgain === false) return "blocked";
  if (settings.status === Notifications.PermissionStatus.DENIED) {
    return "denied";
  }

  return "unknown";
}

export async function getNotificationPermissionState(): Promise<{
  canAskAgain: boolean;
  state: NotificationPermissionState;
  status: Notifications.NotificationPermissionsStatus;
}> {
  const status = await Notifications.getPermissionsAsync();
  const state = mapPermissionState(status);

  await notificationsStorage.setPermissionState(state);

  return {
    canAskAgain: status.canAskAgain,
    state,
    status,
  };
}

function getExpoProjectId(): string | null {
  const easProjectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  return typeof easProjectId === "string" ? easProjectId : null;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("project-updates", {
    name: "Atualizações de projetos",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    lightColor: "#2563EB",
    enableVibrate: true,
    showBadge: true,
    sound: "default",
  });
}

export async function requestNotificationPermission(): Promise<{
  canAskAgain: boolean;
  state: NotificationPermissionState;
  status: Notifications.NotificationPermissionsStatus;
}> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return getNotificationPermissionState();
  }

  const next = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  const state = mapPermissionState(next);
  await notificationsStorage.setPermissionState(state);

  return {
    canAskAgain: next.canAskAgain,
    state,
    status: next,
  };
}

export async function getDevicePushTokens(): Promise<{
  expoPushToken: string;
  nativeDevicePushToken: string | null;
}> {
  await ensureAndroidChannel();

  const projectId = getExpoProjectId();
  if (!projectId) {
    throw new Error(
      "EAS projectId não encontrado. Configure expo.extra.eas.projectId antes de registrar push.",
    );
  }

  const expoPushTokenResponse = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  const nativeTokenResponse = await Notifications.getDevicePushTokenAsync().catch(
    () => null,
  );

  return {
    expoPushToken: expoPushTokenResponse.data,
    nativeDevicePushToken: nativeTokenResponse?.data ?? null,
  };
}

function snapshotMatches(
  snapshot: RegisteredPushTokenSnapshot | null,
  next: RegisteredPushTokenSnapshot,
): boolean {
  return (
    snapshot?.userId === next.userId &&
    snapshot.expoPushToken === next.expoPushToken &&
    (snapshot.nativeDevicePushToken ?? null) ===
      (next.nativeDevicePushToken ?? null)
  );
}

export async function syncPushTokenForUser(userId: string): Promise<{
  snapshot: RegisteredPushTokenSnapshot;
  skipped: boolean;
}> {
  const permission = await getNotificationPermissionState();
  if (permission.state !== "granted") {
    throw new Error("Push notifications não permitidas no dispositivo.");
  }

  const tokens = await getDevicePushTokens();
  const nextSnapshot: RegisteredPushTokenSnapshot = {
    userId,
    expoPushToken: tokens.expoPushToken,
    nativeDevicePushToken: tokens.nativeDevicePushToken,
  };

  const currentSnapshot = await notificationsStorage.getTokenSnapshot();
  if (snapshotMatches(currentSnapshot, nextSnapshot)) {
    return {
      snapshot: nextSnapshot,
      skipped: true,
    };
  }

  const payload: PushTokenRegistrationDto = {
    token: tokens.expoPushToken,
    platform: Platform.OS === "ios" ? "ios" : "android",
    deviceName: Constants.deviceName ?? null,
    appVersion: Constants.expoConfig?.version ?? null,
  };

  await notificationsApi.registerPushToken(payload);
  await notificationsStorage.setTokenSnapshot(nextSnapshot);

  return {
    snapshot: nextSnapshot,
    skipped: false,
  };
}

export async function revokeStoredPushToken(): Promise<void> {
  const snapshot = await notificationsStorage.getTokenSnapshot();
  if (!snapshot) return;

  try {
    await notificationsApi.revokePushToken({
      token: snapshot.expoPushToken,
    });
  } finally {
    await notificationsStorage.clearTokenSnapshot();
  }
}

export async function touchStoredPushToken(): Promise<void> {
  const snapshot = await notificationsStorage.getTokenSnapshot();
  if (!snapshot) return;

  await notificationsApi.touchPushToken({
    token: snapshot.expoPushToken,
  });
}

export async function resetNotificationDeviceState(): Promise<void> {
  await Promise.all([
    notificationsStorage.clearTokenSnapshot(),
    notificationsStorage.setPermissionState("unknown"),
  ]);
}
