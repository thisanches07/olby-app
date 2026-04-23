import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import type { ProjectAccessMember } from "@/utils/project-members";
import { toWhatsAppUrl } from "@/utils/phone";

interface ClienteTeamModalProps {
  visible: boolean;
  onClose: () => void;
  members: ProjectAccessMember[];
}

const ROLE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  engenheiro: { bg: "#EEF2FF", text: "#4F65C9", label: "Responsável" },
  cliente: { bg: "#ECFDF5", text: "#16A34A", label: "Cliente" },
  convidado: { bg: "#ECFDF5", text: "#16A34A", label: "Cliente" },
};

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function ClienteTeamModal({ visible, onClose, members }: ClienteTeamModalProps) {
  const insets = useSafeAreaInsets();

  const sorted = [...members].sort((a, b) => {
    if (a.isOwner && !b.isOwner) return -1;
    if (!a.isOwner && b.isOwner) return 1;
    if (a.role === "engenheiro" && b.role !== "engenheiro") return -1;
    if (a.role !== "engenheiro" && b.role === "engenheiro") return 1;
    return 0;
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Sheet */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing[16] }]}>
        {/* Drag handle */}
        <View style={styles.handle} />

        {/* Title row */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>Equipe da Obra</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <MaterialIcons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          {sorted.length === 1 ? "1 pessoa com acesso" : `${sorted.length} pessoas com acesso`}
        </Text>

        {/* Member list */}
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {sorted.map((member, index) => {
            const cfg = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.convidado;
            const waUrl = member.phone ? toWhatsAppUrl(member.phone) : null;
            const isLast = index === sorted.length - 1;

            return (
              <View key={member.id} style={[styles.row, isLast && styles.rowLast]}>
                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.initials, { color: cfg.text }]}>
                    {getInitials(member.name)}
                  </Text>
                </View>

                {/* Info */}
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {member.name ?? "Usuário"}
                    </Text>
                    {member.isCurrentUser && (
                      <Text style={styles.euLabel}>(Eu)</Text>
                    )}
                  </View>
                  <View style={[styles.rolePill, { backgroundColor: cfg.bg, borderColor: cfg.bg }]}>
                    <Text style={[styles.roleText, { color: cfg.text }]}>{cfg.label}</Text>
                  </View>
                </View>

                {/* WhatsApp button */}
                {waUrl ? (
                  <TouchableOpacity
                    style={styles.waBtn}
                    onPress={() => Linking.openURL(waUrl)}
                    activeOpacity={0.75}
                  >
                    <FontAwesome name="whatsapp" size={18} color="#fff" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.waBtnPlaceholder} />
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
    paddingTop: spacing[10],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },

  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing[14],
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[20],
    marginBottom: spacing[4],
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },

  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    paddingHorizontal: spacing[20],
    marginBottom: spacing[16],
  },

  list: {
    paddingHorizontal: spacing[16],
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerSoft,
    gap: spacing[12],
  },
  rowLast: {
    borderBottomWidth: 0,
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  info: {
    flex: 1,
    gap: spacing[4],
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    flexWrap: "wrap",
  },
  memberName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  euLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
  },
  rolePill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: spacing[8],
    paddingVertical: 3,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "600",
  },

  waBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
  },
  waBtnPlaceholder: {
    width: 40,
    height: 40,
  },
});
