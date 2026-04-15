import { firebaseAuth } from "./firebase";

interface GetIdTokenOptions {
  forceRefresh?: boolean;
}

/**
 * Retorna o Firebase ID Token do usuário atual, ou null se não autenticado.
 * Separado de auth.service.ts para evitar require cycle com api.ts.
 */
export async function getIdToken(
  options: GetIdTokenOptions = {},
): Promise<string | null> {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  return user.getIdToken(options.forceRefresh === true);
}

export async function forceRefreshIdToken(): Promise<string | null> {
  return getIdToken({ forceRefresh: true });
}
