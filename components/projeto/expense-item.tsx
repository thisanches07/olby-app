import { Gasto, Tarefa } from "@/data/obras";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PRIMARY = "#2563EB";

interface ExpenseItemProps {
  expense: Gasto;
  tarefas?: Tarefa[];
  onEdit?: (expense: Gasto) => void;
  onMorePress?: () => void;
  readOnly?: boolean;
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  MATERIAL: { label: "Material", color: "#F97316", icon: "construction" },
  LABOR: { label: "Mão de Obra", color: "#EF4444", icon: "person" },
  TOOLS: { label: "Ferramentas", color: "#F59E0B", icon: "build" },
  SERVICES: { label: "Serviços", color: "#8B5CF6", icon: "business" },
  TRANSPORT: { label: "Transporte", color: "#0EA5E9", icon: "local-shipping" },
  FEES: { label: "Taxas", color: "#10B981", icon: "receipt" },
  CONTINGENCY: { label: "Imprevistos", color: "#F43F5E", icon: "warning" },
  OTHER: { label: "Outros", color: "#6B7280", icon: "category" },
};

function isoToBR(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function ExpenseItem({
  expense,
  tarefas,
  onEdit,
  onMorePress,
  readOnly = false,
}: ExpenseItemProps) {
  const [taskExpanded, setTaskExpanded] = useState(false);

  const categoryConfig = useMemo(
    () => CATEGORY_CONFIG[expense.categoria] ?? CATEGORY_CONFIG.OTHER,
    [expense.categoria],
  );

  const formattedValue = useMemo(
    () =>
      expense.valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    [expense.valor],
  );

  const tarefaVinculada = useMemo(
    () => tarefas?.find((t) => t.id === expense.tarefaId),
    [tarefas, expense.tarefaId],
  );

  const canTap = !readOnly && !!onEdit;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={canTap ? () => onEdit!(expense) : undefined}
      activeOpacity={canTap ? 0.82 : 1}
      disabled={!canTap}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.description} numberOfLines={2}>
              {expense.descricao}
            </Text>
            <Text style={styles.value}>{formattedValue}</Text>
          </View>

          {!readOnly && onMorePress && (
            <TouchableOpacity
              style={styles.moreBtn}
              onPress={onMorePress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.6}
            >
              <MaterialIcons name="more-vert" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.date}>{isoToBR(expense.data)}</Text>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: categoryConfig.color },
            ]}
          >
            <MaterialIcons
              name={categoryConfig.icon as any}
              size={12}
              color="#FFFFFF"
              style={styles.categoryIcon}
            />
            <Text style={styles.categoryLabel}>{categoryConfig.label}</Text>
          </View>
        </View>

        {/* Etapa vinculada — bloco expansível */}
        {tarefaVinculada && (
          <TouchableOpacity
            style={styles.taskBlock}
            onPress={() => setTaskExpanded((v) => !v)}
            activeOpacity={tarefaVinculada.descricao ? 0.75 : 1}
            disabled={!tarefaVinculada.descricao}
          >
            <View style={styles.taskBlockHeader}>
              <View style={styles.taskBlockHeaderLeft}>
                <MaterialIcons name="link" size={11} color={PRIMARY} />
                <Text style={styles.taskBlockLabel}>ETAPA VINCULADA</Text>
              </View>
              {tarefaVinculada.descricao ? (
                <MaterialIcons
                  name={taskExpanded ? "expand-less" : "expand-more"}
                  size={15}
                  color="#93C5FD"
                />
              ) : null}
            </View>

            <Text
              style={styles.taskBlockTitle}
              numberOfLines={taskExpanded ? undefined : 1}
            >
              {tarefaVinculada.titulo}
            </Text>

            {taskExpanded && tarefaVinculada.descricao ? (
              <Text style={styles.taskBlockDesc}>
                {tarefaVinculada.descricao}
              </Text>
            ) : null}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  description: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 20,
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
    color: PRIMARY,
  },
  moreBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -2,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  date: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  categoryIcon: {
    marginRight: 2,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ── Bloco de etapa vinculada ──────────────────────────────
  taskBlock: {
    marginTop: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
  },
  taskBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  taskBlockHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  taskBlockLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#93C5FD",
    letterSpacing: 0.5,
  },
  taskBlockTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E40AF",
    lineHeight: 18,
  },
  taskBlockDesc: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "400",
    lineHeight: 17,
    marginTop: 6,
    opacity: 0.9,
  },
});
