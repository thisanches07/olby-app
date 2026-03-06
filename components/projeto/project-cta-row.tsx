import { PRIMARY } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type BottomTabId = "projetos" | "tarefas" | "gastos" | "financeiro";

interface ProjectCTARowProps {
  activeTab: BottomTabId;
  onAddTask?: () => void;
  onAddExpense?: () => void;
  onDefault?: () => void;
}

export function ProjectCTARow({
  activeTab,
  onAddTask,
  onAddExpense,
  onDefault,
}: ProjectCTARowProps) {
  return (
    <View style={styles.ctaWrap}>
      {activeTab === "tarefas" ? (
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={onAddTask}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.ctaBtnText}>Adicionar Tarefa</Text>
        </TouchableOpacity>
      ) : activeTab === "gastos" ? (
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={onAddExpense}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.ctaBtnText}>Adicionar Gasto</Text>
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
  ctaBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});
