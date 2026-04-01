import { api } from "./api";

export interface InviteResponseDto {
  inviteUrl: string;
  expiresAt: string; // ISO 8601 — ex: "2025-06-02T15:30:00.000Z"
}

export interface AcceptInviteResponseDto {
  projectId: string;
  role: string;
  status: string;
  joinedAt: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const invitesService = {
  /**
   * POST /projects/:projectId/invites
   * Gera link de convite com validade de 24h e uso único.
   * Requer role OWNER ou PRO.
   */
  create: async (projectId: string): Promise<InviteResponseDto> => {
    return api.post<InviteResponseDto>(`/projects/${projectId}/invites`, {});
  },

  /**
   * GET /projects/:projectId/invites/active
   * Retorna o convite ativo (não expirado e não usado) ou lança 404.
   */
  getActive: async (projectId: string): Promise<InviteResponseDto | null> => {
    try {
      return await api.get<InviteResponseDto>(
        `/projects/${projectId}/invites/active`,
      );
    } catch {
      return null; // 404 = sem convite ativo
    }
  },

  /**
   * POST /invites/accept
   * Aceita convite e adiciona o usuário como CLIENT_VIEWER.
   */
  accept: async (token: string): Promise<AcceptInviteResponseDto> => {
    return api.post<AcceptInviteResponseDto>("/invites/accept", { token });
  },
};
