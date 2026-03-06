import { Tarefa } from "@/data/obras";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface TaskActionsProps {
  task: Tarefa;
  onEdit: (task: Tarefa) => void;
  onDelete: (id: string) => void;
}

export function TaskActions({ task, onEdit, onDelete }: TaskActionsProps) {
  const [confirmVisible, setConfirmVisible] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.editButton]}
        onPress={() => onEdit(task)}
        activeOpacity={0.7}
      >
        <MaterialIcons name="edit" size={16} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.deleteButton]}
        onPress={() => setConfirmVisible(true)}
        activeOpacity={0.7}
      >
        <MaterialIcons name="delete" size={16} color="#FFFFFF" />
      </TouchableOpacity>

      <ConfirmSheet
        visible={confirmVisible}
        icon="delete-outline"
        iconColor="#EF4444"
        title="Remover tarefa"
        message={`Tem certeza que deseja remover "${task.titulo}"?`}
        confirmLabel="Remover"
        confirmVariant="destructive"
        onConfirm={() => onDelete(task.id)}
        onClose={() => setConfirmVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 6,
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  editButton: {
    backgroundColor: "#2563EB",
  },
  deleteButton: {
    backgroundColor: "#EF4444",
  },
});
