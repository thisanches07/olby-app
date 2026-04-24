import { PRIMARY } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type EngTabId = "projetos" | "tarefas" | "gastos" | "documentos" | "financeiro";

interface EngCTARowProps {
  activeTab: EngTabId;
  onAddTask?: () => void;
  onAddExpense?: () => void;
  onAddDocument?: () => void;
  onDefault?: () => void;
  disabledMessage?: string | null;
}

export function EngCTARow({
  activeTab,
  onAddTask,
  onAddExpense,
  onAddDocument,
  onDefault,
  disabledMessage,
}: EngCTARowProps) {
  const isTaskTab = activeTab === "tarefas";
  const isExpenseTab = activeTab === "gastos";
  const isDocumentTab = activeTab === "documentos";
  const isDisabled =
    (isTaskTab && !onAddTask) ||
    (isExpenseTab && !onAddExpense) ||
    (isDocumentTab && !onAddDocument);

  return (
    <View style={styles.ctaWrap}>
      {isTaskTab ? (
        <TouchableOpacity
          style={[styles.ctaBtn, isDisabled && styles.ctaBtnDisabled]}
          onPress={onAddTask}
          activeOpacity={isDisabled ? 1 : 0.85}
          disabled={isDisabled}
        >
          <MaterialIcons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.ctaBtnText}>Adicionar Tarefa</Text>
        </TouchableOpacity>
      ) : isExpenseTab ? (
        <TouchableOpacity
          style={[styles.ctaBtn, isDisabled && styles.ctaBtnDisabled]}
          onPress={onAddExpense}
          activeOpacity={isDisabled ? 1 : 0.85}
          disabled={isDisabled}
        >
          <MaterialIcons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.ctaBtnText}>Adicionar Gasto</Text>
        </TouchableOpacity>
      ) : isDocumentTab ? (
        <TouchableOpacity
          style={[styles.ctaBtn, isDisabled && styles.ctaBtnDisabled]}
          onPress={onAddDocument}
          activeOpacity={isDisabled ? 1 : 0.85}
          disabled={isDisabled}
        >
          <MaterialIcons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.ctaBtnText}>Adicionar Documento</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={onDefault}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.ctaBtnText}>Adicionar Registro</Text>
        </TouchableOpacity>
      )}

      {!!disabledMessage && isDisabled && (
        <Text style={styles.limitHint}>{disabledMessage}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ctaWrap: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#F5F6FA",
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
    borderRadius: 28,
    paddingVertical: 16,
    gap: 8,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaBtnDisabled: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  limitHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
  },
});
