import { Tarefa } from "@/data/obras";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DraggableFlatList from "react-native-draggable-flatlist";
import { TaskActions } from "./task-actions";

const PRIMARY = "#2563EB";

interface ReorderableTasksListProps {
  tasks: Tarefa[];
  onReorder: (tarefas: Tarefa[]) => void;
  onToggle: (id: string) => void;
  onEdit: (task: Tarefa) => void;
  onDelete: (id: string) => void;
  getPriorityConfig: (priority: string) => { color: string; label: string };
  contentContainerStyle?: any;
}

export function ReorderableTasksList({
  tasks,
  onReorder,
  onToggle,
  onEdit,
  onDelete,
  getPriorityConfig,
  contentContainerStyle,
}: ReorderableTasksListProps) {
  const handleDragEnd = ({ data }: { data: Tarefa[] }) => {
    // Recalculate order numbers for all tasks
    const reorderedTasks = data.map((task, index) => ({
      ...task,
      order: index,
    }));
    onReorder(reorderedTasks);
  };

  return (
    <DraggableFlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      onDragEnd={handleDragEnd}
      renderItem={({ item, drag, isActive }) => {
        const prio = getPriorityConfig(item.prioridade);
        return (
          <View
            style={[styles.tarefaCard, isActive && styles.tarefaCardDragging]}
          >
            {/* Drag Handle */}
            <TouchableOpacity
              onLongPress={drag}
              disabled={isActive}
              style={[styles.dragHandle, isActive && styles.dragHandleActive]}
              activeOpacity={0.6}
            >
              <MaterialIcons name="edit" size={28} color="#2563EB" />
            </TouchableOpacity>

            {/* Checkbox */}
            <TouchableOpacity
              style={[
                styles.checkbox,
                item.concluida && styles.checkboxChecked,
              ]}
              onPress={() => onToggle(item.id)}
              activeOpacity={0.7}
            >
              {item.concluida && (
                <MaterialIcons name="check" size={14} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            {/* Task Info */}
            <View style={styles.tarefaInfo}>
              <Text
                style={[
                  styles.tarefaTitulo,
                  item.concluida && styles.tarefaTituloConcluido,
                ]}
              >
                {item.titulo}
              </Text>
              {item.descricao && !item.concluida && (
                <Text style={styles.tarefaDesc}>{item.descricao}</Text>
              )}
            </View>

            {/* Priority Badge */}
            <View
              style={[
                styles.prioBadge,
                item.prioridade === "ALTA" && styles.prioBadgeAlta,
              ]}
            >
              <Text style={[styles.prioText, { color: prio.color }]}>
                {prio.label}
              </Text>
            </View>

            {/* Actions */}
            <TaskActions task={item} onEdit={onEdit} onDelete={onDelete} />
          </View>
        );
      }}
      scrollEnabled={false}
      nestedScrollEnabled={true}
      activationDistance={20}
      contentContainerStyle={[styles.listContainer, contentContainerStyle]}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  tarefaCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    marginHorizontal: 0,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  tarefaCardDragging: {
    opacity: 0.7,
    backgroundColor: "#F9FAFB",
  },
  dragHandle: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 0,
    paddingRight: 4,
  },
  dragHandleActive: {
    backgroundColor: "#E8ECFF",
    borderRadius: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  tarefaInfo: {
    flex: 1,
    gap: 2,
  },
  tarefaTitulo: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  tarefaTituloConcluido: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  tarefaDesc: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  prioBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  prioBadgeAlta: {
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  prioText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
