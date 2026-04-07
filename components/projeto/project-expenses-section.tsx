import { ExpenseItem } from "@/components/projeto/expense-item";
import type { Gasto, Tarefa } from "@/data/obras";
import { PRIMARY } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ProjectExpensesSectionProps {
  gastos: Gasto[];
  tarefas: Tarefa[];
  onEdit?: (expense: Gasto) => void;
  onDelete?: (id: string) => void;
  isExpenseLoading?: (expenseId: string) => boolean;
}

export function ProjectExpensesSection({
  gastos,
  tarefas,
  onEdit,
  isExpenseLoading,
}: ProjectExpensesSectionProps) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Gastos Registrados</Text>
        <View style={styles.ativasBadge}>
          <Text style={styles.ativasText}>{gastos.length} itens</Text>
        </View>
      </View>

      {gastos.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="receipt" size={48} color="#D1D5DB" />
          <Text style={styles.emptyStateText}>Nenhum gasto registrado</Text>
        </View>
      ) : (
        gastos.map((expense) => (
          <ExpenseItem
            key={expense.id}
            expense={expense}
            tarefas={tarefas}
            onEdit={onEdit}
            isLoading={isExpenseLoading?.(expense.id) ?? false}
          />
        ))
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  ativasBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ativasText: { fontSize: 12, fontWeight: "700", color: PRIMARY },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },
});
