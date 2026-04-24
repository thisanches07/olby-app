import { Skeleton } from "@/components/ui/skeleton";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Gasto, Tarefa } from "@/data/obras";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const PRIMARY = "#2563EB";

interface ExpenseItemProps {
  expense: Gasto;
  tarefas?: Tarefa[];
  onEdit?: (expense: Gasto) => void;
  onMorePress?: () => void;
  onDocumentsPress?: (expense: Gasto) => void;
  /** Abre diretamente o comprovante vinculado (sem abrir o sheet de documentos) */
  onReceiptPress?: (expense: Gasto) => void;
  /** Toque no card inteiro (funciona mesmo em readOnly) */
  onPress?: (expense: Gasto) => void;
  readOnly?: boolean;
  isLoading?: boolean;
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
  onDocumentsPress,
  onReceiptPress,
  onPress,
  readOnly = false,
  isLoading = false,
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
  const hasDocuments =
    Boolean(expense.receiptDocumentId) || (expense.documentCount ?? 0) > 0;

  const canTap = (!readOnly && !!onEdit) || !!onPress;

  // Loading pulse animation
  const loadingOpacity = useSharedValue(1);

  useEffect(() => {
    if (isLoading) {
      loadingOpacity.value = withRepeat(
        withTiming(0.45, { duration: 700 }),
        -1,
        true,
      );
    } else {
      loadingOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [isLoading]);

  const loadingStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
  }));

  return (
    <PressableScale
      style={styles.container}
      onPress={canTap ? () => (onPress ? onPress(expense) : onEdit!(expense)) : undefined}
      disabled={!canTap}
      scaleTo={0.975}
      haptic={canTap ? "light" : "none"}
    >
      <Animated.View style={[styles.content, loadingStyle]}>
        {/* ── Header: amount + menu ─────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.value}>{formattedValue}</Text>
            <Text style={styles.description} numberOfLines={2}>
              {expense.descricao}
            </Text>
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

        {/* ── Thin divider ─────────────────────────────────── */}
        <View style={styles.divider} />

        {/* ── Footer: date | category dot | attachment ─────── */}
        <View style={styles.footer}>
          <Text style={styles.date}>{isoToBR(expense.data)}</Text>
          <View style={styles.footerRight}>
            <View style={styles.categoryRow}>
              <View
                style={[
                  styles.categoryDot,
                  { backgroundColor: categoryConfig.color },
                ]}
              />
              <Text style={styles.categoryLabel}>{categoryConfig.label}</Text>
            </View>
            {hasDocuments ? (
              <TouchableOpacity
                onPress={() =>
                  expense.receiptDocumentId && onReceiptPress
                    ? onReceiptPress(expense)
                    : onDocumentsPress?.(expense)
                }
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                activeOpacity={0.6}
              >
                <MaterialIcons name="attach-file" size={15} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* ── Linked task: compact row ─────────────────────── */}
        {tarefaVinculada && (
          <TouchableOpacity
            onPress={() => setTaskExpanded((v) => !v)}
            activeOpacity={tarefaVinculada.descricao ? 0.7 : 1}
            disabled={!tarefaVinculada.descricao}
          >
            <View style={styles.taskRow}>
              <MaterialIcons
                name="link"
                size={13}
                color={PRIMARY}
                style={styles.taskIcon}
              />
              <Text
                style={styles.taskTitle}
                numberOfLines={taskExpanded ? undefined : 1}
              >
                {tarefaVinculada.titulo}
              </Text>
              {tarefaVinculada.descricao ? (
                <MaterialIcons
                  name={taskExpanded ? "expand-less" : "expand-more"}
                  size={14}
                  color={PRIMARY}
                />
              ) : null}
            </View>
            {taskExpanded && tarefaVinculada.descricao ? (
              <Text style={styles.taskDesc}>{tarefaVinculada.descricao}</Text>
            ) : null}
          </TouchableOpacity>
        )}
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    gap: 0,
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
  value: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    fontWeight: "400",
    color: "#6B7280",
    lineHeight: 18,
  },
  moreBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -2,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  date: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
  },
  taskIcon: {
    marginTop: 1,
  },
  taskTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: PRIMARY,
    lineHeight: 18,
  },
  taskDesc: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 17,
    marginTop: 4,
    marginLeft: 18,
  },
});

// ─── Skeleton card (mirrors real card layout) ──────────────────────────────

export function ExpenseSkeletonCard() {
  return (
    <View style={skeletonStyles.container}>
      <Skeleton width="40%" height={20} borderRadius={6} />
      <Skeleton
        width="65%"
        height={13}
        borderRadius={5}
        style={skeletonStyles.mt6}
      />
      <View style={skeletonStyles.divider} />
      <View style={skeletonStyles.footerRow}>
        <Skeleton width={70} height={11} borderRadius={4} />
        <View style={skeletonStyles.footerRight}>
          <Skeleton width={50} height={11} borderRadius={4} />
          <Skeleton width={14} height={14} borderRadius={3} />
        </View>
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  mt6: {
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
