import FontAwesome from "@expo/vector-icons/FontAwesome";
import React from "react";
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import type { ProjectAccessMember } from "@/utils/project-members";
import { toWhatsAppUrl } from "@/utils/phone";

interface ClienteTeamSectionProps {
  members: ProjectAccessMember[];
}

const AVATAR_CONFIG: Record<string, { bg: string; text: string }> = {
  engenheiro: { bg: "#EEF2FF", text: "#4F65C9" },
  cliente: { bg: "#ECFDF5", text: "#16A34A" },
  convidado: { bg: "#FFF7ED", text: "#D97706" },
};

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

function getFirstName(name: string | null | undefined): string {
  if (!name) return "Usuário";
  return name.trim().split(/\s+/)[0] ?? "Usuário";
}

function getRoleLabel(role: string): string {
  if (role === "engenheiro") return "Engenheiro";
  if (role === "cliente") return "Cliente";
  return "Convidado";
}

export function ClienteTeamSection({ members }: ClienteTeamSectionProps) {
  const visible = members.filter((m) => !m.isCurrentUser);
  if (visible.length < 1) return null;

  const label = visible.length === 1 ? "1 pessoa" : `${visible.length} pessoas`;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.dot} />
        <Text style={styles.sectionLabel}>EQUIPE</Text>
        <Text style={styles.countBadge}>{label}</Text>
      </View>

      {/* Horizontal member strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {visible.map((member) => {
          const avatarStyle = AVATAR_CONFIG[member.role] ?? AVATAR_CONFIG.convidado;
          const waUrl = member.phone ? toWhatsAppUrl(member.phone) : null;

          return (
            <View key={member.id} style={styles.chip}>
              {/* Avatar */}
              <View style={[styles.avatar, { backgroundColor: avatarStyle.bg }]}>
                <Text style={[styles.initials, { color: avatarStyle.text }]}>
                  {getInitials(member.name)}
                </Text>
              </View>

              {/* Name */}
              <Text style={styles.name} numberOfLines={1}>
                {getFirstName(member.name)}
              </Text>

              {/* Role pill */}
              <View style={[styles.rolePill, { borderColor: avatarStyle.bg }]}>
                <Text style={[styles.roleText, { color: avatarStyle.text }]}>
                  {getRoleLabel(member.role)}
                </Text>
              </View>

              {/* WhatsApp button or spacer */}
              {waUrl ? (
                <TouchableOpacity
                  style={styles.waBtn}
                  onPress={() => Linking.openURL(waUrl)}
                  activeOpacity={0.75}
                >
                  <FontAwesome name="whatsapp" size={15} color="#fff" />
                </TouchableOpacity>
              ) : (
                <View style={styles.waBtnPlaceholder} />
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    marginHorizontal: spacing[16],
    marginTop: spacing[14],
    marginBottom: spacing[4],
    borderRadius: radius.lg,
    paddingTop: spacing[14],
    paddingBottom: spacing[16],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    paddingHorizontal: spacing[16],
    marginBottom: spacing[14],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.8,
    flex: 1,
  },
  countBadge: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.subtext,
  },

  strip: {
    paddingHorizontal: spacing[16],
    gap: spacing[10],
    flexDirection: "row",
  },

  chip: {
    alignItems: "center",
    width: 76,
    gap: spacing[5],
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[2],
  },
  initials: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  name: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    maxWidth: 72,
  },

  rolePill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing[6],
    paddingVertical: 2,
    backgroundColor: "transparent",
  },
  roleText: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  waBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing[2],
  },
  waBtnPlaceholder: {
    width: 30,
    height: 30,
    marginTop: spacing[2],
  },
});
