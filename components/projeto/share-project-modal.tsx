import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import { getAuth } from "firebase/auth";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useToast } from "@/components/obra/toast";
import { api } from "@/services/api";
import { invitesService } from "@/services/invites.service";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import {
  canManageMembers as canManageMembersByRole,
  type ProjectApiRole,
} from "@/utils/project-role";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatExpiresAt(isoString: string): string {
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month} às ${hours}:${minutes}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface InviteResult {
  inviteUrl: string;
  expiresAt: string;
}

interface ShareProjectModalProps {
  visible: boolean;
  projectId: string;
  projectName: string;
  projectRole: ProjectApiRole;
  onClose: () => void;
  /** Defaults to true. Passe false para CLIENT_VIEWER. */
  canShare?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

type ProjectMemberRole = "engenheiro" | "cliente" | "convidado";
type ProjectMember = {
  id: string;
  name: string;
  email?: string;
  role: ProjectMemberRole;
  isOwner?: boolean;
  isCurrentUser?: boolean;
};

export function ShareProjectModal({
  visible,
  projectId,
  projectName,
  projectRole,
  onClose,
  canShare = true,
}: ShareProjectModalProps) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  // ── Bottom-sheet animation ──────────────────────────────────────────────────
  const [mounted, setMounted] = useState(visible);

  const { height: screenH } = Dimensions.get("window");
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetBaseTranslateY = useRef(new Animated.Value(screenH)).current;
  const dragTranslateY = useRef(new Animated.Value(0)).current;
  const isAnimatingRef = useRef(false);
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

  const closeAnimated = async () => {
    if (isLoading || isAnimatingRef.current) return;
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
      void (async () => {
        await animateOut();
        setMounted(false);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Reset drag on open
  useEffect(() => {
    if (visible) dragTranslateY.setValue(0);
  }, [visible, dragTranslateY]);

  const combinedTranslateY = useMemo(
    () => Animated.add(sheetBaseTranslateY, dragTranslateY),
    [sheetBaseTranslateY, dragTranslateY],
  );

  // Pan gesture for drag-to-close (header area only)
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
          const shouldClose =
            event.translationY > 150 || event.velocityY > 800;
          if (shouldClose) {
            void closeAnimated();
            return;
          }
          Animated.spring(dragTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 120,
            friction: 10,
          }).start();
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dragTranslateY],
  );

  // ── Invite state ───────────────────────────────────────────────────────────
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [membersState, setMembersState] = useState<ProjectMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  // Reset state on open
  useEffect(() => {
    if (visible) {
      setInviteResult(null);
      setIsLoading(false);
      setError(null);
      setCopied(false);
      setMembersState([]);
      setMembersLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;

    const loadMembers = async () => {
      try {
        setMembersLoading(true);

        type ApiMember = {
          id: string;
          role: string;
          status: string;
          userId: string;
          userName: string | null;
          userEmail: string | null;
        }[];

        const apiData = await api.get<ApiMember>(
          `/projects/${encodeURIComponent(projectId)}/members`,
        );

        const auth = getAuth();
        const currentEmail =
          auth.currentUser?.email?.trim().toLowerCase() ?? null;

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

        const mapped: ProjectMember[] = Array.isArray(apiData)
          ? apiData
              .filter((m) => m.status === "ACTIVE")
              .map((m) => {
                const email = m.userEmail?.trim() || "";
                const isOwner = m.role.toUpperCase() === "OWNER";
                const isCurrentUser =
                  !!currentEmail && email.toLowerCase() === currentEmail;

                return {
                  id: m.id,
                  name: m.userName?.trim() || "Usuário",
                  email: email || undefined,
                  role: mapRole(m.role),
                  isOwner,
                  isCurrentUser,
                };
              })
          : [];

        if (!cancelled) setMembersState(mapped);
      } catch {
        if (!cancelled) setMembersState([]);
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    };

    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, [visible, projectId]);

  const memberRoleLabel = (m: ProjectMember) => {
    if (m.isOwner) return "RESPONSÁVEL";
    if (m.role === "engenheiro") return "ENGENHEIRO";
    if (m.role === "cliente") return "CLIENTE";
    return "CONVIDADO";
  };

  const memberRoleChipStyle = (m: ProjectMember) => {
    if (m.isOwner) return styles.chipOwner;
    if (m.role === "engenheiro") return styles.chipEng;
    if (m.role === "cliente") return styles.chipClient;
    return styles.chipGuest;
  };

  const canManageMembers = useMemo(
    () => canManageMembersByRole(projectRole),
    [projectRole],
  );

  const handleRemoveMember = useCallback(
    async (member: ProjectMember) => {
      if (!canManageMembers) return;
      if (member.isOwner || member.isCurrentUser || member.role === "engenheiro")
        return;

      try {
        setRemovingMemberId(member.id);

        await api.delete(
          `/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(member.id)}`,
        );

        setMembersState((prev) => prev.filter((m) => m.id !== member.id));

        showToast({
          title: "Acesso removido",
          message: `${member.name} não tem mais acesso ao projeto.`,
          tone: "success",
        });
      } catch {
        showToast({
          title: "Não foi possível remover o acesso",
          message: "Ocorreu um erro ao remover o acesso. Tente novamente.",
          tone: "error",
        });
      } finally {
        setRemovingMemberId(null);
      }
    },
    [canManageMembers, projectId, showToast],
  );

  const handleGenerateLink = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await invitesService.create(projectId);
      setInviteResult(result);
    } catch {
      const msg = "Não foi possível gerar o link de convite.";
      setError(msg);
      showToast({ title: "Erro ao gerar link", message: msg, tone: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, showToast]);

  const handleCopy = useCallback(async () => {
    if (!inviteResult) return;
    try {
      await Clipboard.setStringAsync(inviteResult.inviteUrl);
      setCopied(true);
      showToast({ title: "Link copiado!", tone: "success" });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast({
        title: "Erro ao copiar",
        message: "Não foi possível copiar o link.",
        tone: "error",
      });
    }
  }, [inviteResult, showToast]);

  const handleShare = useCallback(async () => {
    if (!inviteResult) return;
    try {
      await Share.share({
        message: `Acompanhe o andamento do projeto "${projectName}":\n${inviteResult.inviteUrl}`,
        title: "Convite de projeto",
      });
    } catch {
      // usuário cancelou o share sheet — não é erro
    }
  }, [inviteResult, projectName]);

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      animationType="none"
      transparent
      presentationStyle={Platform.OS === "ios" ? "overFullScreen" : undefined}
      statusBarTranslucent={Platform.OS === "android"}
      onRequestClose={closeAnimated}
    >
      <View style={styles.root}>
        {/* Backdrop */}
        <Animated.View
          pointerEvents={visible ? "auto" : "none"}
          style={[
            StyleSheet.absoluteFillObject,
            styles.backdrop,
            { opacity: backdropOpacity },
          ]}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFillObject}
            onPress={closeAnimated}
            disabled={isLoading}
          />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: combinedTranslateY }] },
          ]}
        >
          {/* Drag handle + header — área de arraste */}
          <GestureDetector gesture={panGesture}>
            <View>
              <View style={styles.dragHandle} />
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconWrap}>
                    <MaterialIcons
                      name="share"
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.headerTitle}>Compartilhar Projeto</Text>
                </View>
                <TouchableOpacity
                  onPress={closeAnimated}
                  disabled={isLoading}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.closeBtn}
                >
                  <MaterialIcons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          </GestureDetector>

          {/* Content */}
          {canShare ? (
            <>
              <ScrollView
                style={[styles.scroll, { maxHeight: screenH * 0.65 }]}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Info do projeto */}
                <View style={styles.projectCard}>
                  <Text style={styles.projectLabel}>PROJETO</Text>
                  <Text style={styles.projectName}>{projectName}</Text>
                  <Text style={styles.projectDesc}>
                    Gere um link de convite. Válido por{" "}
                    <Text style={styles.projectDescBold}>24 horas</Text> e pode
                    ser usado <Text style={styles.projectDescBold}>1 vez</Text>.
                  </Text>
                </View>

                {/* Pessoas com acesso */}
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionHeader}>
                      <MaterialIcons
                        name="people-outline"
                        size={18}
                        color={colors.primary}
                      />
                      <Text style={styles.sectionTitle}>Pessoas com acesso</Text>
                    </View>

                    <View style={styles.countPill}>
                      <Text style={styles.countPillText}>
                        {membersLoading ? "…" : membersState.length}
                      </Text>
                    </View>
                  </View>

                  {membersLoading && membersState.length === 0 ? (
                    <View style={styles.memberLoadingRow}>
                      <ActivityIndicator
                        size="small"
                        color={colors.textMuted}
                      />
                      <Text style={styles.memberLoadingText}>
                        Carregando pessoas com acesso...
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.memberList}>
                      {membersState.map((m) => (
                        <View key={m.id} style={styles.memberRow}>
                          <View style={styles.memberLeft}>
                            <View style={styles.avatar}>
                              <Text style={styles.avatarText}>
                                {(m.name?.trim()?.[0] ?? "U").toUpperCase()}
                              </Text>
                            </View>

                            <View style={{ flex: 1, gap: 2 }}>
                              <Text
                                style={styles.memberName}
                                numberOfLines={1}
                              >
                                {m.name}
                                {m.isCurrentUser ? " (Eu)" : ""}
                              </Text>
                              {!!m.email && (
                                <Text
                                  style={styles.memberEmail}
                                  numberOfLines={1}
                                >
                                  {m.email}
                                </Text>
                              )}
                            </View>
                          </View>

                          <View style={styles.memberRight}>
                            <View
                              style={[styles.chip, memberRoleChipStyle(m)]}
                            >
                              <Text style={styles.chipText}>
                                {memberRoleLabel(m)}
                              </Text>
                            </View>

                            {canManageMembers &&
                              !m.isOwner &&
                              !m.isCurrentUser &&
                              m.role !== "engenheiro" && (
                                <TouchableOpacity
                                  style={styles.removeBtn}
                                  activeOpacity={0.85}
                                  onPress={() => handleRemoveMember(m)}
                                  disabled={removingMemberId === m.id}
                                >
                                  {removingMemberId === m.id ? (
                                    <ActivityIndicator
                                      size="small"
                                      color={colors.danger}
                                    />
                                  ) : (
                                    <MaterialIcons
                                      name="person-remove"
                                      size={18}
                                      color={colors.danger}
                                    />
                                  )}
                                </TouchableOpacity>
                              )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                  {/* O Cliente Verá — sempre visível */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <MaterialIcons
                      name="visibility"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.sectionTitle}>O Cliente Verá</Text>
                  </View>
                  <View style={styles.viewerList}>
                    {[
                      "Informações e progresso do projeto",
                      "Tarefas e etapas",
                      "Gastos e orçamento",
                      "Fotos e diário de obra",
                    ].map((item) => (
                      <View key={item} style={styles.viewerItem}>
                        <MaterialIcons
                          name="check-circle-outline"
                          size={16}
                          color={colors.success}
                        />
                        <Text style={styles.viewerItemText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Link de compartilhamento */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <MaterialIcons
                      name="link"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.sectionTitle}>
                      Link de Compartilhamento
                    </Text>
                  </View>

                  {/* Loading */}
                  {isLoading && (
                    <View style={styles.linkLoadingBlock}>
                      <ActivityIndicator color={colors.primary} size="small" />
                      <Text style={styles.centeredBlockText}>
                        Gerando link...
                      </Text>
                    </View>
                  )}

                  {/* Erro */}
                  {error && !isLoading && !inviteResult && (
                    <View style={styles.errorBlock}>
                      <MaterialIcons
                        name="error-outline"
                        size={20}
                        color={colors.danger}
                      />
                      <Text style={styles.errorText}>{error}</Text>
                      <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={handleGenerateLink}
                      >
                        <MaterialIcons
                          name="refresh"
                          size={16}
                          color={colors.primary}
                        />
                        <Text style={styles.retryText}>Tentar novamente</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Sem link ainda */}
                  {!isLoading && !inviteResult && !error && (
                    <View style={styles.noLinkBlock}>
                      <MaterialIcons
                        name="link-off"
                        size={20}
                        color={colors.textMuted}
                      />
                      <Text style={styles.noLinkText}>
                        Nenhum link gerado ainda. Toque em &quot;Gerar link&quot; abaixo.
                      </Text>
                    </View>
                  )}

                  {/* Link gerado */}
                  {inviteResult && !isLoading && (
                    <>
                      <View style={styles.linkRow}>
                        <TextInput
                          style={styles.linkInput}
                          value={inviteResult.inviteUrl}
                          editable={false}
                          selectionColor={colors.gray200}
                          numberOfLines={1}
                        />
                        <TouchableOpacity
                          style={[
                            styles.copyBtn,
                            copied && styles.copyBtnDone,
                          ]}
                          onPress={handleCopy}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons
                            name={copied ? "check" : "content-copy"}
                            size={16}
                            color={copied ? colors.success : colors.primary}
                          />
                          <Text
                            style={[
                              styles.copyBtnText,
                              copied && { color: colors.success },
                            ]}
                          >
                            {copied ? "Copiado!" : "Copiar"}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.badgesRow}>
                        <View style={styles.badge}>
                          <MaterialIcons
                            name="schedule"
                            size={13}
                            color={colors.textMuted}
                          />
                          <Text style={styles.badgeText}>
                            Expira em{" "}
                            <Text style={styles.badgeHighlight}>
                              {formatExpiresAt(inviteResult.expiresAt)}
                            </Text>
                          </Text>
                        </View>
                        <View style={styles.badge}>
                          <MaterialIcons
                            name="vpn-key"
                            size={13}
                            color={colors.textMuted}
                          />
                          <Text style={styles.badgeText}>Uso único</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.regenerateBtn}
                        onPress={handleGenerateLink}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons
                          name="refresh"
                          size={15}
                          color={colors.textMuted}
                        />
                        <Text style={styles.regenerateText}>
                          Gerar novo link
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                <View style={{ height: spacing[8] }} />
              </ScrollView>

              {/* Footer */}
              <View
                style={[
                  styles.footer,
                  { paddingBottom: Math.max(insets.bottom, spacing[12]) },
                ]}
              >
                {inviteResult && !isLoading ? (
                  <>
                    <TouchableOpacity
                      style={styles.footerSecondary}
                      onPress={closeAnimated}
                    >
                      <Text style={styles.footerSecondaryText}>Fechar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.footerPrimary}
                      onPress={handleShare}
                    >
                      <MaterialIcons
                        name="share"
                        size={18}
                        color={colors.white}
                      />
                      <Text style={styles.footerPrimaryText}>
                        Compartilhar…
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.footerPrimary,
                      { flex: 1 },
                      isLoading && styles.footerDisabled,
                    ]}
                    onPress={handleGenerateLink}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <MaterialIcons
                        name="link"
                        size={18}
                        color={colors.white}
                      />
                    )}
                    <Text style={styles.footerPrimaryText}>
                      {isLoading ? "Gerando..." : "Gerar link"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            /* ── Sem permissão ─────────────────────────────────────────────── */
            <>
              <View style={styles.noPermContainer}>
                <View style={styles.noPermIconWrap}>
                  <MaterialIcons
                    name="lock-outline"
                    size={36}
                    color={colors.textMuted}
                  />
                </View>
                <Text style={styles.noPermTitle}>Acesso restrito</Text>
                <Text style={styles.noPermText}>
                  Você não tem permissão para compartilhar este projeto. Somente
                  o responsável ou profissionais do projeto podem gerar links de
                  convite.
                </Text>
              </View>
              <View
                style={[
                  styles.footer,
                  { paddingBottom: Math.max(insets.bottom, spacing[12]) },
                ]}
              >
                <TouchableOpacity
                  style={[styles.footerPrimary, { flex: 1 }]}
                  onPress={closeAnimated}
                >
                  <Text style={styles.footerPrimaryText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },

  backdrop: {
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
    maxHeight: "88%",
    paddingTop: spacing[10],
    paddingHorizontal: spacing[20],
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
    marginBottom: spacing[12],
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing[12],
    marginBottom: spacing[4],
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
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scroll: {},
  scrollContent: {
    paddingTop: spacing[16],
  },

  // ── Projeto card ──────────────────────────────────────────────────────────
  projectCard: {
    backgroundColor: colors.tintBlue,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: spacing[16],
    borderRadius: radius.md,
    marginBottom: spacing[20],
  },
  projectLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.8,
    marginBottom: spacing[4],
  },
  projectName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing[6],
  },
  projectDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  projectDescBold: {
    fontWeight: "700",
    color: colors.text,
  },

  // ── Link loading / no-link inline states ─────────────────────────────────
  linkLoadingBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
    paddingVertical: spacing[12],
  },
  noLinkBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
    backgroundColor: colors.gray100,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
  },
  noLinkText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },

  // ── Centered state blocks ─────────────────────────────────────────────────
  centeredBlock: {
    alignItems: "center",
    paddingVertical: spacing[32],
    gap: spacing[10],
  },
  centeredBlockText: {
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: "500",
  },
  generateIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.tintBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  generateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.title,
  },
  generateDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: spacing[16],
  },

  // ── Erro ─────────────────────────────────────────────────────────────────
  errorBlock: {
    backgroundColor: "#FEF2F2",
    borderRadius: radius.md,
    padding: spacing[16],
    alignItems: "center",
    gap: spacing[10],
    marginBottom: spacing[16],
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: "500",
    textAlign: "center",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[5],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[14],
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },

  // ── Seção ─────────────────────────────────────────────────────────────────
  section: { marginBottom: spacing[20] },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    marginBottom: spacing[12],
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[10],
    marginBottom: spacing[12],
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },

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

  memberRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
  },

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

  // ── Link + copiar ─────────────────────────────────────────────────────────
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  linkInput: {
    flex: 1,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[10],
    fontSize: 12,
    color: colors.text,
    fontFamily: "monospace",
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[5],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[10],
    backgroundColor: colors.tintBlue,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
  },
  copyBtnDone: {
    borderColor: colors.success,
    backgroundColor: "#F0FDF4",
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },

  // ── Badges de validade ────────────────────────────────────────────────────
  badgesRow: {
    flexDirection: "row",
    gap: spacing[10],
    marginBottom: spacing[20],
    flexWrap: "wrap",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[5],
    backgroundColor: colors.gray100,
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[6],
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "500",
  },
  badgeHighlight: {
    fontWeight: "700",
    color: colors.text,
  },

  // ── O cliente verá ────────────────────────────────────────────────────────
  viewerList: { gap: spacing[8] },
  viewerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
  },
  viewerItemText: {
    fontSize: 13,
    color: colors.title,
    fontWeight: "500",
  },

  // ── Gerar novo link ───────────────────────────────────────────────────────
  regenerateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[5],
    paddingVertical: spacing[10],
  },
  regenerateText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "500",
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    gap: spacing[12],
    paddingTop: spacing[12],
    borderTopWidth: 1,
    borderTopColor: colors.dividerSoft,
  },
  footerSecondary: {
    flex: 1,
    paddingVertical: spacing[12],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  footerSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.title,
  },
  footerPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[8],
    paddingVertical: spacing[12],
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  footerDisabled: { opacity: 0.6 },
  footerPrimaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },

  // ── Sem permissão ─────────────────────────────────────────────────────────
  noPermContainer: {
    alignItems: "center",
    paddingVertical: spacing[32],
    paddingHorizontal: spacing[12],
    gap: spacing[12],
  },
  noPermIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  noPermTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.title,
    textAlign: "center",
  },
  noPermText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});
