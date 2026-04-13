import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useRef, useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";

import { PressableScale } from "@/components/ui/pressable-scale";
import { useAuth } from "@/hooks/use-auth";
import { colors } from "@/theme/colors";
import { tapMedium } from "@/utils/haptics";

export type StatusType =
  | "em_andamento"
  | "concluida"
  | "pausada"
  | "planejamento";

export interface ObraMember {
  id?: string;
  projectId?: string;
  userId: string;
  userName: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
  role: string;
  status?: string;
  joinedAt?: string;
  createdAt?: string;
}

export interface Obra {
  id: string;
  nome: string;
  cliente: string;
  endereco: string;
  status: StatusType;
  progresso: number;
  dataInicio: string;
  dataPrevisao: string;
  members?: ObraMember[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  OWNER: "#2563EB",
  PRO: "#7C3AED",
  CLIENT_VIEWER: "#059669",
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Responsável",
  PRO: "Engenheiro",
  CLIENT_VIEWER: "Cliente",
};

const STATUS_CONFIG: Record<
  StatusType,
  { label: string; color: string; bg: string; dot: string }
> = {
  em_andamento: {
    label: "Em Andamento",
    color: "#1D4ED8",
    bg: "#DBEAFE",
    dot: "#3B82F6",
  },
  concluida: {
    label: "Concluída",
    color: "#15803D",
    bg: "#DCFCE7",
    dot: "#22C55E",
  },
  pausada: {
    label: "Arquivada",
    color: "#B45309",
    bg: "#FEF3C7",
    dot: "#F59E0B",
  },
  planejamento: {
    label: "Planejamento",
    color: "#6D28D9",
    bg: "#EDE9FE",
    dot: "#8B5CF6",
  },
};

const PROGRESS_COLORS: Record<StatusType, string> = {
  em_andamento: "#3B82F6",
  concluida: "#22C55E",
  pausada: "#F59E0B",
  planejamento: "#8B5CF6",
};

const MAX_AVATARS = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function openWhatsApp(phone: string) {
  const digits = phone.replace(/\D/g, "");
  Linking.openURL(`https://wa.me/${digits}`);
}

// ─── Members List Modal ───────────────────────────────────────────────────────

interface MembersListModalProps {
  visible: boolean;
  members: ObraMember[];
  onClose: () => void;
}

function MembersListModal({
  visible,
  members,
  onClose,
}: MembersListModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={modal.overlay} />
      </TouchableWithoutFeedback>

      <View style={modal.sheet}>
        {/* Handle */}
        <View style={modal.handle} />

        {/* Header */}
        <View style={modal.header}>
          <Text style={modal.title}>Membros com acesso</Text>
          <View style={modal.countBadge}>
            <Text style={modal.countText}>{members.length}</Text>
          </View>
        </View>

        {/* List */}
        <ScrollView
          style={modal.list}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {members.map((m, index) => {
            const roleColor = ROLE_COLORS[m.role] ?? "#6B7280";
            const roleLabel = ROLE_LABELS[m.role] ?? m.role;
            const initials = getInitials(m.userName);
            const hasPhone = !!m.userPhone;

            return (
              <View
                key={m.userId}
                style={[
                  modal.memberRow,
                  index < members.length - 1 && modal.memberRowBorder,
                ]}
              >
                {/* Avatar */}
                <View
                  style={[modal.memberAvatar, { backgroundColor: roleColor }]}
                >
                  <Text style={modal.memberAvatarText}>{initials}</Text>
                </View>

                {/* Info */}
                <View style={modal.memberInfo}>
                  <Text style={modal.memberName} numberOfLines={1}>
                    {m.userName ?? "Usuário"}
                  </Text>
                  <View style={modal.rolePill}>
                    <View
                      style={[modal.roleDot, { backgroundColor: roleColor }]}
                    />
                    <Text style={[modal.roleLabel, { color: roleColor }]}>
                      {roleLabel}
                    </Text>
                  </View>
                </View>

                {/* WhatsApp button */}
                {hasPhone ? (
                  <TouchableOpacity
                    style={modal.whatsappBtn}
                    activeOpacity={0.8}
                    onPress={() => openWhatsApp(m.userPhone!)}
                  >
                    <FontAwesome name="whatsapp" size={18} color="#fff" />
                  </TouchableOpacity>
                ) : (
                  <View style={modal.whatsappBtnDisabled}>
                    <MaterialIcons
                      name="phone-disabled"
                      size={18}
                      color="#9CA3AF"
                    />
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Close */}
        <TouchableOpacity
          style={modal.closeBtn}
          activeOpacity={0.8}
          onPress={onClose}
        >
          <Text style={modal.closeBtnText}>Fechar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── ObraCard ─────────────────────────────────────────────────────────────────

interface ObraCardProps {
  obra: Obra;
  onPress?: () => void;
  onViewDiary?: () => void;
}

export function ObraCard({ obra, onPress, onViewDiary }: ObraCardProps) {
  const { backendUserId } = useAuth();
  const [showMembersModal, setShowMembersModal] = useState(false);

  const {
    nome,
    cliente,
    endereco,
    status,
    progresso,
    dataInicio,
    dataPrevisao,
    members,
  } = obra;

  // Exclui o próprio usuário logado usando o ID interno do backend
  const otherMembers = (members ?? []).filter(
    (m) => !backendUserId || m.userId !== backendUserId,
  );
  const visibleAvatars = otherMembers.slice(0, MAX_AVATARS);
  const extraCount = Math.max(0, otherMembers.length - MAX_AVATARS);
  const hasMembers = otherMembers.length > 0;

  const statusInfo = STATUS_CONFIG[status];
  const progressColor = PROGRESS_COLORS[status];

  const swipeRef = useRef<Swipeable>(null);

  const progressWidth = useSharedValue(0);
  useEffect(() => {
    progressWidth.value = withDelay(
      120,
      withSpring(progresso, { damping: 22, stiffness: 90 }),
    );
  }, [progresso]);

  const progressAnimStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%` as `${number}%`,
  }));

  const renderRightActions = () => (
    <View style={styles.swipeActions}>
      {onViewDiary && (
        <Pressable
          style={[styles.swipeBtn, styles.swipeBtnDiary]}
          onPress={() => {
            swipeRef.current?.close();
            onViewDiary();
          }}
        >
          <MaterialIcons name="menu-book" size={20} color="#fff" />
          <Text style={styles.swipeBtnText}>Diário</Text>
        </Pressable>
      )}
      <Pressable
        style={[styles.swipeBtn, styles.swipeBtnView]}
        onPress={() => {
          swipeRef.current?.close();
          onPress?.();
        }}
      >
        <MaterialIcons name="visibility" size={20} color="#fff" />
        <Text style={styles.swipeBtnText}>Ver</Text>
      </Pressable>
    </View>
  );

  return (
    <>
      <Swipeable
        ref={swipeRef}
        renderRightActions={renderRightActions}
        onSwipeableWillOpen={() => tapMedium()}
        friction={2}
        overshootRight={false}
        containerStyle={styles.swipeContainer}
      >
        <PressableScale style={styles.card} onPress={onPress} scaleTo={0.975}>
          <View style={styles.cardHeader}>
            <View
              style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}
            >
              <View
                style={[styles.statusDot, { backgroundColor: statusInfo.dot }]}
              />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={22}
              color={colors.iconMuted}
            />
          </View>

          <Text style={styles.nomeProjeto} numberOfLines={1}>
            {nome}
          </Text>
          <Text style={styles.cliente} numberOfLines={1}>
            {cliente}
          </Text>

          <View style={styles.enderecoRow}>
            <MaterialIcons
              name="location-on"
              size={13}
              color={colors.subtext}
            />
            <Text style={styles.enderecoText} numberOfLines={1}>
              {endereco}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progresso</Text>
              <Text style={[styles.progressValue, { color: progressColor }]}>
                {progresso}%
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  progressAnimStyle,
                  { backgroundColor: progressColor },
                ]}
              />
            </View>
          </View>

          <View style={styles.footer}>
            {hasMembers ? (
              <>
                {/* Grupo de avatares — toque abre a lista de membros */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    setShowMembersModal(true);
                  }}
                  style={styles.avatarGroup}
                >
                  {visibleAvatars.map((m, i) => (
                    <View
                      key={m.userId}
                      style={[
                        styles.avatar,
                        { backgroundColor: ROLE_COLORS[m.role] ?? "#6B7280" },
                        i > 0 && styles.avatarOverlap,
                      ]}
                    >
                      <Text style={styles.avatarText}>
                        {getInitials(m.userName)}
                      </Text>
                    </View>
                  ))}
                  {extraCount > 0 && (
                    <View
                      style={[
                        styles.avatar,
                        styles.avatarOverlap,
                        styles.avatarExtra,
                      ]}
                    >
                      <Text style={styles.avatarExtraText}>+{extraCount}</Text>
                    </View>
                  )}
                  {/* Indicador visual de que é clicável */}
                  <MaterialIcons
                    name="keyboard-arrow-right"
                    size={14}
                    color={colors.subtext}
                    style={styles.avatarGroupArrow}
                  />
                </TouchableOpacity>

                <View style={styles.datesColumn}>
                  <View style={styles.dateItem}>
                    <MaterialIcons
                      name="calendar-today"
                      size={11}
                      color={colors.subtext}
                    />
                    <Text style={styles.dateLabel}>Início: </Text>
                    <Text style={styles.dateValue}>{dataInicio}</Text>
                  </View>
                  <View style={[styles.dateItem, { marginTop: 3 }]}>
                    <MaterialIcons
                      name="event"
                      size={11}
                      color={colors.subtext}
                    />
                    <Text style={styles.dateLabel}>Previsão: </Text>
                    <Text style={styles.dateValue}>{dataPrevisao}</Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.dateItem}>
                  <MaterialIcons
                    name="calendar-today"
                    size={12}
                    color={colors.subtext}
                  />
                  <Text style={styles.dateLabel}>Início: </Text>
                  <Text style={styles.dateValue}>{dataInicio}</Text>
                </View>
                <View style={styles.dateItem}>
                  <MaterialIcons
                    name="event"
                    size={12}
                    color={colors.subtext}
                  />
                  <Text style={styles.dateLabel}>Previsão: </Text>
                  <Text style={styles.dateValue}>{dataPrevisao}</Text>
                </View>
              </>
            )}
          </View>
        </PressableScale>
      </Swipeable>

      <MembersListModal
        visible={showMembersModal}
        members={otherMembers}
        onClose={() => setShowMembersModal(false)}
      />
    </>
  );
}

// ─── Card styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  swipeContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
  },
  swipeActions: {
    flexDirection: "row",
    alignItems: "stretch",
    marginLeft: 8,
  },
  swipeBtn: {
    width: 72,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  swipeBtnView: { backgroundColor: "#2563EB" },
  swipeBtnDiary: { backgroundColor: "#6D28D9", marginRight: 6 },
  swipeBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter-SemiBold" },
  nomeProjeto: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
    fontFamily: "Inter-Bold",
  },
  cliente: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "500",
    marginBottom: 6,
    fontFamily: "Inter-Regular",
  },
  enderecoRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  enderecoText: {
    fontSize: 12,
    color: colors.subtext,
    flex: 1,
    fontFamily: "Inter-Regular",
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray100,
    marginVertical: 12,
  },
  progressContainer: { marginBottom: 12 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: colors.subtext,
    fontWeight: "500",
    fontFamily: "Inter-Regular",
  },
  progressValue: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter-Bold",
    fontVariant: ["tabular-nums"],
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.gray100,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  // Avatar group (clicável como unidade)
  avatarGroup: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
  },
  avatarGroupArrow: {
    marginLeft: 2,
    opacity: 0.6,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  avatarOverlap: { marginLeft: -9 },
  avatarExtra: { backgroundColor: "#E5E7EB" },
  avatarText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Inter-Bold",
  },
  avatarExtraText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#6B7280",
    fontFamily: "Inter-Bold",
  },
  datesColumn: { alignItems: "flex-end" },
  dateItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  dateLabel: {
    fontSize: 11,
    color: colors.subtext,
    fontFamily: "Inter-Regular",
  },
  dateValue: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
    fontFamily: "Inter-SemiBold",
    fontVariant: ["tabular-nums"],
  },
});

// ─── Modal styles ─────────────────────────────────────────────────────────────

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: "75%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    fontFamily: "Inter-Bold",
    flex: 1,
  },
  countBadge: {
    backgroundColor: colors.gray100,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    fontFamily: "Inter-Bold",
  },
  list: {
    marginTop: 12,
    paddingHorizontal: 20,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  memberAvatarText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    fontFamily: "Inter-Bold",
  },
  memberInfo: {
    flex: 1,
    gap: 4,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    fontFamily: "Inter-SemiBold",
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: "500",
    fontFamily: "Inter-Regular",
  },
  whatsappBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    shadowColor: "#25D366",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  whatsappBtnDisabled: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  closeBtn: {
    marginTop: 16,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.gray100,
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textMuted,
    fontFamily: "Inter-SemiBold",
  },
});
