import type { ObraDetalhe } from "@/data/obras";
import { PRIMARY } from "@/utils/obra-utils";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface EngFinancialSummaryProps {
  obra: ObraDetalhe;
}

export function EngFinancialSummary({ obra }: EngFinancialSummaryProps) {
  const percentualOrcamento = Math.round(
    (obra.totalInvestido / obra.orcamento) * 100,
  );

  return (
    <>
      <Text style={styles.engSectionTitle}>Resumo Financeiro</Text>
      <View style={styles.financialSummary}>
        <View style={styles.finSummaryRow}>
          <Text style={styles.finSummaryLabel}>Orçamento Total</Text>
          <Text style={styles.finSummaryValue}>
            {obra.orcamento.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </Text>
        </View>
        <View style={styles.finSummaryRow}>
          <Text style={styles.finSummaryLabel}>Total Investido</Text>
          <Text style={[styles.finSummaryValue, { color: "#EF4444" }]}>
            {obra.totalInvestido.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </Text>
        </View>
        <View style={styles.finDivider} />
        <View style={styles.finSummaryRow}>
          <Text style={styles.finSummaryLabel}>Saldo Disponível</Text>
          <Text style={[styles.finSummaryValue, { color: "#22C55E" }]}>
            {(obra.orcamento - obra.totalInvestido).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </Text>
        </View>
        <View style={styles.finProgressBar}>
          <View
            style={[
              styles.finProgressFill,
              {
                width: `${Math.min(percentualOrcamento, 100)}%` as `${number}%`,
              },
            ]}
          />
        </View>
        <Text style={styles.finProgressText}>
          {percentualOrcamento}% do orçamento utilizado
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  engSectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  financialSummary: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  finSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  finSummaryLabel: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  finSummaryValue: { fontSize: 16, fontWeight: "700", color: "#111827" },
  finDivider: { height: 1, backgroundColor: "#E5E7EB" },
  finProgressBar: {
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 4,
  },
  finProgressFill: { height: "100%", backgroundColor: PRIMARY },
  finProgressText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    textAlign: "center",
  },
});
