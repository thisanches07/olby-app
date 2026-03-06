import { ReorderableTasksList } from "@/components/projeto/reorderable-tasks-list";
import type { Tarefa } from "@/data/obras";
import { PRIMARY } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ProjectTasksContainerProps {
  tarefas: Tarefa[];
  ativas: number;
  onReorder: (tarefas: Tarefa[]) => void;
  onToggle: (id: string) => void;
  onEdit: (task: Tarefa) => void;
  onDelete: (id: string) => void;
  getPriorityConfig: (priority: string) => { color: string; label: string };
}

export function ProjectTasksContainer({
  tarefas,
  ativas,
  onReorder,
  onToggle,
  onEdit,
  onDelete,
  getPriorityConfig,
}: ProjectTasksContainerProps) {
  return (
    <View style={styles.tasksContainer}>
      <View style={styles.tasksHeader}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tarefas Pendentes</Text>
          <View style={styles.ativasBadge}>
            <Text style={styles.ativasText}>{ativas} Ativas</Text>
          </View>
        </View>
      </View>

      {tarefas.length === 0 ? (
        <View style={styles.tasksEmptyContainer}>
          <View style={styles.emptyState}>
            <MaterialIcons
              name="check-circle-outline"
              size={48}
              color="#D1D5DB"
            />
            <Text style={styles.emptyStateText}>Nenhuma tarefa</Text>
          </View>
        </View>
      ) : (
        <ReorderableTasksList
          tasks={tarefas}
          onReorder={onReorder}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
          getPriorityConfig={getPriorityConfig}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tasksContainer: {
    flex: 1,
    backgroundColor: "#F5F6FA",
  },
  tasksHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  tasksEmptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
