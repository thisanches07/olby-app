import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import { useToast } from "@/components/obra/toast";
import { useAuth } from "@/hooks/use-auth";
import { parseNotificationPayload } from "@/services/notifications.parser";
import { buildNotificationNavigationIntent } from "@/services/notifications.router";
import {
  getNotificationPermissionState,
  requestNotificationPermission,
  syncPushTokenForUser,
  touchStoredPushToken,
} from "@/services/notifications.service";
import type {
  NotificationPermissionState,
  ParsedNotificationPayload,
} from "@/services/notifications.types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

type PushNotificationsContextValue = {
  permissionState: NotificationPermissionState;
  canAskAgain: boolean;
  isSyncingToken: boolean;
  lastOpenedNotification: ParsedNotificationPayload | null;
  requestPermission: () => Promise<NotificationPermissionState>;
  openSystemSettings: () => Promise<void>;
  syncNow: () => Promise<void>;
};

const PushNotificationsContext =
  createContext<PushNotificationsContextValue | null>(null);

function getForegroundMessage(
  payload: ParsedNotificationPayload | null,
  fallbackBody?: string | null,
): { message?: string; title: string } {
  if (!payload) {
    return {
      title: "Nova atualização",
      message: fallbackBody ?? undefined,
    };
  }

  switch (payload.type) {
    case "EXPENSE_CREATED":
      return {
        title: "Novo gasto registrado",
        message: "Abra o projeto para ver os detalhes e manter o financeiro em dia.",
      };
    case "TASK_CREATED":
      return {
        title: "Nova tarefa adicionada",
        message: "Há uma nova atividade no projeto para acompanhar.",
      };
    case "TASK_COMPLETED":
      return {
        title: "Tarefa concluída",
        message: "O progresso do projeto foi atualizado.",
      };
    case "DAILY_LOG_CREATED":
      return {
        title: "Novo registro diário",
        message: "O diário de obra recebeu uma nova atualização.",
      };
    case "PROJECT_STATUS_CHANGED":
      return {
        title: "Status do projeto atualizado",
        message:
          payload.metadata.newStatus != null
            ? `Novo status: ${payload.metadata.newStatus}.`
            : "O status do projeto foi alterado.",
      };
    default:
      return {
        title: "Nova atualização",
        message: fallbackBody ?? undefined,
      };
  }
}

export function PushNotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const {
    backendUserId,
    isBackendLoading,
    isLoading,
    registrationInProgress,
    user,
  } = useAuth();
  const [permissionState, setPermissionState] =
    useState<NotificationPermissionState>("unknown");
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [isSyncingToken, setIsSyncingToken] = useState(false);
  const [lastOpenedNotification, setLastOpenedNotification] =
    useState<ParsedNotificationPayload | null>(null);
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const receivedListenerRef = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const handledNotificationIdsRef = useRef<Set<string>>(new Set());
  const pendingOpenPayloadRef = useRef<ParsedNotificationPayload | null>(null);
  const previousUserUidRef = useRef<string | null>(null);
  const autoPromptAttemptedForUserRef = useRef<string | null>(null);

  const navigateFromPayload = useCallback(
    (payload: ParsedNotificationPayload) => {
      const intent = buildNotificationNavigationIntent(payload);
      setLastOpenedNotification(payload);
      router.push(intent.route);
    },
    [router],
  );

  const consumeNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse | null) => {
      if (!response) return;

      const identifier = response.notification.request.identifier;
      if (handledNotificationIdsRef.current.has(identifier)) {
        return;
      }

      handledNotificationIdsRef.current.add(identifier);

      const payload = parseNotificationPayload(
        response.notification.request.content.data,
      );

      if (!payload) return;

      if (!user) {
        pendingOpenPayloadRef.current = payload;
        return;
      }

      navigateFromPayload(payload);
    },
    [navigateFromPayload, user],
  );

  const refreshPermissionState = useCallback(async () => {
    const permission = await getNotificationPermissionState();
    setPermissionState(permission.state);
    setCanAskAgain(permission.canAskAgain);
    return permission;
  }, []);

  const syncNow = useCallback(async () => {
    if (!backendUserId) return;

    const permission = await refreshPermissionState();
    if (permission.state !== "granted") return;

    setIsSyncingToken(true);
    try {
      await syncPushTokenForUser(backendUserId);
    } finally {
      setIsSyncingToken(false);
    }
  }, [backendUserId, refreshPermissionState]);

  const requestPermission = useCallback(async () => {
    setIsSyncingToken(true);

    try {
      const permission = await requestNotificationPermission();
      setPermissionState(permission.state);
      setCanAskAgain(permission.canAskAgain);

      if (permission.state === "granted" && backendUserId) {
        await syncPushTokenForUser(backendUserId);
      }

      return permission.state;
    } finally {
      setIsSyncingToken(false);
    }
  }, [backendUserId]);

  const openSystemSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  useEffect(() => {
    if (receivedListenerRef.current || responseListenerRef.current) {
      return;
    }

    receivedListenerRef.current =
      Notifications.addNotificationReceivedListener((notification) => {
        const payload = parseNotificationPayload(
          notification.request.content.data,
        );
        const content = getForegroundMessage(
          payload,
          notification.request.content.body,
        );

        showToast({
          title: content.title,
          message: content.message,
          tone: "info",
          durationMs: 3800,
        });
      });

    responseListenerRef.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        consumeNotificationResponse(response);
      });

    return () => {
      receivedListenerRef.current?.remove();
      responseListenerRef.current?.remove();
      receivedListenerRef.current = null;
      responseListenerRef.current = null;
    };
  }, [consumeNotificationResponse, showToast]);

  useEffect(() => {
    if (isLoading || isBackendLoading) return;

    if (!user || !backendUserId) {
      pendingOpenPayloadRef.current = null;
      previousUserUidRef.current = null;
      autoPromptAttemptedForUserRef.current = null;
      return;
    }

    if (registrationInProgress) return;

    const previousUserUid = previousUserUidRef.current;
    const currentUserUid = user.uid;
    const justLoggedIn = previousUserUid !== currentUserUid;

    previousUserUidRef.current = currentUserUid;

    void refreshPermissionState()
      .then(async (permission) => {
        if (permission.state === "granted") {
          await syncNow();
          await touchStoredPushToken();
          return;
        }

        if (
          justLoggedIn &&
          permission.state === "unknown" &&
          permission.canAskAgain &&
          autoPromptAttemptedForUserRef.current !== currentUserUid
        ) {
          autoPromptAttemptedForUserRef.current = currentUserUid;
          await requestPermission();
        }
      })
      .catch(() => {});
  }, [
    backendUserId,
    isBackendLoading,
    isLoading,
    refreshPermissionState,
    registrationInProgress,
    requestPermission,
    syncNow,
    user,
  ]);

  useEffect(() => {
    if (!user || !backendUserId) return;

    if (pendingOpenPayloadRef.current) {
      navigateFromPayload(pendingOpenPayloadRef.current);
      pendingOpenPayloadRef.current = null;
    }
  }, [backendUserId, navigateFromPayload, user]);

  useEffect(() => {
    if (isLoading || isBackendLoading) return;
    if (!user) return;

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      consumeNotificationResponse(response);
    });
  }, [consumeNotificationResponse, isBackendLoading, isLoading, user]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" || !user || !backendUserId) return;
      void syncNow().then(() => touchStoredPushToken()).catch(() => {});
    });

    return () => {
      subscription.remove();
    };
  }, [backendUserId, syncNow, user]);

  const value: PushNotificationsContextValue = {
    permissionState,
    canAskAgain,
    isSyncingToken,
    lastOpenedNotification,
    requestPermission,
    openSystemSettings,
    syncNow,
  };

  return (
    <PushNotificationsContext.Provider value={value}>
      {children}
    </PushNotificationsContext.Provider>
  );
}

export function usePushNotifications() {
  const context = useContext(PushNotificationsContext);

  if (!context) {
    throw new Error(
      "usePushNotifications deve ser usado dentro de PushNotificationsProvider",
    );
  }

  return context;
}
