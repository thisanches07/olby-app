import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "pending_invite_token";

/**
 * Persiste o token de convite pendente em AsyncStorage.
 * Sobrevive ao app ser morto pelo SO entre o clique no link e o login.
 *
 * Fluxo:
 *   1. Usuário abre link de convite sem estar logado
 *   2. app/invite.tsx chama pendingInviteToken.set(token) e navega para /login
 *   3. Após login, AuthGate detecta o token pendente e redireciona para /invite
 *   4. app/invite.tsx aceita o convite e limpa o token
 */
export const pendingInviteToken = {
  set: (token: string): Promise<void> => AsyncStorage.setItem(KEY, token),
  get: (): Promise<string | null> => AsyncStorage.getItem(KEY),
  clear: (): Promise<void> => AsyncStorage.removeItem(KEY),
};
