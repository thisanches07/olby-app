import { formatCentsBRL } from "@/constants/quote-status";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const PRIMARY = "#2563EB";

interface Props {
  /** Total orçado da etapa em centavos, ou null se ainda não há orçamento. */
  orcadoCents: number | null;
  /** Nº de itens detalhados (para o subtítulo). */
  detailsCount?: number;
  isLoading?: boolean;
  canEdit: boolean;
  onPress: () => void;
}

/** Card de orçamento da etapa no topo da tela de etapa — abre o editor. */
export function BudgetStageCard({
  orcadoCents,
  detailsCount = 0,
  isLoading,
  canEdit,
  onPress,
}: Props) {
  const hasBudget = orcadoCents != null && orcadoCents > 0;

  // Cliente/leitura sem orçamento: não polui a tela.
  if (!canEdit && !hasBudget) return null;

  const subtitle = hasBudget
    ? detailsCount > 0
      ? `${detailsCount} ${detailsCount === 1 ? "item detalhado" : "itens detalhados"}`
      : "Valor total"
    : "Defina o valor orçado desta etapa";

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={canEdit ? 0.85 : 1}
      disabled={!canEdit}
    >
      <View style={styles.iconWrap}>
        <MaterialIcons name="account-balance-wallet" size={18} color={PRIMARY} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>Orçamento da etapa</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {isLoading ? (
        <ActivityIndicator size="small" color="#C2C8D2" />
      ) : hasBudget ? (
        <View style={styles.valueWrap}>
          <Text style={styles.value}>{formatCentsBRL(orcadoCents!)}</Text>
          {canEdit && (
            <MaterialIcons name="chevron-right" size={20} color="#C2C8D2" />
          )}
        </View>
      ) : (
        <View style={styles.addPill}>
          <MaterialIcons name="add" size={16} color={PRIMARY} />
          <Text style={styles.addText}>Adicionar</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF1F5",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginHorizontal: 16,
    marginTop: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 13.5, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 12, color: "#9CA3AF", marginTop: 1 },
  valueWrap: { flexDirection: "row", alignItems: "center", gap: 2 },
  value: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    fontVariant: ["tabular-nums"],
  },
  addPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF4FF",
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addText: { fontSize: 13, fontWeight: "700", color: PRIMARY },
});
