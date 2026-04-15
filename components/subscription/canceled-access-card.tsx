import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import {
  formatSubscriptionDate,
  type PlanCode,
} from "@/services/subscription.service";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { shadow } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";

const PLAN_LABELS: Record<PlanCode, string> = {
  FREE: "Gratuito",
  BASIC: "Básico",
  PRO: "Profissional",
};

interface CanceledAccessCardProps {
  code: PlanCode;
  accessUntil: string;
  canceledAt?: string | null;
  style?: StyleProp<ViewStyle>;
}

export function CanceledAccessCard({
  code,
  accessUntil,
  canceledAt,
  style,
}: CanceledAccessCardProps) {
  const accessUntilLabel =
    formatSubscriptionDate(accessUntil, { verbose: true }) ??
    "fim do período atual";
  const canceledAtLabel = formatSubscriptionDate(canceledAt);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <View style={styles.statePill}>
          <MaterialIcons name="event-busy" size={14} color="#92400E" />
          <Text style={styles.statePillText}>Assinatura cancelada</Text>
        </View>
        <View style={styles.renewPill}>
          <Text style={styles.renewPillText}>Não renova</Text>
        </View>
      </View>

      <Text style={styles.title}>Seu plano continua ativo até</Text>

      <View style={styles.datePanel}>
        <Text style={styles.dateValue}>{accessUntilLabel}</Text>
        <Text style={styles.dateCaption}>
          Acesso mantido normalmente até o fim do ciclo atual
        </Text>
      </View>

      <Text style={styles.description}>
        O cancelamento já foi registrado, mas seu plano{" "}
        <Text style={styles.descriptionStrong}>{PLAN_LABELS[code]}</Text> segue
        liberado até a data acima.
      </Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MaterialIcons name="check-circle" size={15} color={colors.success} />
          <Text style={styles.metaText}>Acesso ativo por enquanto</Text>
        </View>
        {canceledAtLabel ? (
          <View style={styles.metaItem}>
            <MaterialIcons name="schedule" size={15} color={colors.textMuted} />
            <Text style={styles.metaText}>Cancelada em {canceledAtLabel}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFDF7",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "#F3E8C8",
    padding: spacing[20],
    gap: spacing[14],
    ...shadow(1),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[8],
  },
  statePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    backgroundColor: "#FEF3C7",
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[6],
    borderRadius: radius.pill,
  },
  statePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
  },
  renewPill: {
    backgroundColor: "#F9FAFB",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[6],
  },
  renewPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.title,
    letterSpacing: -0.2,
  },
  datePanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[14],
    gap: spacing[4],
  },
  dateValue: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.8,
  },
  dateCaption: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B45309",
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
  descriptionStrong: {
    fontWeight: "700",
    color: colors.text,
  },
  metaRow: {
    gap: spacing[8],
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
});
