import type { ObraDetalhe } from "@/data/obras";
import { PRIMARY, formatBRL, formatCompact } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ClienteFinancialSummaryProps {
  obra: ObraDetalhe;
  onVerGastos?: () => void;
}

export function ClienteFinancialSummary({
  obra,
  onVerGastos,
}: ClienteFinancialSummaryProps) {
  // ── Financeiro ───────────────────────────────────────
  const pct = Math.min(
    Math.round((obra.totalInvestido / Math.max(obra.orcamento, 1)) * 100),
    100,
  );
  const saldo = obra.orcamento - obra.totalInvestido;
  const barColor =
    pct >= 90 ? "#EF4444" : pct >= 70 ? "#F97316" : PRIMARY;

  // ── Gastos teaser ─────────────────────────────────────
  const totalGastos = obra.gastos.reduce((s, g) => s + g.valor, 0);

  return (
    <>
      <Text style={styles.sectionTitle}>FINANCEIRO</Text>
      <View style={styles.card}>

        {/* ── Barra de progresso ─────────────────────── */}
        <View style={styles.barRow}>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${pct}%` as `${number}%`,
                  backgroundColor: barColor,
                },
              ]}
            />
          </View>
          <Text style={[styles.barPct, { color: barColor }]}>{pct}%</Text>
        </View>

        {/* ── 3 métricas ─────────────────────────────── */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Gasto</Text>
            <Text style={[styles.metricValue, { color: PRIMARY }]}>
              {formatCompact(obra.totalInvestido)}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={[styles.metricItem, { alignItems: "center" }]}>
            <Text style={styles.metricLabel}>Saldo</Text>
            <Text
              style={[
                styles.metricValue,
                { color: saldo >= 0 ? "#22C55E" : "#EF4444" },
              ]}
            >
              {formatCompact(Math.abs(saldo))}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={[styles.metricItem, { alignItems: "flex-end" }]}>
            <Text style={styles.metricLabel}>Orçamento</Text>
            <Text style={[styles.metricValue, { color: "#374151" }]}>
              {formatCompact(obra.orcamento)}
            </Text>
          </View>
        </View>

        {/* ── Gastos registrados (teaser) ─────────────── */}
        {onVerGastos && (
          <>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.teaserRow}
              onPress={onVerGastos}
              activeOpacity={0.7}
            >
              <View style={styles.teaserLeft}>
                <MaterialIcons name="receipt-long" size={16} color="#6B7280" />
                <Text style={styles.teaserLabel}>
                  {obra.gastos.length} gasto
                  {obra.gastos.length !== 1 ? "s" : ""} registrado
                  {obra.gastos.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <View style={styles.teaserRight}>
                <Text style={styles.teaserValor}>
                  {formatBRL(totalGastos, false)}
                </Text>
                <MaterialIcons
                  name="chevron-right"
                  size={18}
                  color="#9CA3AF"
                />
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // ── Barra + % ────────────────────────────────────────
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 3 },
  barPct: {
    fontSize: 12,
    fontWeight: "700",
    minWidth: 36,
    textAlign: "right",
  },

  // ── 3 métricas ───────────────────────────────────────
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metricItem: { flex: 1 },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 12,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#9CA3AF",
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: "800",
  },

  // ── Divider ──────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 14,
  },

  // ── Gastos teaser ────────────────────────────────────
  teaserRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  teaserLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  teaserLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  teaserRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  teaserValor: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
});
