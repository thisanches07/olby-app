export const NOTIFICATION_TYPES = [
  "EXPENSE_CREATED",
  "TASK_CREATED",
  "TASK_COMPLETED",
  "DAILY_LOG_CREATED",
  "PROJECT_STATUS_CHANGED",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const PROJECT_NOTIFICATION_STATUSES = [
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
] as const;

export type ProjectNotificationStatus =
  (typeof PROJECT_NOTIFICATION_STATUSES)[number];

export interface ProjectStatusChangedMetadata {
  previousStatus?: ProjectNotificationStatus | null;
  newStatus?: ProjectNotificationStatus | null;
  [key: string]: unknown;
}

export interface NotificationPayloadBase {
  type: NotificationType;
  projectId: string;
  entityId?: string | null;
  entityType?: string | null;
  screen?: string | null;
  actorUserId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type NotificationPayload = NotificationPayloadBase & {
  metadata?: ProjectStatusChangedMetadata | Record<string, unknown> | null;
};

export type NotificationPermissionState =
  | "unknown"
  | "granted"
  | "denied"
  | "blocked";

export interface RegisteredPushTokenSnapshot {
  userId: string;
  expoPushToken: string;
  nativeDevicePushToken?: string | null;
}

export interface PushTokenRegistrationDto {
  token: string;
  platform: "ios" | "android";
  deviceName?: string | null;
  appVersion?: string | null;
}

export interface PushTokenRevokeDto {
  token: string;
}

export interface PushTokenTouchDto {
  token: string;
}

export interface ParsedNotificationPayload extends NotificationPayload {
  metadata: ProjectStatusChangedMetadata | Record<string, unknown>;
}

export interface NotificationRouteTarget {
  pathname: "/obra/[id]" | "/diario/[id]";
  params: { id: string } & Record<string, string>;
}

export interface NotificationNavigationIntent {
  route: NotificationRouteTarget;
  deepLink: string;
}
