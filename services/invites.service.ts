import { api } from "./api";
import { track } from "./analytics";

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
    const result = await api.post<InviteResponseDto>(
      `/projects/${projectId}/invites`,
      {},
    );
    track("project_share_link_generated", { project_id: projectId });
    return result;
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
    const result = await api.post<AcceptInviteResponseDto>(
      "/invites/accept",
      { token },
    );
    track("invite_accepted", { project_id: result.projectId });
    return result;
  },
};
