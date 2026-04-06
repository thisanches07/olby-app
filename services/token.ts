import { firebaseAuth } from "./firebase";

/**
 * Retorna o Firebase ID Token do usuário atual, ou null se não autenticado.
 * Separado de auth.service.ts para evitar require cycle com api.ts.
 */
export async function getIdToken(): Promise<string | null> {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}
