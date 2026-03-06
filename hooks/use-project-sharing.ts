import {
  ProjectAccess,
  projectSharingService,
  SharedLinkResult,
} from "@/services/project-sharing.service";
import { useCallback, useState } from "react";

interface ProjectShareLink {
  link: string;
  token: string;
}

export function useProjectSharing() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateShareLink = useCallback(
    async (projectId: string): Promise<ProjectShareLink | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result =
          await projectSharingService.generateSharedLink(projectId);
        return result;
      } catch {
        setError("Nao foi possivel gerar o link compartilhado.");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const validateToken = useCallback(
    async (projectId: string, token: string): Promise<SharedLinkResult> => {
      try {
        return await projectSharingService.validateToken(projectId, token);
      } catch {
        return {
          valid: false,
          error: "Nao foi possivel validar o convite.",
        };
      }
    },
    [],
  );

  const markTokenAsUsed = useCallback(
    async (projectId: string, token: string, email?: string): Promise<void> => {
      try {
        await projectSharingService.markTokenAsUsed(projectId, token, email);
      } catch {}
    },
    [],
  );

  const getProjectAccesses = useCallback(
    async (projectId: string): Promise<ProjectAccess[]> => {
      try {
        return await projectSharingService.getProjectAccesses(projectId);
      } catch {
        return [];
      }
    },
    [],
  );

  const revokeAccess = useCallback(
    async (projectId: string, accessId: string): Promise<void> => {
      try {
        await projectSharingService.revokeAccess(projectId, accessId);
      } catch (err) {
        setError("Nao foi possivel revogar o acesso.");
        throw err;
      }
    },
    [],
  );

  const grantAccess = useCallback(
    async (
      projectId: string,
      email: string,
      name?: string,
    ): Promise<ProjectAccess | null> => {
      try {
        return await projectSharingService.grantAccess(projectId, email, name);
      } catch {
        setError("Nao foi possivel conceder o acesso.");
        return null;
      }
    },
    [],
  );

  return {
    generateShareLink,
    validateToken,
    markTokenAsUsed,
    getProjectAccesses,
    revokeAccess,
    grantAccess,
    isLoading,
    error,
  };
}
