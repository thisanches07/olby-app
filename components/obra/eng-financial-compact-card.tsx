import type { ObraDetalhe } from "@/data/obras";
import { PRIMARY, formatCompact } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface EngFinancialCompactCardProps {
  obra: ObraDetalhe;
  onEditPress?: () => void;
}

export function EngFinancialCompactCard({
  obra,
  onEditPress,
}: EngFinancialCompactCardProps) {
  const orcamento = obra.orcamento;

  const hasBudget =
    typeof orcamento === "number" &&
    Number.isFinite(orcamento) &&
    orcamento > 0;

  const percentualOrcamento = hasBudget
    ? Math.min(Math.round((obra.totalInvestido / orcamento) * 100), 999)
    : null;

  const saldo = hasBudget ? orcamento - obra.totalInvestido : null;

  const barColor = !hasBudget
    ? PRIMARY
    : percentualOrcamento! >= 90
      ? "#EF4444"
      : percentualOrcamento! >= 70
        ? "#F97316"
        : PRIMARY;

  const fillWidth = hasBudget
    ? (`${Math.min(percentualOrcamento!, 100)}%` as `${number}%`)
    : ("100%" as const);

  return (
    <TouchableOpacity
      style={styles.finCompactCard}
      onPress={onEditPress}
      activeOpacity={onEditPress ? 0.82 : 1}
      disabled={!onEditPress}
    >
      <View style={styles.finCompactHeader}>
        <Text style={styles.finCompactTitle}>FINANCEIRO</Text>
        {onEditPress ? (
          <View style={styles.finEditChip}>
            <MaterialIcons name="edit" size={11} color={PRIMARY} />
            <Text style={styles.finEditText}>Ajustar</Text>
          </View>
        ) : (
          <View style={styles.finLockedChip}>
            <MaterialIcons name="lock" size={11} color="#9CA3AF" />
            <Text style={styles.finLockedText}>
              {obra.status === "concluida" ? "Concluída" : "Arquivada"}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.finBarRow}>
        <View style={styles.finCompactTrack}>
          <View
            style={[
              styles.finCompactFill,
              !hasBudget && styles.finCompactFillNoBudget,
              {
                width: fillWidth,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>

        {hasBudget ? (
          <Text style={[styles.finBarPercent, { color: barColor }]}>
            {percentualOrcamento}%
          </Text>
        ) : (
          <View style={styles.noBudgetBadge}>
            <Text style={styles.noBudgetBadgeText}>Sem teto</Text>
          </View>
        )}
      </View>

      {/* Métricas */}
      {hasBudget ? (
        <View style={styles.finMetricsRow}>
          <View style={styles.finMetricItem}>
            <Text style={styles.finMetricLabel}>Gasto</Text>
            <Text style={[styles.finMetricValue, { color: PRIMARY }]}>
              {formatCompact(obra.totalInvestido)}
            </Text>
          </View>

          <View style={styles.finMetricDivider} />

          <View style={[styles.finMetricItem, { alignItems: "center" }]}>
            <Text style={styles.finMetricLabel}>Saldo</Text>
            <Text
              style={[
                styles.finMetricValue,
                { color: (saldo ?? 0) >= 0 ? "#22C55E" : "#EF4444" },
              ]}
            >
              {formatCompact(Math.abs(saldo ?? 0))}
            </Text>
          </View>

          <View style={styles.finMetricDivider} />

          <View style={[styles.finMetricItem, { alignItems: "flex-end" }]}>
            <Text style={styles.finMetricLabel}>Orçamento</Text>
            <Text style={[styles.finMetricValue, { color: "#374151" }]}>
              {formatCompact(orcamento)}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.finMetricsRow}>
          <View style={styles.finMetricItem}>
            <Text style={styles.finMetricLabel}>Gasto</Text>
            <Text style={[styles.finMetricValue, { color: PRIMARY }]}>
              {formatCompact(obra.totalInvestido)}
            </Text>
          </View>

          <View style={styles.finMetricDivider} />

          <View style={[styles.finMetricItem, { alignItems: "flex-end" }]}>
            <Text style={styles.finMetricLabel}>Orçamento</Text>
            <Text style={[styles.finMetricValue, { color: "#374151" }]}>
              Sem teto
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  finCompactCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  finCompactHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  finCompactTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.8,
  },
  finEditChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PRIMARY + "12",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  finEditText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
  },
  finBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  finCompactTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
  },
  finCompactFill: {
    height: "100%",
    borderRadius: 3,
  },
  finCompactFillNoBudget: {
    opacity: 0.35,
  },
  finBarPercent: {
    fontSize: 12,
    fontWeight: "700",
    minWidth: 36,
    textAlign: "right",
  },
  noBudgetBadge: {
    backgroundColor: PRIMARY + "12",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  noBudgetBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: PRIMARY,
    letterSpacing: 0.2,
  },
  finMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  finMetricItem: {
    flex: 1,
  },
  finMetricDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 12,
  },
  finMetricLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#9CA3AF",
    marginBottom: 3,
  },
  finMetricValue: {
    fontSize: 17,
    fontWeight: "800",
  },
  finLockedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  finLockedText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
  },
});
