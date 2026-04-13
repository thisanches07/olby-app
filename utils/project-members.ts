import type { ObraMember } from "@/components/obra-card";
import type { ProjectMemberDto } from "@/services/projects.service";

export type ProjectAccessMemberRole = "engenheiro" | "cliente" | "convidado";

export type ProjectAccessMember = {
  id: string;
  name: string;
  email?: string;
  phone?: string | null;
  role: ProjectAccessMemberRole;
  isOwner?: boolean;
  isCurrentUser?: boolean;
};

type MemberWithIdentity = {
  id?: string;
  userId: string;
  userName: string | null;
  userPhone?: string | null;
  userEmail?: string | null;
  role: string;
  status?: string;
};

export function mapProjectRoleToAccessRole(
  rawRole: string,
): ProjectAccessMemberRole {
  const normalized = rawRole.toUpperCase();
  if (
    normalized === "OWNER" ||
    normalized === "ENGINEER" ||
    normalized === "ENGINEER_OWNER" ||
    normalized === "PRO"
  ) {
    return "engenheiro";
  }
  if (normalized.startsWith("CLIENT")) {
    return "cliente";
  }
  return "convidado";
}

export function mapMemberWithIdentityToAccessMember(
  member: MemberWithIdentity,
  backendUserId?: string | null,
): ProjectAccessMember {
  const email = member.userEmail?.trim() || "";
  const isOwner = member.role.toUpperCase() === "OWNER";
  const identity = member.id ?? member.userId;

  return {
    id: identity,
    name: member.userName?.trim() || "Usuario",
    email: email || undefined,
    phone: member.userPhone ?? null,
    role: mapProjectRoleToAccessRole(member.role),
    isOwner,
    isCurrentUser: !!backendUserId && member.userId === backendUserId,
  };
}

export function isActiveProjectMember(
  member: { status?: string | null } | null | undefined,
): boolean {
  return !member?.status || member.status.toUpperCase() === "ACTIVE";
}

export function mapProjectMemberDtoToAccessMember(
  member: ProjectMemberDto,
  backendUserId?: string | null,
): ProjectAccessMember {
  return mapMemberWithIdentityToAccessMember(
    {
      id: member.id ?? member.userId,
      userId: member.userId,
      userName: member.userName,
      userEmail: member.userEmail,
      userPhone: member.userPhone,
      role: member.role,
      status: member.status,
    },
    backendUserId,
  );
}

export function mapObraMemberToAccessMember(
  member: ObraMember,
  backendUserId?: string | null,
): ProjectAccessMember {
  return mapMemberWithIdentityToAccessMember(
    {
      id: member.id ?? member.userId,
      userId: member.userId,
      userName: member.userName,
      userEmail: member.userEmail,
      userPhone: member.userPhone,
      role: member.role,
      status: member.status,
    },
    backendUserId,
  );
}
