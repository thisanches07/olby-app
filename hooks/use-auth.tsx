import { AppState, Linking } from "react-native";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import {
  logout,
  refreshCurrentUser,
  sendCurrentUserEmailVerification,
} from "@/services/auth.service";
import { api } from "@/services/api";
import { firebaseAuth } from "@/services/firebase";
import {
  resetNotificationDeviceState,
  revokeStoredPushToken,
} from "@/services/notifications.service";

interface AuthContextValue {
  user: User | null;
  /** ID interno do backend (≠ Firebase UID). Usado para filtrar o próprio usuário em listas. */
  backendUserId: string | null;
  /** Data em que o telefone foi verificado, ou null se ainda não verificado. */
  phoneVerifiedAt: string | null;
  emailVerified: boolean;
  /** true enquanto a chamada GET /users/me ainda está em andamento */
  isBackendLoading: boolean;
  isLoading: boolean;
  /** true durante o fluxo de cadastro com telefone (entre confirm() e conta criada) */
  registrationInProgress: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  setPhoneVerified: (at: string) => void;
  setRegistrationInProgress: (v: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [backendUserId, setBackendUserId] = useState<string | null>(null);
  const [phoneVerifiedAt, setPhoneVerifiedAt] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendLoading, setIsBackendLoading] = useState(false);
  const [registrationInProgress, setRegistrationInProgressState] = useState(false);

  const syncAuthUser = useCallback(
    (nextUser: User | null) => {
      const nextEmailVerified = !!nextUser?.emailVerified;

      setUser(nextUser);
      setEmailVerified(nextEmailVerified);
    },
    [],
  );

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      if (!mounted) return;
      syncAuthUser(firebaseUser);
      setIsLoading(false);

      if (firebaseUser) {
        // Busca o ID interno do backend e status de verificação de forma assíncrona
        setIsBackendLoading(true);
        api
          .get<{ id: string; phone?: string | null; phoneVerifiedAt?: string | null }>("/users/me")
          .then((u) => {
            if (mounted) {
              setBackendUserId(u.id);
              setPhoneVerifiedAt(u.phoneVerifiedAt ?? null);
            }
          })
          .catch(() => {})
          .finally(() => { if (mounted) setIsBackendLoading(false); });
      } else {
        setBackendUserId(null);
        setPhoneVerifiedAt(null);
        setEmailVerified(false);
        setIsBackendLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [syncAuthUser]);

  const handleSetPhoneVerified = useCallback((at: string) => {
    setPhoneVerifiedAt(at);
  }, []);

  const handleSetRegistrationInProgress = useCallback((v: boolean) => {
    setRegistrationInProgressState(v);
  }, []);

  const handleRefreshUser = useCallback(async () => {
    const refreshed = await refreshCurrentUser();
    syncAuthUser(refreshed);
  }, [syncAuthUser]);

  const handleSendVerificationEmail = useCallback(async () => {
    await sendCurrentUserEmailVerification();
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await revokeStoredPushToken();
    } catch {
      // O logout não deve falhar se a revogação do token push der erro.
    } finally {
      await resetNotificationDeviceState();
      await logout();
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const maybeRefreshFromUrl = async (url: string | null) => {
      if (!url || !firebaseAuth.currentUser) return;

      const normalized = url.toLowerCase();
      const isEmailVerificationReturn =
        normalized.includes("email-verified") ||
        normalized.includes("verify-email") ||
        normalized.includes("auth-action");

      if (!isEmailVerificationReturn) return;

      console.log("[AUTH][EMAIL_VERIFY] app opened from url", { url });

      try {
        const refreshed = await refreshCurrentUser();
        if (!isMounted) return;
        syncAuthUser(refreshed);
        console.log("[AUTH][EMAIL_VERIFY] refresh after url open", {
          url,
          emailVerified: !!refreshed?.emailVerified,
        });
      } catch (error) {
        console.log("[AUTH][EMAIL_VERIFY] refresh after url open failed", {
          url,
          error,
        });
      }
    };

    const maybeRefreshOnForeground = async () => {
      if (!firebaseAuth.currentUser) return;

      try {
        const refreshed = await refreshCurrentUser();
        if (!isMounted) return;
        syncAuthUser(refreshed);
        console.log("[AUTH][EMAIL_VERIFY] refresh on app foreground", {
          emailVerified: !!refreshed?.emailVerified,
        });
      } catch (error) {
        console.log("[AUTH][EMAIL_VERIFY] refresh on app foreground failed", {
          error,
        });
      }
    };

    void Linking.getInitialURL().then((url) => {
      void maybeRefreshFromUrl(url);
    });

    const linkingSub = Linking.addEventListener("url", ({ url }) => {
      void maybeRefreshFromUrl(url);
    });

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void maybeRefreshOnForeground();
      }
    });

    return () => {
      isMounted = false;
      linkingSub.remove();
      appStateSub.remove();
    };
  }, [syncAuthUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        backendUserId,
        phoneVerifiedAt,
        emailVerified,
        isBackendLoading,
        isLoading,
        registrationInProgress,
        signOut: handleSignOut,
        refreshUser: handleRefreshUser,
        sendVerificationEmail: handleSendVerificationEmail,
        setPhoneVerified: handleSetPhoneVerified,
        setRegistrationInProgress: handleSetRegistrationInProgress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}


