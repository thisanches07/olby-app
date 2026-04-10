import type {
  NotificationPayload,
  NotificationType,
  ParsedNotificationPayload,
  ProjectNotificationStatus,
  ProjectStatusChangedMetadata,
} from "@/services/notifications.types";
import {
  NOTIFICATION_TYPES,
  PROJECT_NOTIFICATION_STATUSES,
} from "@/services/notifications.types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function isNotificationType(value: unknown): value is NotificationType {
  return (
    typeof value === "string" &&
    (NOTIFICATION_TYPES as readonly string[]).includes(value)
  );
}

function toProjectStatus(value: unknown): ProjectNotificationStatus | null {
  if (
    typeof value === "string" &&
    (PROJECT_NOTIFICATION_STATUSES as readonly string[]).includes(value)
  ) {
    return value as ProjectNotificationStatus;
  }

  return null;
}

function normalizeMetadata(
  type: NotificationType,
  metadata: unknown,
): ProjectStatusChangedMetadata | Record<string, unknown> {
  if (!isRecord(metadata)) {
    return {};
  }

  if (type !== "PROJECT_STATUS_CHANGED") {
    return metadata;
  }

  return {
    ...metadata,
    previousStatus: toProjectStatus(metadata.previousStatus),
    newStatus: toProjectStatus(metadata.newStatus),
  };
}

export function parseNotificationPayload(
  raw: unknown,
): ParsedNotificationPayload | null {
  if (!isRecord(raw)) return null;

  if (!isNotificationType(raw.type)) return null;

  const projectId = toOptionalString(raw.projectId);
  if (!projectId) return null;

  const payload: NotificationPayload = {
    type: raw.type,
    projectId,
    entityId: toOptionalString(raw.entityId),
    entityType: toOptionalString(raw.entityType),
    screen: toOptionalString(raw.screen),
    actorUserId: toOptionalString(raw.actorUserId),
    metadata: normalizeMetadata(raw.type, raw.metadata),
  };

  return {
    ...payload,
    metadata: payload.metadata ?? {},
  };
}
