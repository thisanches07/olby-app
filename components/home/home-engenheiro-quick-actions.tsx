import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const PRIMARY = "#2563EB";

interface HomeEngenheiroQuickActionsProps {
  onAddTask?: () => void;
  onAddExpense?: () => void;
  onViewAnalytics?: () => void;
}

export function HomeEngenheiroQuickActions({
  onAddTask,
  onAddExpense,
  onViewAnalytics,
}: HomeEngenheiroQuickActionsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ações Rápidas</Text>
      <View style={styles.grid}>
        <QuickActionButton
          icon="add-task"
          label="Nova Tarefa"
          onPress={onAddTask}
        />
        <QuickActionButton
          icon="receipt"
          label="Registrar Gasto"
          onPress={onAddExpense}
        />
        <QuickActionButton
          icon="analytics"
          label="Dashboard"
          onPress={onViewAnalytics}
        />
      </View>
    </View>
  );
}

function QuickActionButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <View style={styles.buttonIcon}>
        <MaterialIcons name={icon} size={24} color={PRIMARY} />
      </View>
      <Text style={styles.buttonLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  buttonLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },
});
