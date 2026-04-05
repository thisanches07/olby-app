import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import React, { createContext, useContext, useEffect, useState } from "react";

import { logout } from "@/services/auth.service";
import { api } from "@/services/api";
import { firebaseAuth } from "@/services/firebase";

interface AuthContextValue {
  user: User | null;
  /** ID interno do backend (≠ Firebase UID). Usado para filtrar o próprio usuário em listas. */
  backendUserId: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [backendUserId, setBackendUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      if (!mounted) return;
      setUser(firebaseUser);
      setIsLoading(false);

      if (firebaseUser) {
        // Busca o ID interno do backend de forma assíncrona e não-bloqueante
        api
          .get<{ id: string }>("/users/me")
          .then((u) => { if (mounted) setBackendUserId(u.id); })
          .catch(() => {});
      } else {
        setBackendUserId(null);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, backendUserId, isLoading, signOut: logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
