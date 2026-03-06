import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { CircularProgress } from "@/components/obra/circular-progress";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

interface EngHeroSectionProps {
  progresso: number;
  etapaAtual: string;
  endereco?: string;
  /** Pode vir como "Entrega prevista: 06 out 2028" ou só "06 out 2028" */
  dataPrevisaoEntrega?: string;
  onEditPress?: () => void;
}

function stripEntregaPrefix(v?: string) {
  if (!v) return "";
  return v.replace(/^Entrega prevista:\s*/i, "").trim();
}

export function EngHeroSection({
  progresso,
  etapaAtual,
  endereco,
  dataPrevisaoEntrega,
  onEditPress,
}: EngHeroSectionProps) {
  const entregaDateText = useMemo(
    () => stripEntregaPrefix(dataPrevisaoEntrega),
    [dataPrevisaoEntrega],
  );

  return (
    <View style={styles.heroRow}>
      <CircularProgress value={progresso} size={110} strokeWidth={11} />

      <View style={styles.heroInfo}>
        <View style={styles.heroBadgeRow}>
          <View style={styles.heroBadge}>
            <View style={styles.heroDot} />
            <Text style={styles.heroEtapa} numberOfLines={1}>
              {etapaAtual?.toUpperCase?.() ?? "—"}
            </Text>
          </View>

          {onEditPress && (
            <TouchableOpacity
              style={styles.heroEditBtn}
              activeOpacity={0.85}
              onPress={onEditPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="edit" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.heroMeta}>
          {!!endereco && (
            <View style={styles.metaRow}>
              <MaterialIcons name="place" size={13} color={colors.iconMuted} style={styles.metaIcon} />
              <Text style={styles.metaText} numberOfLines={2}>
                {endereco}
              </Text>
            </View>
          )}

          {!!entregaDateText && (
            <View style={styles.metaRow}>
              <MaterialIcons name="event" size={13} color={colors.primary} style={styles.metaIcon} />
              <Text style={styles.metaTextAccent} numberOfLines={1}>
                Entrega · {entregaDateText}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[16],
    paddingVertical: spacing[16],
  },
  heroInfo: {
    flex: 1,
    gap: spacing[8],
  },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroEditBtn: {
    flexShrink: 0,
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.tintBlue,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.dividerSoft,
  },

  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EEF0F8",
    borderRadius: spacing[20],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[5],
    gap: spacing[6],
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  heroEtapa: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.8,
  },

  heroMeta: {
    gap: spacing[6],
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[6],
  },
  metaIcon: {
    marginTop: 1,
    flexShrink: 0,
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
    lineHeight: 17,
  },
  metaTextAccent: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    lineHeight: 17,
  },
});
