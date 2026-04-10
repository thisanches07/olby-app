import { AppModal as Modal } from "@/components/ui/app-modal";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmSheet } from "@/components/obra/confirm-sheet";
import { useToast } from "@/components/obra/toast";
import { useAuth } from "@/hooks/use-auth";
import { ApiError, api } from "@/services/api";
import { firebaseAuth } from "@/services/firebase";
import { tasksService } from "@/services/tasks.service";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import {
  canEditProject,
  canManageMembers,
  type ProjectApiRole,
} from "@/utils/project-role";
import { toWhatsAppUrl } from "@/utils/phone";

export type ProjectMemberRole = "engenheiro" | "cliente" | "convidado";

export type ProjectMember = {
  /** ID do vinculo no projeto (membership) */
  id: string;
  name: string;
  email?: string;
  phone?: string | null;
  role: ProjectMemberRole;
  /** Dono (OWNER) do projeto, não pode ser removido */
  isOwner?: boolean;
  /** Usuário logado, não pode se remover */
  isCurrentUser?: boolean;
};

export type ProjectStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";

async function openWhatsApp(phone: string): Promise<void> {
  const url = toWhatsAppUrl(phone);
  if (!url) return;

  const supported = await Linking.canOpenURL(url);
  if (!supported) return;

  await Linking.openURL(url);
}

export type ProjectResponseDto = {
  id: string;
  name: string;
  address: string | null;
  expectedDeliveryAt: string | null;
  budgetCents: number | null;
  hoursContracted: number;
  status: ProjectStatus | string;
  createdAt: string;
  updatedAt: string;
};

interface ProjectSettingsModalProps {
  visible: boolean;
  projectId: string;
  projectRole?: ProjectApiRole;

  currentName: string;
  currentAddress?: string | null;

  currentExpectedDeliveryAt?: string | null;

  currentStatus?: ProjectStatus;

  members: ProjectMember[];

  apiBaseUrl: string;

  onProjectUpdated?: (project: ProjectResponseDto) => void;

  onAfterSaveRefresh?: () => void | Promise<void>;

  onProjectDeleted?: () => void;

  onClose: () => void;

  onRemoveMember?: (memberId: string) => void;

  onConclude?: (project: ProjectResponseDto) => void;
  onArchive?: (project: ProjectResponseDto) => void;
  onReactivate?: (project: ProjectResponseDto) => void;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function dateToBR(d: Date) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function startOfTodayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseBRDateToLocalDate(input: string): Date | null {
  const raw = input.trim();
  if (!raw) return null;

  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;

  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);

  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy))
    return null;
  if (yyyy < 1900 || yyyy > 2100) return null;
  if (mm < 1 || mm > 12) return null;

  const d = new Date(yyyy, mm - 1, dd);

  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd)
    return null;

  return d;
}

function maskBRDate(text: string) {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function onlyDigitsLen(text: string) {
  return text.replace(/\D/g, "").length;
}

/** Aceita ISO (2025-12-31T…) ou BR (31/12/2025) e devolve sempre DD/MM/AAAA */
function parseDateProp(input: string | null | undefined): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? "" : dateToBR(d);
}

type ConfirmState = null | {
  title: string;
  description?: string;
  tone?: "default" | "danger";
  icon?: keyof typeof MaterialIcons.glyphMap;
  confirmText?: string;
  cancelText?: string;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function ProjectSettingsModal({
  visible,
  projectId,
  projectRole = null,
  currentName,
  currentAddress = null,
  currentExpectedDeliveryAt = null,
  currentStatus = "ACTIVE",
  members,
  apiBaseUrl,
  onProjectUpdated,
  onAfterSaveRefresh,
  onProjectDeleted,
  onClose,
  onRemoveMember,
  onConclude,
  onArchive,
  onReactivate,
}: ProjectSettingsModalProps) {
  const { backendUserId } = useAuth();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  // ──────────────────────────────────────────────────────────────────────────
  // Manual enter/exit + separate backdrop
  // ──────────────────────────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(visible);

  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const { height: screenH } = Dimensions.get("window");
  const sheetBaseTranslateY = useRef(new Animated.Value(screenH)).current; // base enter/exit
  const dragTranslateY = useRef(new Animated.Value(0)).current; // swipe offset
  const isAnimatingRef = useRef(false);

  // Track animated values to avoid "jump" on swipe-to-close
  const baseYRef = useRef(0);
  const dragYRef = useRef(0);

  useEffect(() => {
    const subBase = sheetBaseTranslateY.addListener(({ value }) => {
      baseYRef.current = value;
    });
    const subDrag = dragTranslateY.addListener(({ value }) => {
      dragYRef.current = value;
    });

    return () => {
      sheetBaseTranslateY.removeListener(subBase);
      dragTranslateY.removeListener(subDrag);
    };
  }, [sheetBaseTranslateY, dragTranslateY]);

  const animateIn = () =>
    new Promise<void>((resolve) => {
      isAnimatingRef.current = true;

      backdropOpacity.setValue(0);
      sheetBaseTranslateY.setValue(screenH);
      dragTranslateY.setValue(0);

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(sheetBaseTranslateY, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isAnimatingRef.current = false;
        resolve();
      });
    });

  const animateOut = () =>
    new Promise<void>((resolve) => {
      isAnimatingRef.current = true;

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(sheetBaseTranslateY, {
          toValue: screenH,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isAnimatingRef.current = false;
        resolve();
      });
    });

  // Close with internal animation first, then call parent onClose()
  const closeAnimated = async () => {
    if (busy) return;
    if (isAnimatingRef.current) return;

    // Freeze current position to avoid snapping up
    sheetBaseTranslateY.stopAnimation();
    dragTranslateY.stopAnimation();

    const currentCombined = baseYRef.current + dragYRef.current;

    sheetBaseTranslateY.setValue(Math.max(0, currentCombined));
    dragTranslateY.setValue(0);

    await animateOut();
    setMounted(false);
    onClose();
  };

  useEffect(() => {
    if (visible) {
      setMounted(true);
      requestAnimationFrame(() => {
        void animateIn();
      });
    } else if (mounted) {
      // If parent hid it (visible=false), animate out too
      void (async () => {
        await animateOut();
        setMounted(false);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // combine base enter/exit + user drag
  const combinedTranslateY = useMemo(
    () => Animated.add(sheetBaseTranslateY, dragTranslateY),
    [sheetBaseTranslateY, dragTranslateY],
  );

  // ──────────────────────────────────────────────────────────────────────────

  const [name, setName] = useState(currentName);
  const [address, setAddress] = useState<string>(currentAddress ?? "");
  const [expectedDeliveryText, setExpectedDeliveryText] = useState<string>("");

  const [status, setStatus] = useState<ProjectStatus>(currentStatus);

  const [isDirty, setIsDirty] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // null = idle; 'checking:STATUS' ou 'updating:STATUS' identifica qual botão está ativo
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const [deliveryTouched, setDeliveryTouched] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);

  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const [membersState, setMembersState] = useState<ProjectMember[]>(members);
  const [membersLoading, setMembersLoading] = useState(false);

  const getIdTokenOrThrow = React.useCallback(async () => {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error("Você precisa estar logado para continuar.");
    return await user.getIdToken();
  }, []);

  const buildUrl = React.useCallback(
    (path: string) => {
      const base = apiBaseUrl.replace(/\/+$/, "");
      const p = path.startsWith("/") ? path : `/${path}`;
      return `${base}${p}`;
    },
    [apiBaseUrl],
  );

  const membersListErrorMessage = (status: number) => {
    if (status === 401) return "Sessão expirada. Faça login novamente.";
    if (status === 403) return "Voce não tem permissao para ver os membros.";
    if (status === 404) return "Projeto não encontrado.";
    return "Não foi possivel carregar os membros agora.";
  };

  const memberRemoveErrorMessage = (status: number) => {
    if (status === 401) return "Sessao expirada. Façalogin novamente.";
    if (status === 403) return "Voce não tem permissao para remover membros.";
    if (status === 404) return "Membro não encontrado no projeto.";
    return "Não foi possivel remover o membro agora.";
  };

  type ApiMember = {
    id: string;
    role: string;
    status: string;
    userId: string;
    userName: string | null;
    userEmail: string | null;
    userPhone?: string | null;
  };

  const mapRole = (rawRole: string): ProjectMemberRole => {
    const r = rawRole.toUpperCase();
    if (r === "OWNER" || r === "ENGINEER" || r === "ENGINEER_OWNER") {
      return "engenheiro";
    }
    if (r.startsWith("CLIENT")) {
      return "cliente";
    }
    return "convidado";
  };

  const mapApiMembersToProjectMembers = (
    apiData: ApiMember[],
  ): ProjectMember[] => {
    return Array.isArray(apiData)
      ? apiData
          .filter((m) => m.status === "ACTIVE")
          .map((m) => {
            const email = m.userEmail?.trim() || "";
            const isOwner = m.role.toUpperCase() === "OWNER";
            const isCurrentUser =
              !!backendUserId && m.userId === backendUserId;

            return {
              id: m.id,
              name: m.userName?.trim() || "Usuario",
              email: email || undefined,
              phone: m.userPhone ?? null,
              role: mapRole(m.role),
              isOwner,
              isCurrentUser,
            };
          })
      : [];
  };

  const statusFromError = (error: unknown): number | null => {
    if (error instanceof ApiError) return error.status;
    if (typeof error === "object" && error && "status" in error) {
      const value = (error as { status?: unknown }).status;
      return typeof value === "number" ? value : null;
    }
    return null;
  };

  const loadMembers = React.useCallback(
    async (showErrorToast = true) => {
      try {
        setMembersLoading(true);

        const apiData = await api.get<ApiMember[]>(
          `/projects/${encodeURIComponent(projectId)}/members`,
        );
        setMembersState(mapApiMembersToProjectMembers(apiData));
      } catch (error: unknown) {
        if (!showErrorToast) return;
        const status = statusFromError(error);
        const message =
          status != null
            ? membersListErrorMessage(status)
            : "Tente novamente em instantes.";

        showToast({
          tone: "error",
          title: "Não foi possivel carregar os membros",
          message,
        });
      } finally {
        setMembersLoading(false);
      }
    },
    [backendUserId, projectId, showToast],
  );

  const busy = saving || deleting || pendingStatus !== null;
  const canEdit = canEditProject(projectRole);
  const canManageMembersAccess = canManageMembers(projectRole);

  const expectedDeliveryPlaceholder = useMemo(() => {
    const br = parseDateProp(currentExpectedDeliveryAt);
    return br || "DD/MM/AAAA";
  }, [currentExpectedDeliveryAt]);

  useEffect(() => {
    if (visible) {
      setName(currentName);
      setAddress(currentAddress ?? "");
      setExpectedDeliveryText(parseDateProp(currentExpectedDeliveryAt));
      setStatus(currentStatus);

      setIsDirty(false);
      setSaving(false);
      setDeleting(false);
      setPendingStatus(null);

      setDeliveryTouched(false);
      setSaveAttempted(false);

      setConfirm(null);

      setMembersState(members);
    }
  }, [
    visible,
    currentName,
    currentAddress,
    currentExpectedDeliveryAt,
    currentStatus,
    members,
  ]);

  useEffect(() => {
    if (!visible) return;
    void loadMembers();
  }, [visible, loadMembers]);

  const expectedDeliveryDigitsLen = useMemo(
    () => onlyDigitsLen(expectedDeliveryText),
    [expectedDeliveryText],
  );

  const expectedDeliveryDate = useMemo(() => {
    if (expectedDeliveryDigitsLen !== 8) return null;
    return parseBRDateToLocalDate(expectedDeliveryText);
  }, [expectedDeliveryText, expectedDeliveryDigitsLen]);

  const shouldShowDeliveryValidation = useMemo(() => {
    const raw = expectedDeliveryText.trim();
    const emptyAfterTouch = deliveryTouched && raw.length === 0;
    return expectedDeliveryDigitsLen === 8 || saveAttempted || emptyAfterTouch;
  }, [
    expectedDeliveryDigitsLen,
    saveAttempted,
    deliveryTouched,
    expectedDeliveryText,
  ]);

  const expectedDeliveryError = useMemo(() => {
    if (!shouldShowDeliveryValidation) return null;

    const raw = expectedDeliveryText.trim();
    if (!raw) return null;

    if (expectedDeliveryDigitsLen !== 8)
      return "Complete a data no formato DD/MM/AAAA.";

    const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return "Use o formato DD/MM/AAAA.";

    const yyyy = Number(m[3]);
    const currentYear = new Date().getFullYear();

    if (yyyy < currentYear || yyyy > 2100)
      return `O ano deve estar entre ${currentYear} e 2100.`;

    const parsed = parseBRDateToLocalDate(raw);
    if (!parsed) return "Data inválida (dia/mês não existe).";

    const today = startOfTodayLocal();
    if (parsed.getTime() < today.getTime())
      return "A data de entrega não pode ser antes de hoje.";

    return null;
  }, [
    shouldShowDeliveryValidation,
    expectedDeliveryText,
    expectedDeliveryDigitsLen,
  ]);

  const canSave = useMemo(() => {
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();

    const nameChanged = trimmedName !== currentName.trim();
    const addressChanged = trimmedAddress !== (currentAddress ?? "").trim();

    const currentDeliveryBR = parseDateProp(currentExpectedDeliveryAt);
    const deliveryChanged =
      expectedDeliveryText.trim() !== currentDeliveryBR.trim();

    const nameOk = trimmedName.length >= 3;
    const addressOk =
      trimmedAddress.length === 0 || trimmedAddress.length <= 50;

    const deliveryOk = !deliveryChanged ? true : !expectedDeliveryError;

    return (
      (nameChanged || addressChanged || deliveryChanged) &&
      nameOk &&
      addressOk &&
      deliveryOk &&
      !busy &&
      canEdit
    );
  }, [
    name,
    address,
    expectedDeliveryText,
    expectedDeliveryError,
    currentName,
    currentAddress,
    currentExpectedDeliveryAt,
    busy,
  ]);

  const roleLabel = (r: ProjectMemberRole) => {
    switch (r) {
      case "engenheiro":
        return "ENGENHEIRO";
      case "cliente":
        return "CLIENTE";
      default:
        return "CONVIDADO";
    }
  };

  const roleChipStyle = (r: ProjectMemberRole) => {
    if (r === "engenheiro") return styles.chipEng;
    if (r === "cliente") return styles.chipClient;
    return styles.chipGuest;
  };

  const statusMeta = (s: ProjectStatus) => {
    if (s === "ACTIVE")
      return { label: "ATIVO", icon: "bolt", pill: styles.statusPillActive };
    if (s === "COMPLETED")
      return {
        label: "CONCLUÍDO",
        icon: "check-circle",
        pill: styles.statusPillCompleted,
      };
    return {
      label: "ARQUIVADO",
      icon: "archive",
      pill: styles.statusPillArchived,
    };
  };

  const hasOpenTaskLinked = async (): Promise<boolean> => {
    const data = await tasksService.listOpenByProject(projectId);
    if (Array.isArray(data)) return data.length > 0;
    return !!data;
  };

  const openConfirm = (c: Omit<NonNullable<ConfirmState>, "busy">) =>
    setConfirm({ ...c, busy: false });

  const closeConfirm = () => setConfirm(null);

  const handleRemoveMemberInternal = async (member: ProjectMember) => {
    try {
      setConfirm((prev) => (prev ? { ...prev, busy: true } : prev));

      await api.delete<void>(
        `/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(member.id)}`,
      );
      await loadMembers(false);
      onRemoveMember?.(member.id);

      showToast({
        tone: "success",
        title: "Acesso removido",
        message: `${member.name} não tem mais acesso.`,
      });
    } catch (error: unknown) {
      const status = statusFromError(error);
      const message =
        status != null
          ? memberRemoveErrorMessage(status)
          : "Tente novamente em instantes.";

      showToast({
        tone: "error",
        title: "Não foi possivel remover o acesso",
        message,
      });
    } finally {
      setConfirm((prev) => (prev ? { ...prev, busy: false } : prev));
      closeConfirm();
    }
  };

  const handleClose = () => {
    if (busy) return;

    if (!isDirty) {
      void closeAnimated();
      return;
    }

    openConfirm({
      title: "Descartar alterações?",
      description: "Você fez alterações que ainda não foram salvas.",
      icon: "undo",
      confirmText: "Descartar",
      cancelText: "Continuar editando",
      tone: "danger",
      onConfirm: () => {
        closeConfirm();
        void closeAnimated();
      },
    });
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setSaveAttempted(true);

    const trimmedName = name.trim();
    const trimmedAddress = address.trim();

    if (trimmedName.length < 3) {
      showToast({
        tone: "error",
        title: "Nome inválido",
        message: "O nome do projeto deve ter ao menos 3 caracteres.",
      });
      return;
    }

    if (trimmedAddress.length > 50) {
      showToast({
        tone: "error",
        title: "Endereço muito longo",
        message: "O endereço deve ter no máximo 50 caracteres.",
      });
      return;
    }

    if (expectedDeliveryError) {
      showToast({
        tone: "error",
        title: "Data inválida",
        message: expectedDeliveryError,
      });
      return;
    }

    const addressPayload: string | null = trimmedAddress.length
      ? trimmedAddress
      : null;

    const expectedDeliveryAtPayload: string | null = expectedDeliveryDate
      ? expectedDeliveryDate.toISOString()
      : null;

    try {
      setSaving(true);

      const token = await getIdTokenOrThrow();

      const res = await fetch(buildUrl(`/projects/${projectId}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: trimmedName,
          address: addressPayload,
          expectedDeliveryAt: expectedDeliveryAtPayload,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Erro ao salvar (HTTP ${res.status})`);
      }

      const data = (await res.json()) as ProjectResponseDto;

      onProjectUpdated?.(data);
      if (onAfterSaveRefresh) await Promise.resolve(onAfterSaveRefresh());

      setIsDirty(false);
      showToast({
        tone: "success",
        title: "Salvo",
        message: "Projeto atualizado com sucesso.",
      });
      onClose();
    } catch {
      showToast({
        tone: "error",
        title: "Não foi possível salvar",
        message: "Tente novamente em instantes.",
      });
    } finally {
      setSaving(false);
    }
  };

  const doPatchStatus = async (next: ProjectStatus) => {
    const token = await getIdTokenOrThrow();

    const res = await fetch(buildUrl(`/projects/${projectId}`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: next }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Erro ao atualizar status (HTTP ${res.status})`);
    }

    const data = (await res.json()) as ProjectResponseDto;

    setStatus(next);

    if (next === "COMPLETED") onConclude?.(data);
    if (next === "ARCHIVED") onArchive?.(data);
    if (next === "ACTIVE") onReactivate?.(data);

    onProjectUpdated?.(data);

    if (onAfterSaveRefresh) await Promise.resolve(onAfterSaveRefresh());

    showToast({
      tone: "success",
      title: "Status atualizado",
      message: "O status do projeto foi atualizado com sucesso.",
    });
  };

  const patchStatus = async (next: ProjectStatus) => {
    if (!canEdit) return;
    if (busy) return;

    const label =
      next === "COMPLETED"
        ? "Concluir projeto"
        : next === "ARCHIVED"
          ? "Arquivar projeto"
          : "Reativar projeto";

    const baseDescription =
      next === "COMPLETED"
        ? "Marcar como concluído. Você ainda pode ver o histórico depois."
        : next === "ARCHIVED"
          ? "Arquivar esconde o projeto das listas principais (recomendado para obras antigas)."
          : "Reativar coloca o projeto como ativo novamente.";

    const shouldGateByOpenTasks = next === "COMPLETED" || next === "ARCHIVED";

    let hasOpenTasks = false;

    if (shouldGateByOpenTasks) {
      try {
        setPendingStatus(`checking:${next}`);
        hasOpenTasks = await hasOpenTaskLinked();
      } catch {
        hasOpenTasks = false;
      } finally {
        setPendingStatus(null);
      }
    }

    const description = hasOpenTasks
      ? `Ainda existem tarefas abertas neste projeto.\n\nSe você ${next === "COMPLETED" ? "concluir" : "arquivar"}, essas tarefas continuarão abertas. Deseja continuar mesmo assim?`
      : baseDescription;

    const tone: "default" | "danger" = hasOpenTasks ? "danger" : "default";

    openConfirm({
      title: label,
      description,
      icon:
        next === "COMPLETED"
          ? "check-circle-outline"
          : next === "ARCHIVED"
            ? "archive"
            : "refresh",
      confirmText: "Confirmar",
      cancelText: "Cancelar",
      tone,
      onConfirm: async () => {
        try {
          setConfirm((prev) => (prev ? { ...prev, busy: true } : prev));
          setPendingStatus(`updating:${next}`);

          await doPatchStatus(next);

          closeConfirm();
        } catch {
          showToast({
            tone: "error",
            title: "Não foi possível atualizar",
            message: "Tente novamente em instantes.",
          });
          closeConfirm();
        } finally {
          setPendingStatus(null);
          setConfirm((prev) => (prev ? { ...prev, busy: false } : prev));
        }
      },
    });
  };

  const handleDelete = async () => {
    if (!canEdit) return;
    if (saving || deleting) return;

    setDeleting(true);

    let hasTasks = false;
    try {
      hasTasks = await hasOpenTaskLinked();
    } catch {
      hasTasks = false;
    } finally {
      setDeleting(false);
    }

    const title = hasTasks
      ? "Ainda existem tarefas abertas"
      : "Deletar projeto?";

    const message = hasTasks
      ? "Este projeto ainda tem tarefas abertas.\n\nDeseja excluir mesmo assim? Essa ação não pode ser desfeita."
      : "Essa ação não pode ser desfeita. O projeto será removido para todos.";

    openConfirm({
      title,
      description: message,
      icon: "delete-outline",
      confirmText: "Deletar",
      cancelText: "Cancelar",
      tone: "danger",
      onConfirm: async () => {
        try {
          setConfirm((prev) => (prev ? { ...prev, busy: true } : prev));
          setDeleting(true);

          const token = await getIdTokenOrThrow();

          const res = await fetch(buildUrl(`/projects/${projectId}`), {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(text || `Erro ao deletar (HTTP ${res.status})`);
          }

          onProjectDeleted?.();

          showToast({
            tone: "success",
            title: "Projeto deletado",
            message: "O projeto foi removido com sucesso.",
          });

          closeConfirm();
          onClose();
        } catch {
          showToast({
            tone: "error",
            title: "Não foi possível deletar",
            message: "Tente novamente em instantes.",
          });
          closeConfirm();
        } finally {
          setDeleting(false);
          setConfirm((prev) => (prev ? { ...prev, busy: false } : prev));
        }
      },
    });
  };

  // Ref sempre aponta para o handleClose mais recente — evita stale closure
  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;

  // Gesture only on header area (no conflict with ScrollView)
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onUpdate((event) => {
          if (isAnimatingRef.current) return;
          if (event.translationY > 0) {
            dragTranslateY.setValue(event.translationY);
          }
        })
        .onEnd((event) => {
          const shouldClose = event.translationY > 150 || event.velocityY > 800;

          if (shouldClose) {
            void closeAnimated(); // ✅ no spring-back -> no jump
            return;
          }

          Animated.spring(dragTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 120,
            friction: 10,
          }).start();
        }),
    // closeAnimated is stable enough for this gesture and we don't want to
    // re-create the gesture on every render just because of the linter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dragTranslateY],
  );

  // Reset drag whenever opens
  useEffect(() => {
    if (visible) dragTranslateY.setValue(0);
  }, [visible, dragTranslateY]);

  const statusUI = statusMeta(status);

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      animationType="none"
      transparent
      presentationStyle={Platform.OS === "ios" ? "overFullScreen" : undefined}
      statusBarTranslucent={Platform.OS === "android"}
      onRequestClose={handleClose}
    >
      <View style={styles.root}>
        {/* Backdrop layer */}
        <Animated.View
          pointerEvents={visible ? "auto" : "none"}
          style={[
            StyleSheet.absoluteFillObject,
            styles.backdropLayer,
            { opacity: backdropOpacity },
          ]}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFillObject}
            onPress={handleClose}
            disabled={busy}
          />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: combinedTranslateY }] },
          ]}
        >
          <GestureDetector gesture={panGesture}>
            <View>
              <View style={styles.dragHandle} />

              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconWrap}>
                    <MaterialIcons
                      name="settings"
                      size={18}
                      color={colors.primary}
                    />
                  </View>

                  <View style={{ gap: 2, flex: 1 }}>
                    <Text style={styles.title}>Configurações do projeto</Text>
                    <Text style={styles.subtitle} numberOfLines={1}>
                      ID: {projectId}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleClose}
                  activeOpacity={0.8}
                  style={styles.closeBtn}
                  disabled={busy}
                >
                  <MaterialIcons
                    name="close"
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </GestureDetector>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingBottom: Math.max(insets.bottom, spacing[24]),
            }}
          >
            {/* Status */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Status do projeto</Text>

                <View style={[styles.statusPill, statusUI.pill]}>
                  <MaterialIcons
                    // @ts-expect-error runtime ok
                    name={statusUI.icon}
                    size={14}
                    color={colors.title}
                  />
                  <Text style={styles.statusPillText}>{statusUI.label}</Text>
                </View>
              </View>

              <View style={styles.statusActionsRow}>
                {status !== "COMPLETED" && (
                  <TouchableOpacity
                    onPress={() => patchStatus("COMPLETED")}
                    activeOpacity={0.9}
                    disabled={busy || !canEdit}
                    style={[
                      styles.secondaryBtn,
                      (busy || !canEdit) && { opacity: 0.6 },
                    ]}
                  >
                    {pendingStatus === "checking:COMPLETED" ||
                    pendingStatus === "updating:COMPLETED" ? (
                      <View style={styles.btnRow}>
                        <ActivityIndicator />
                        <Text style={styles.secondaryBtnText}>
                          {pendingStatus === "checking:COMPLETED"
                            ? "Verificando..."
                            : "Atualizando..."}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <MaterialIcons
                          name="check-circle-outline"
                          size={18}
                          color={colors.title}
                        />
                        <Text style={styles.secondaryBtnText}>Concluir</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {status !== "ARCHIVED" && (
                  <TouchableOpacity
                    onPress={() => patchStatus("ARCHIVED")}
                    activeOpacity={0.9}
                    disabled={busy || !canEdit}
                    style={[
                      styles.secondaryBtn,
                      (busy || !canEdit) && { opacity: 0.6 },
                    ]}
                  >
                    {pendingStatus === "checking:ARCHIVED" ||
                    pendingStatus === "updating:ARCHIVED" ? (
                      <View style={styles.btnRow}>
                        <ActivityIndicator />
                        <Text style={styles.secondaryBtnText}>
                          {pendingStatus === "checking:ARCHIVED"
                            ? "Verificando..."
                            : "Atualizando..."}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <MaterialIcons
                          name="archive"
                          size={18}
                          color={colors.title}
                        />
                        <Text style={styles.secondaryBtnText}>Arquivar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {status !== "ACTIVE" && (
                  <TouchableOpacity
                    onPress={() => patchStatus("ACTIVE")}
                    activeOpacity={0.9}
                    disabled={busy || !canEdit}
                    style={[
                      styles.secondaryBtn,
                      (busy || !canEdit) && { opacity: 0.6 },
                    ]}
                  >
                    {pendingStatus === "updating:ACTIVE" ? (
                      <View style={styles.btnRow}>
                        <ActivityIndicator />
                        <Text style={styles.secondaryBtnText}>
                          Atualizando...
                        </Text>
                      </View>
                    ) : (
                      <>
                        <MaterialIcons
                          name="refresh"
                          size={18}
                          color={colors.title}
                        />
                        <Text style={styles.secondaryBtnText}>Reativar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.helperTextLeft}>
                Concluir mantém o histórico. Arquivar tira das listas
                principais, mas não apaga.
              </Text>
            </View>

            {/* Nome */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nome do projeto</Text>

              <View style={styles.inputWrap}>
                <MaterialIcons
                  name="drive-file-rename-outline"
                  size={18}
                  color={colors.iconMuted}
                />
                <TextInput
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    setIsDirty(true);
                  }}
                  placeholder="Ex: Reforma Apto 84"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  autoCapitalize="sentences"
                  returnKeyType="done"
                  editable={!busy && canEdit}
                />
              </View>
            </View>

            {/* Endereço */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Endereço</Text>

              <View style={styles.inputWrap}>
                <MaterialIcons
                  name="location-on"
                  size={18}
                  color={colors.iconMuted}
                />
                <TextInput
                  value={address}
                  onChangeText={(t) => {
                    setAddress(t);
                    setIsDirty(true);
                  }}
                  placeholder="Ex: Rua X, 123 - Sorocaba/SP"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  autoCapitalize="sentences"
                  returnKeyType="done"
                  editable={!busy && canEdit}
                />
              </View>

              <Text style={styles.helperText}>{address.trim().length}/50</Text>
            </View>

            {/* Entrega prevista */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Entrega prevista</Text>
              </View>

              <View
                style={[
                  styles.inputWrap,
                  expectedDeliveryError ? styles.inputWrapError : null,
                ]}
              >
                <MaterialIcons
                  name="event"
                  size={18}
                  color={
                    expectedDeliveryError ? colors.danger : colors.iconMuted
                  }
                />
                <TextInput
                  value={expectedDeliveryText}
                  onChangeText={(t) => {
                    setDeliveryTouched(true);
                    setExpectedDeliveryText(maskBRDate(t));
                    setIsDirty(true);
                  }}
                  placeholder={expectedDeliveryPlaceholder}
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  keyboardType={
                    Platform.OS === "ios" ? "number-pad" : "numeric"
                  }
                  returnKeyType="done"
                  editable={!busy && canEdit}
                  maxLength={10}
                />

                {!!expectedDeliveryText.trim() && (
                  <TouchableOpacity
                    onPress={() => {
                      setDeliveryTouched(true);
                      setExpectedDeliveryText("");
                      setIsDirty(true);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.clearBtn}
                    activeOpacity={0.8}
                    disabled={busy || !canEdit}
                  >
                    <MaterialIcons
                      name="close"
                      size={18}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {!!expectedDeliveryError ? (
                <Text style={styles.errorText}>{expectedDeliveryError}</Text>
              ) : (
                <Text style={styles.helperTextLeft}>
                  Digite a data completa (DD/MM/AAAA).
                </Text>
              )}

              <TouchableOpacity
                onPress={handleSave}
                activeOpacity={0.9}
                disabled={!canSave}
                style={[
                  styles.primaryBtn,
                  !canSave && styles.primaryBtnDisabled,
                ]}
              >
                {saving ? (
                  <View style={styles.btnRow}>
                    <ActivityIndicator />
                    <Text style={styles.primaryBtnText}>Salvando...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryBtnText}>Salvar alterações</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Access */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Pessoas com acesso</Text>
                <View style={styles.countPill}>
                  <Text style={styles.countPillText}>
                    {membersLoading ? "…" : membersState.length}
                  </Text>
                </View>
              </View>

              <View style={styles.memberList}>
                {membersLoading && membersState.length === 0 ? (
                  <View style={styles.memberLoadingRow}>
                    <ActivityIndicator size="small" color={colors.textMuted} />
                    <Text style={styles.memberLoadingText}>
                      Carregando pessoas com acesso...
                    </Text>
                  </View>
                ) : (
                  membersState.map((m) => (
                    <View key={m.id} style={styles.memberRow}>
                      <View style={styles.memberLeft}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {(m.name?.trim()?.[0] ?? "U").toUpperCase()}
                          </Text>
                        </View>

                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={styles.memberName} numberOfLines={1}>
                            {m.name}
                            {m.isCurrentUser ? " (Eu)" : ""}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.memberRight}>
                        <View
                          style={[
                            styles.chip,
                            m.isOwner
                              ? styles.chipOwner
                              : roleChipStyle(m.role),
                          ]}
                        >
                          <Text style={styles.chipText}>
                            {m.isOwner ? "RESPONSÁVEL" : roleLabel(m.role)}
                          </Text>
                        </View>

                        {!m.isCurrentUser && !!m.phone && (
                          <TouchableOpacity
                            style={styles.whatsappBtn}
                            activeOpacity={0.8}
                            onPress={() => void openWhatsApp(m.phone!)}
                          >
                            <FontAwesome
                              name="whatsapp"
                              size={16}
                              color="#fff"
                            />
                          </TouchableOpacity>
                        )}

                        {canManageMembersAccess &&
                          !m.isOwner &&
                          !m.isCurrentUser &&
                          m.role !== "engenheiro" && (
                            <TouchableOpacity
                              onPress={() => {
                                openConfirm({
                                  title: "Remover acesso?",
                                  description: `Remover ${m.name} do projeto?`,
                                  icon: "person-remove",
                                  confirmText: "Remover",
                                  cancelText: "Cancelar",
                                  tone: "danger",
                                  onConfirm: () =>
                                    handleRemoveMemberInternal(m),
                                });
                              }}
                              activeOpacity={0.85}
                              style={styles.removeBtn}
                              disabled={busy}
                            >
                              <MaterialIcons
                                name="person-remove"
                                size={18}
                                color={colors.danger}
                              />
                            </TouchableOpacity>
                          )}
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* Danger zone */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Zona de risco</Text>

              <TouchableOpacity
                onPress={handleDelete}
                activeOpacity={0.9}
                style={[
                  styles.dangerBtn,
                  (busy || !canEdit) && { opacity: 0.65 },
                ]}
                disabled={busy || !canEdit}
              >
                {deleting ? (
                  <View style={styles.btnRow}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.dangerBtnText}>
                      Verificando / Deletando...
                    </Text>
                  </View>
                ) : (
                  <>
                    <MaterialIcons
                      name="delete-outline"
                      size={18}
                      color={colors.white}
                    />
                    <Text style={styles.dangerBtnText}>Deletar projeto</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.dangerHint}>
                Remover projeto e dados associados (diário, fotos, gastos,
                tarefas).
              </Text>
            </View>
          </ScrollView>
        </Animated.View>

        <ConfirmSheet
          visible={!!confirm}
          title={confirm?.title ?? ""}
          description={confirm?.description}
          tone={confirm?.tone ?? "default"}
          icon={confirm?.icon ?? "help-outline"}
          confirmText={confirm?.confirmText ?? "Confirmar"}
          cancelText={confirm?.cancelText ?? "Cancelar"}
          busy={!!confirm?.busy}
          onCancel={() => {
            if (confirm?.busy) return;
            closeConfirm();
          }}
          onConfirm={async () => {
            await confirm?.onConfirm?.();
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },

  // ✅ backdrop separado do sheet
  backdropLayer: {
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
    maxHeight: "88%",
    paddingTop: spacing[10],
    paddingHorizontal: spacing[16],
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: -10 },
      },
      android: { elevation: 16 },
    }),
  },

  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dividerSoft,
    alignSelf: "center",
    marginBottom: spacing[10],
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing[10],
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerSoft,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
    flex: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.tintBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.title,
    letterSpacing: -0.2,
  },
  subtitle: { fontSize: 12, color: colors.textMuted },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },

  section: { paddingTop: spacing[14], gap: spacing[10] },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[10],
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.title,
    letterSpacing: 0.2,
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[10],
    borderWidth: 1,
    borderColor: colors.dividerSoft,
  },
  inputWrapError: { borderColor: "#FECACA", backgroundColor: "#FFF1F2" },
  input: { flex: 1, fontSize: 14, color: colors.text, fontWeight: "700" },

  helperText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: -4,
    textAlign: "right",
  },
  helperTextLeft: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: -4,
    textAlign: "left",
    lineHeight: 15,
  },
  errorText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: -4,
    fontWeight: "700",
  },

  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dividerSoft,
  },

  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing[12],
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: colors.white, fontSize: 14, fontWeight: "800" },

  secondaryBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    gap: spacing[8],
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.dividerSoft,
    borderRadius: radius.lg,
    paddingVertical: spacing[10],
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.title,
    letterSpacing: 0.2,
  },

  btnRow: { flexDirection: "row", alignItems: "center", gap: spacing[10] },

  countPill: {
    minWidth: 28,
    paddingHorizontal: spacing[10],
    height: 26,
    borderRadius: 999,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.dividerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  countPillText: { fontSize: 12, fontWeight: "800", color: colors.textMuted },

  memberList: { gap: spacing[10] },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing[12],
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dividerSoft,
  },
  memberLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
    flex: 1,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.tintBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontWeight: "900", color: colors.primary },
  memberName: { fontSize: 14, fontWeight: "800", color: colors.text },
  memberEmail: { fontSize: 12, color: colors.textMuted },

  memberRight: { flexDirection: "row", alignItems: "center", gap: spacing[10] },
  chip: {
    paddingHorizontal: spacing[10],
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  chipEng: { backgroundColor: "#EEF0F8", borderColor: "#DDE2F7" },
  chipClient: { backgroundColor: "#ECFDF5", borderColor: "#CFFAEA" },
  chipGuest: { backgroundColor: "#FFF7ED", borderColor: "#FFE3C4" },
  chipOwner: { backgroundColor: "#EEF2FF", borderColor: "#C7D2FE" },

  memberLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingVertical: spacing[8],
  },
  memberLoadingText: {
    fontSize: 12,
    color: colors.textMuted,
  },

  whatsappBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#25D366",
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FFE4E6",
  },

  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[8],
    backgroundColor: colors.danger,
    borderRadius: radius.lg,
    paddingVertical: spacing[12],
  },
  dangerBtnText: { color: colors.white, fontSize: 14, fontWeight: "900" },
  dangerHint: { fontSize: 12, color: colors.textMuted, lineHeight: 16 },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    paddingHorizontal: spacing[10],
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: colors.title,
  },
  statusPillActive: { backgroundColor: "#EEF2FF", borderColor: "#C7D2FE" },
  statusPillCompleted: { backgroundColor: "#ECFDF5", borderColor: "#CFFAEA" },
  statusPillArchived: { backgroundColor: "#FFF7ED", borderColor: "#FFE3C4" },
  statusActionsRow: { flexDirection: "row", gap: spacing[10] },
});
