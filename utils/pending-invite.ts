/**
 * Module-level singleton para preservar o token de convite
 * quando o usuário precisa fazer login antes de aceitar.
 *
 * Fluxo:
 *   1. Usuário abre link de convite sem estar logado
 *   2. app/invite.tsx chama pendingInviteToken.set(token) e navega para /login
 *   3. Após login, AuthGate detecta o token pendente e redireciona para /invite
 *   4. app/invite.tsx aceita o convite e limpa o token
 */

let _token: string | null = null;

export const pendingInviteToken = {
  set: (token: string): void => {
    _token = token;
  },
  get: (): string | null => _token,
  clear: (): void => {
    _token = null;
  },
};
