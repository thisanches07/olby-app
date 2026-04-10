import type {
  NotificationNavigationIntent,
  ParsedNotificationPayload,
} from "@/services/notifications.types";

function buildQueryString(params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
}

export function buildNotificationNavigationIntent(
  payload: ParsedNotificationPayload,
): NotificationNavigationIntent {
  const params: { id: string } & Record<string, string> = {
    id: payload.projectId,
    notificationType: payload.type,
  };

  if (payload.entityId) {
    params.entityId = payload.entityId;
  }

  if (payload.entityType) {
    params.entityType = payload.entityType;
  }

  if (payload.actorUserId) {
    params.actorUserId = payload.actorUserId;
  }

  if (payload.type === "PROJECT_STATUS_CHANGED") {
    const previousStatus =
      typeof payload.metadata.previousStatus === "string"
        ? payload.metadata.previousStatus
        : null;
    const newStatus =
      typeof payload.metadata.newStatus === "string"
        ? payload.metadata.newStatus
        : null;

    if (previousStatus) {
      params.previousStatus = previousStatus;
    }

    if (newStatus) {
      params.newStatus = newStatus;
    }
  }

  const wantsDiaryScreen =
    payload.screen === "DIARY" ||
    payload.screen === "PROJECT_DIARY" ||
    payload.screen === "project.diary" ||
    payload.type === "DAILY_LOG_CREATED";

  const route = wantsDiaryScreen
    ? ({
        pathname: "/diario/[id]",
        params,
      } as const)
    : ({
        pathname: "/obra/[id]",
        params,
      } as const);

  const basePath = wantsDiaryScreen
    ? `/diario/${payload.projectId}`
    : `/obra/${payload.projectId}`;

  return {
    route,
    deepLink: `obraapp://${basePath}${buildQueryString(params)}`,
  };
}
