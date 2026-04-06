import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { logout } from "@/services/auth.service";
import { api } from "@/services/api";
import { firebaseAuth } from "@/services/firebase";

interface AuthContextValue {
  user: User | null;
  /** ID interno do backend (≠ Firebase UID). Usado para filtrar o próprio usuário em listas. */
  backendUserId: string | null;
  /** Data em que o telefone foi verificado, ou null se ainda não verificado. */
  phoneVerifiedAt: string | null;
  /** true enquanto a chamada GET /users/me ainda está em andamento */
  isBackendLoading: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  setPhoneVerified: (at: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [backendUserId, setBackendUserId] = useState<string | null>(null);
  const [phoneVerifiedAt, setPhoneVerifiedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendLoading, setIsBackendLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      if (!mounted) return;
      setUser(firebaseUser);
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
        setIsBackendLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleSetPhoneVerified = useCallback((at: string) => {
    setPhoneVerifiedAt(at);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        backendUserId,
        phoneVerifiedAt,
        isBackendLoading,
        isLoading,
        signOut: logout,
        setPhoneVerified: handleSetPhoneVerified,
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
