import type { ObraDetalhe } from "@/data/obras";
import { PRIMARY } from "@/utils/obra-utils";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ProjectFinancialCardsProps {
  obra: ObraDetalhe;
}

export function ProjectFinancialCards({ obra }: ProjectFinancialCardsProps) {
  const percentualGasto = Math.round(
    (obra.totalInvestido / obra.orcamento) * 100,
  );

  return (
    <View style={styles.cardsRow}>
      <View style={styles.finCard}>
        <Text style={styles.finCardLabel}>GASTO</Text>
        <Text style={styles.finCardValue}>
          {obra.totalInvestido.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </Text>
        <View style={styles.finBarTrack}>
          <View
            style={[
              styles.finBarFill,
              {
                width: `${percentualGasto}%` as `${number}%`,
                backgroundColor: PRIMARY,
              },
            ]}
          />
        </View>
      </View>
      <View style={styles.finCard}>
        <Text style={styles.finCardLabel}>ORÇAMENTO</Text>
        <Text style={styles.finCardValue}>
          {obra.orcamento.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </Text>
        <View style={styles.finBarTrack}>
          <View
            style={[
              styles.finBarFill,
              { width: "100%", backgroundColor: "#E5E7EB" },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  finCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  finCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  finCardValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  finBarTrack: {
    height: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 2,
    overflow: "hidden",
  },
  finBarFill: {
    height: "100%",
    borderRadius: 2,
  },
});
