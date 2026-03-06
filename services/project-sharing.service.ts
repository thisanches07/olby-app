import * as FileSystem from "expo-file-system/legacy";

export interface SharedLinkData {
  token: string;
  projectId: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  usedAt: number | null;
}

export interface ProjectAccess {
  id: string;
  email: string;
  name?: string;
  accessedAt: number;
  revokedAt?: number;
  isRevoked: boolean;
}

export interface ProjectAccessManagement {
  projectId: string;
  accesses: Record<string, ProjectAccess>;
}

export interface SharedLinkResult {
  valid: boolean;
  reason?: "expired" | "used" | "not_found" | "revoked";
  error?: string;
}

export interface IProjectSharingService {
  generateSharedLink(
    projectId: string,
  ): Promise<{ link: string; token: string }>;
  validateToken(projectId: string, token: string): Promise<SharedLinkResult>;
  markTokenAsUsed(
    projectId: string,
    token: string,
    email?: string,
  ): Promise<void>;
  getProjectAccesses(projectId: string): Promise<ProjectAccess[]>;
  revokeAccess(projectId: string, accessId: string): Promise<void>;
  grantAccess(
    projectId: string,
    email: string,
    name?: string,
  ): Promise<ProjectAccess>;
}

// Token constants
const TOKEN_EXPIRATION_HOURS = 24;
const STORAGE_DIR = `${FileSystem.documentDirectory}shared_links`;

// Generate random UUID-like token
function generateRandomToken(): string {
  return `${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate random access ID
function generateAccessId(): string {
  return `${Math.random().toString(36).substr(2, 9)}-${Date.now().toString(36)}`;
}

// File-based implementation using expo-file-system
export class LocalProjectSharingService implements IProjectSharingService {
  private async ensureStorageDir(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(STORAGE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(STORAGE_DIR, { intermediates: true });
    }
  }

  private getStorageFilePath(projectId: string): string {
    return `${STORAGE_DIR}/${projectId}.json`;
  }

  private getAccessesFilePath(projectId: string): string {
    return `${STORAGE_DIR}/${projectId}_accesses.json`;
  }

  private async readLinks(
    projectId: string,
  ): Promise<Record<string, SharedLinkData>> {
    try {
      await this.ensureStorageDir();
      const filePath = this.getStorageFilePath(projectId);
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      if (!fileInfo.exists) {
        return {};
      }

      const content = await FileSystem.readAsStringAsync(filePath);
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private async writeLinks(
    projectId: string,
    links: Record<string, SharedLinkData>,
  ): Promise<void> {
    try {
      await this.ensureStorageDir();
      const filePath = this.getStorageFilePath(projectId);
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(links));
    } catch {
      throw new Error("Não foi possível salvar o link de compartilhamento");
    }
  }

  private async readAccesses(
    projectId: string,
  ): Promise<Record<string, ProjectAccess>> {
    try {
      await this.ensureStorageDir();
      const filePath = this.getAccessesFilePath(projectId);
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      if (!fileInfo.exists) {
        return {};
      }

      const content = await FileSystem.readAsStringAsync(filePath);
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private async writeAccesses(
    projectId: string,
    accesses: Record<string, ProjectAccess>,
  ): Promise<void> {
    try {
      await this.ensureStorageDir();
      const filePath = this.getAccessesFilePath(projectId);
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(accesses));
    } catch {
      throw new Error("Não foi possível salvar os acessos");
    }
  }

  async generateSharedLink(
    projectId: string,
  ): Promise<{ link: string; token: string }> {
    try {
      const token = generateRandomToken();
      const now = Date.now();
      const expiresAt = now + TOKEN_EXPIRATION_HOURS * 60 * 60 * 1000;

      const sharedLink: SharedLinkData = {
        token,
        projectId,
        createdAt: now,
        expiresAt,
        used: false,
        usedAt: null,
      };

      // Get existing links
      const links = await this.readLinks(projectId);

      // Add new link
      links[token] = sharedLink;

      // Save back to storage
      await this.writeLinks(projectId, links);

      // Generate deep link URL
      const link = `obraapp://shared/${projectId}?token=${token}`;

      return { link, token };
    } catch {
      throw new Error("Não foi possível gerar o link de compartilhamento");
    }
  }

  async validateToken(
    projectId: string,
    token: string,
  ): Promise<SharedLinkResult> {
    try {
      const links = await this.readLinks(projectId);

      if (!links || Object.keys(links).length === 0) {
        return { valid: false, reason: "not_found" };
      }

      const link = links[token];

      if (!link) {
        return { valid: false, reason: "not_found" };
      }

      // Check if already used
      if (link.used) {
        return { valid: false, reason: "used" };
      }

      // Check if expired
      const now = Date.now();
      if (now > link.expiresAt) {
        return { valid: false, reason: "expired" };
      }

      // Token is valid
      return { valid: true };
    } catch {
      return { valid: false, error: "Erro ao validar token" };
    }
  }

  async markTokenAsUsed(
    projectId: string,
    token: string,
    email?: string,
  ): Promise<void> {
    try {
      const links = await this.readLinks(projectId);

      if (!links || !links[token]) return;

      const link = links[token];
      link.used = true;
      link.usedAt = Date.now();
      await this.writeLinks(projectId, links);

      // Register access if email is provided
      if (email) {
        await this.grantAccess(projectId, email);
      }
    } catch {}
  }

  async getProjectAccesses(projectId: string): Promise<ProjectAccess[]> {
    try {
      const accesses = await this.readAccesses(projectId);
      return Object.values(accesses)
        .filter((access) => !access.isRevoked)
        .sort((a, b) => b.accessedAt - a.accessedAt);
    } catch {
      return [];
    }
  }

  async revokeAccess(projectId: string, accessId: string): Promise<void> {
    try {
      const accesses = await this.readAccesses(projectId);

      if (!accesses[accessId]) {
        throw new Error("Acesso não encontrado");
      }

      accesses[accessId].isRevoked = true;
      accesses[accessId].revokedAt = Date.now();

      await this.writeAccesses(projectId, accesses);
    } catch {
      throw new Error("Não foi possível revogar o acesso");
    }
  }

  async grantAccess(
    projectId: string,
    email: string,
    name?: string,
  ): Promise<ProjectAccess> {
    try {
      const accesses = await this.readAccesses(projectId);

      // Check if email already has active access
      const existingAccess = Object.values(accesses).find(
        (access) => access.email === email && !access.isRevoked,
      );

      if (existingAccess) {
        return existingAccess;
      }

      const accessId = generateAccessId();
      const newAccess: ProjectAccess = {
        id: accessId,
        email,
        name: name || email,
        accessedAt: Date.now(),
        isRevoked: false,
      };

      accesses[accessId] = newAccess;
      await this.writeAccesses(projectId, accesses);

      return newAccess;
    } catch {
      throw new Error("Não foi possível conceder acesso");
    }
  }

  async cleanupExpiredLinks(projectId: string): Promise<void> {
    try {
      const links = await this.readLinks(projectId);

      if (!links || Object.keys(links).length === 0) return;

      const now = Date.now();

      // Remove expired or used links
      const cleaned = Object.entries(links).reduce(
        (acc, [key, link]) => {
          if (!link.used && now <= link.expiresAt) {
            acc[key] = link;
          }
          return acc;
        },
        {} as Record<string, SharedLinkData>,
      );

      if (Object.keys(cleaned).length > 0) {
        await this.writeLinks(projectId, cleaned);
      } else {
        // Delete file if no valid links remain
        try {
          const filePath = this.getStorageFilePath(projectId);
          await FileSystem.deleteAsync(filePath);
        } catch {
          // File might not exist, that's ok
        }
      }
    } catch {}
  }
}

// Create singleton instance
export const projectSharingService = new LocalProjectSharingService();
