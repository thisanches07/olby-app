import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { FadeSlideIn } from "@/components/ui/fade-slide-in";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tarefa } from "@/data/obras";
import { PRIMARY, getPriorityConfig } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { Swipeable } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// ─── Priority badge background colors ────────────────────────────────────────
const PRIORITY_BG: Record<string, string> = {
  ALTA: "#FEE2E2",
  MEDIA: "#FFF7ED",
  BAIXA: "#F0FDF4",
};

// ─── Animated checkbox sub-component ─────────────────────────────────────────
function TaskCheckbox({
  checked,
  readOnly,
  onPress,
}: {
  checked: boolean;
  readOnly: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(1.3, { damping: 8, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    });
    onPress();
  };

  return (
    <Pressable onPress={handlePress} disabled={readOnly} hitSlop={8}>
      <Animated.View
        style={[
          styles.checkbox,
          checked && styles.checkboxChecked,
          readOnly && !checked && styles.checkboxReadOnly,
          animStyle,
        ]}
      >
        {checked && <MaterialIcons name="check" size={14} color="#FFFFFF" />}
        {readOnly && !checked && (
          <MaterialIcons name="lock" size={11} color="#9CA3AF" />
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── Animated progress bar ────────────────────────────────────────────────────
function ProgressBar({ pct }: { pct: number }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(pct, { duration: 600 });
  }, [pct]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%` as any,
  }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, barStyle]} />
    </View>
  );
}

// ─── TaskCard props ───────────────────────────────────────────────────────────
interface TaskCardProps {
  tarefa: Tarefa;
  readOnly: boolean;
  showActions: boolean;
  expandedIds: Set<string>;
  onTogglePress: () => void;
  onToggleExpand: (id: string) => void;
  onEdit?: (task: Tarefa) => void;
  onMorePress?: (task: Tarefa) => void;
  drag?: () => void;
  isActive?: boolean;
}

// ─── Individual task card (proper component to hold its own hooks) ────────────
function TaskCard({
  tarefa,
  readOnly,
  showActions,
  expandedIds,
  onTogglePress,
  onToggleExpand,
  onEdit,
  onMorePress,
  drag,
  isActive,
}: TaskCardProps) {
  const prio = getPriorityConfig(tarefa.prioridade);
  const isExpanded = expandedIds.has(tarefa.id);
  const hasLongDesc =
    !!tarefa.descricao &&
    (tarefa.descricao.length > 70 || tarefa.descricao.includes("\n"));

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={
        readOnly || drag
          ? undefined
          : () => {
              scale.value = withSpring(0.975, { damping: 15, stiffness: 300 });
            }
      }
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      onPress={readOnly || drag ? undefined : onTogglePress}
    >
      <Animated.View
        style={[
          styles.tarefaCard,
          tarefa.concluida && styles.tarefaCardConcluida,
          readOnly && styles.tarefaCardReadOnly,
          isActive && styles.tarefaCardDragging,
          animStyle,
        ]}
      >

        {/* Checkbox */}
        <TaskCheckbox
          checked={tarefa.concluida}
          readOnly={readOnly}
          onPress={onTogglePress}
        />

        {/* Content */}
        <View style={styles.tarefaInfo}>
          <Text
            style={[
              styles.tarefaTitulo,
              tarefa.concluida && styles.tarefaTituloConcluido,
            ]}
            numberOfLines={2}
          >
            {tarefa.titulo}
          </Text>

          {tarefa.descricao ? (
            <>
              <Text
                style={styles.tarefaDesc}
                numberOfLines={isExpanded ? undefined : 2}
              >
                {tarefa.descricao}
              </Text>

              {hasLongDesc && (
                <TouchableOpacity
                  onPress={() => onToggleExpand(tarefa.id)}
                  hitSlop={{ top: 4, bottom: 8, left: 0, right: 16 }}
                  activeOpacity={0.6}
                  style={styles.expandRow}
                >
                  <Text style={styles.expandBtnText}>
                    {isExpanded ? "Ver menos" : "Ver mais"}
                  </Text>
                  <MaterialIcons
                    name={isExpanded ? "expand-less" : "expand-more"}
                    size={14}
                    color={PRIMARY}
                  />
                </TouchableOpacity>
              )}
            </>
          ) : null}
        </View>

        {/* Priority badge */}
        <View
          style={[
            styles.prioBadge,
            { backgroundColor: PRIORITY_BG[tarefa.prioridade] ?? "#F3F4F6" },
          ]}
        >
          <Text style={[styles.prioText, { color: prio.color }]}>
            {prio.label}
          </Text>
        </View>

        {/* Overflow menu */}
        {showActions && onMorePress && !readOnly && (
          <TouchableOpacity
            onPress={() => onMorePress(tarefa)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
            style={styles.moreBtn}
            activeOpacity={0.6}
          >
            <MaterialIcons name="more-vert" size={20} color="#C4C9D4" />
          </TouchableOpacity>
        )}

        {/* Drag handle */}
        {drag && (
          <TouchableOpacity
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              drag();
            }}
            delayLongPress={150}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            activeOpacity={0.4}
            style={styles.dragHandle}
          >
            <MaterialIcons name="drag-indicator" size={22} color="#C4C9D4" />
          </TouchableOpacity>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── Main component props ─────────────────────────────────────────────────────
interface EngTasksListProps {
  tarefas: Tarefa[];
  onToggle: (id: string) => void;
  onEdit?: (task: Tarefa) => void;
  onDelete?: (id: string) => void;
  onAddTask?: () => void;
  onDeleteAll?: () => void;
  onReorder?: (orderedIds: string[]) => void;
  showActions?: boolean;
  emptyMessage?: string;
  readOnly?: boolean;
  readOnlyReason?: "concluida" | "pausada";
  /** When provided, component owns its own scroll (standalone tab mode) */
  scrollPadBottom?: number;
  limitReached?: boolean;
}

export function EngTasksList({
  tarefas,
  onToggle,
  onEdit,
  onDelete,
  onAddTask,
  onDeleteAll,
  onReorder,
  showActions = false,
  emptyMessage = "Nenhuma tarefa",
  readOnly = false,
  readOnlyReason,
  scrollPadBottom,
  limitReached = false,
}: EngTasksListProps) {
  const ativas = tarefas.filter((t) => !t.concluida).length;
  const total = tarefas.length;
  const concluidas = tarefas.filter((t) => t.concluida).length;
  const progressPct = total > 0 ? concluidas / total : 0;

  const [availableHeight, setAvailableHeight] = useState(0);

  // ── Busca ─────────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");

  const filteredTarefas = React.useMemo(() => {
    if (!query.trim()) return tarefas;
    const q = query.toLowerCase();
    return tarefas.filter(
      (t) =>
        t.titulo.toLowerCase().includes(q) ||
        (t.descricao && t.descricao.toLowerCase().includes(q)),
    );
  }, [tarefas, query]);

  // ── Expansão de descrição ──────────────────────────────────────────────────
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Confirm modals ─────────────────────────────────────────────────────────
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [actionTask, setActionTask] = useState<Tarefa | null>(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  const pendingToggleTask = tarefas.find((t) => t.id === pendingToggleId);
  const pendingDeleteTask = tarefas.find((t) => t.id === pendingDeleteId);

  // ── Drag ───────────────────────────────────────────────────────────────────
  const dragEnabled = Boolean(onReorder && !readOnly && !query);

  // Swipe disabled when drag is enabled or readOnly
  const enableSwipeDelete = Boolean(
    !dragEnabled && !showActions && onDelete && !readOnly,
  );

  // Fecha a linha anterior quando outra abre (padrão premium)
  const openRowRef = useRef<Swipeable | null>(null);

  const readOnlyLabel =
    readOnlyReason === "concluida" ? "Projeto concluído" : "Projeto arquivado";
  const readOnlyIcon =
    readOnlyReason === "concluida" ? "check-circle" : "archive";
  const hasHeaderMenuItems =
    !readOnly && showActions && tarefas.length > 0 && !!onDeleteAll;

  // ── Render swipe delete action ─────────────────────────────────────────────
  const renderRightActions = (tarefa: Tarefa) => (
    <View style={styles.rightActionsWrap}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setPendingDeleteId(tarefa.id)}
        style={styles.deleteAction}
      >
        <MaterialIcons name="delete-outline" size={20} color="#FFFFFF" />
        <Text style={styles.deleteText}>Excluir</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Build task card handler ────────────────────────────────────────────────
  const makeTogglePress = useCallback(
    (tarefa: Tarefa) => {
      if (readOnly) return () => {};
      if (!tarefa.concluida) {
        return () => setPendingToggleId(tarefa.id);
      }
      return () => onToggle(tarefa.id);
    },
    [readOnly, onToggle],
  );

  // ── DraggableFlatList render item ──────────────────────────────────────────
  const renderDraggableItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<Tarefa>) => {
      const index =
        typeof getIndex === "function"
          ? (getIndex() ?? 0)
          : filteredTarefas.findIndex((t) => t.id === item.id);

      return (
        <FadeSlideIn index={index}>
          <ScaleDecorator activeScale={1.02}>
            <TaskCard
              tarefa={item}
              readOnly={readOnly}
              showActions={showActions}
              expandedIds={expandedIds}
              onTogglePress={makeTogglePress(item)}
              onToggleExpand={toggleExpand}
              onMorePress={setActionTask}
              drag={drag}
              isActive={isActive}
            />
          </ScaleDecorator>
        </FadeSlideIn>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredTarefas, expandedIds, readOnly, showActions],
  );

  // ── Header ─────────────────────────────────────────────────────────────────
  const header = (
    <>
      <View style={styles.engSectionHeader}>
        <Text style={styles.engSectionTitle}>Tarefas</Text>
        <View style={styles.headerRight}>
          <View style={styles.ativasBadge}>
            <Text style={styles.ativasText}>
              {query
                ? `${filteredTarefas.length} encontrada${filteredTarefas.length !== 1 ? "s" : ""}`
                : `${ativas} Ativa${ativas !== 1 ? "s" : ""}`}
            </Text>
          </View>
          {!showActions && !readOnly && onAddTask && (
            <TouchableOpacity
              onPress={onAddTask}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Text style={styles.addTaskBtn}>+ tarefa</Text>
            </TouchableOpacity>
          )}
          {hasHeaderMenuItems && (
            <TouchableOpacity
              style={styles.headerMoreBtn}
              onPress={() => setShowHeaderMenu(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.6}
            >
              <MaterialIcons name="more-vert" size={22} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Progress bar — only when there are tasks and no search query */}
      {total > 0 && !query && (
        <View style={styles.progressSection}>
          <View style={styles.progressStatRow}>
            <Text style={styles.progressLabel}>
              {concluidas} de {total} concluída{total !== 1 ? "s" : ""}
            </Text>
            <Text style={styles.progressPct}>
              {Math.round(progressPct * 100)}%
            </Text>
          </View>
          <ProgressBar pct={progressPct} />
        </View>
      )}

      {showActions && (
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar tarefas..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="close" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {readOnly && (
        <View style={styles.readOnlyBanner}>
          <MaterialIcons name={readOnlyIcon} size={15} color="#6B7280" />
          <Text style={styles.readOnlyBannerText}>
            {readOnlyLabel} — tarefas somente leitura
          </Text>
        </View>
      )}

      {limitReached && !readOnly && (
        <View style={styles.limitBanner}>
          <MaterialIcons name="info-outline" size={15} color="#9A3412" />
          <Text style={styles.limitBannerText}>
            Limite de 500 tarefas atingido. Exclua uma tarefa para adicionar outra.
          </Text>
        </View>
      )}

      {dragEnabled && filteredTarefas.length > 1 && (
        <View style={styles.dragHint}>
          <MaterialIcons name="drag-indicator" size={14} color="#9CA3AF" />
          <Text style={styles.dragHintText}>
            Segure ≡ para reordenar as tarefas
          </Text>
        </View>
      )}
    </>
  );

  // ── Footer (danger btn) ────────────────────────────────────────────────────
  const footer = null;

  // ── Empty state ─────────────────────────────────────────────────────────────
  const emptyNode = (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <MaterialIcons name="check-circle-outline" size={36} color="#D1D5DB" />
      </View>
      <Text style={styles.emptyTitle}>
        {query ? "Nenhuma tarefa encontrada" : emptyMessage}
      </Text>
      <Text style={styles.emptySubtitle}>
        {query
          ? `Sem resultados para "${query}"`
          : "As tarefas do projeto aparecerão aqui"}
      </Text>
    </View>
  );

  const staticItems = filteredTarefas.map((tarefa, index) => {
    const card = (
      <TaskCard
        key={tarefa.id}
        tarefa={tarefa}
        readOnly={readOnly}
        showActions={showActions}
        expandedIds={expandedIds}
        onTogglePress={makeTogglePress(tarefa)}
        onToggleExpand={toggleExpand}
        onMorePress={setActionTask}
      />
    );

    if (!enableSwipeDelete) {
      return (
        <FadeSlideIn key={tarefa.id} index={index}>
          {card}
        </FadeSlideIn>
      );
    }

    return (
      <FadeSlideIn key={tarefa.id} index={index}>
        <Swipeable
          overshootRight={false}
          friction={2}
          rightThreshold={24}
          renderRightActions={() => renderRightActions(tarefa)}
          onSwipeableWillOpen={() => {
            if (openRowRef.current) openRowRef.current.close();
          }}
          onSwipeableOpen={(_, swipeable) => {
            openRowRef.current = swipeable ?? null;
          }}
          onSwipeableWillClose={() => {
            if (openRowRef.current) openRowRef.current = null;
          }}
        >
          {card}
        </Swipeable>
      </FadeSlideIn>
    );
  });

  const overlays = (
    <>
      {/* ── Action sheet: editar / excluir ─────────────────────────────── */}
      <Modal
        visible={actionTask !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActionTask(null)}
      >
        <TouchableOpacity
          style={styles.actionSheetBackdrop}
          onPress={() => setActionTask(null)}
          activeOpacity={1}
        >
          <View style={styles.actionSheet}>
            <Text style={styles.actionSheetTitle} numberOfLines={1}>
              {actionTask?.titulo}
            </Text>
            <View style={styles.actionSheetDivider} />
            <TouchableOpacity
              style={styles.actionSheetItem}
              activeOpacity={0.7}
              onPress={() => {
                if (actionTask && onEdit) onEdit(actionTask);
                setActionTask(null);
              }}
            >
              <MaterialIcons name="edit" size={20} color="#374151" />
              <Text style={styles.actionSheetItemText}>Editar tarefa</Text>
            </TouchableOpacity>
            <View style={styles.actionSheetDivider} />
            <TouchableOpacity
              style={styles.actionSheetItem}
              activeOpacity={0.7}
              onPress={() => {
                if (actionTask) setPendingDeleteId(actionTask.id);
                setActionTask(null);
              }}
            >
              <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
              <Text
                style={[
                  styles.actionSheetItemText,
                  styles.actionSheetItemDanger,
                ]}
              >
                Excluir tarefa
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showHeaderMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHeaderMenu(false)}
      >
        <TouchableOpacity
          style={styles.actionSheetBackdrop}
          activeOpacity={1}
          onPress={() => setShowHeaderMenu(false)}
        >
          <View style={styles.actionSheet}>
            <Text style={styles.actionSheetTitle}>OpÃ§Ãµes das tarefas</Text>
            {onDeleteAll && (
              <TouchableOpacity
                style={styles.actionSheetItem}
                onPress={() => {
                  setShowHeaderMenu(false);
                  onDeleteAll();
                }}
              >
                <MaterialIcons
                  name="delete-sweep"
                  size={20}
                  color="#EF4444"
                />
                <Text
                  style={[
                    styles.actionSheetItemText,
                    styles.actionSheetItemDanger,
                  ]}
                >
                  Excluir todas as tarefas
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <ConfirmSheet
        visible={pendingToggleId !== null}
        icon="check-circle-outline"
        iconColor="#10B981"
        title="Concluir tarefa?"
        message={
          pendingToggleTask
            ? `Marcar "${pendingToggleTask.titulo}" como concluída?`
            : undefined
        }
        confirmLabel="Concluir"
        confirmVariant="primary"
        onConfirm={() => {
          if (pendingToggleId) onToggle(pendingToggleId);
          setPendingToggleId(null);
        }}
        onClose={() => setPendingToggleId(null)}
      />

      <ConfirmSheet
        visible={pendingDeleteId !== null}
        icon="delete-outline"
        iconColor="#EF4444"
        title="Excluir tarefa?"
        message={
          pendingDeleteTask
            ? `Tem certeza que deseja excluir "${pendingDeleteTask.titulo}"?`
            : undefined
        }
        confirmLabel="Excluir"
        confirmVariant="destructive"
        onConfirm={() => {
          if (pendingDeleteId && onDelete) onDelete(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        onClose={() => setPendingDeleteId(null)}
      />
    </>
  );

  // ── Standalone mode: component owns its own scroll (used for tarefas tab) ───
  if (scrollPadBottom !== undefined) {
    const pad = { paddingBottom: scrollPadBottom };
    return (
      <>
        <View
          style={styles.standaloneContainer}
          onLayout={(e) => setAvailableHeight(e.nativeEvent.layout.height)}
        >
          {dragEnabled ? (
            <DraggableFlatList
              data={filteredTarefas}
              keyExtractor={(t) => t.id}
              renderItem={renderDraggableItem}
              onDragEnd={({ data }) => onReorder!(data.map((t) => t.id))}
              scrollEnabled={true}
              activationDistance={10}
              style={
                availableHeight > 0
                  ? { height: availableHeight }
                  : styles.standaloneList
              }
              contentContainerStyle={[styles.standaloneContent, pad]}
              ListHeaderComponent={
                <View style={styles.standaloneHeader}>{header}</View>
              }
              ListEmptyComponent={emptyNode}
              ListFooterComponent={footer ?? undefined}
            />
          ) : (
            <ScrollView
              style={styles.standaloneList}
              contentContainerStyle={[styles.standaloneContent, pad]}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.standaloneHeader}>{header}</View>
              {filteredTarefas.length === 0 ? emptyNode : staticItems}
              {footer}
            </ScrollView>
          )}
        </View>
        {overlays}
      </>
    );
  }

  // ── Nested mode: parent ScrollView handles scrolling ─────────────────────────
  return (
    <>
      {header}
      {filteredTarefas.length === 0 ? (
        emptyNode
      ) : dragEnabled ? (
        <DraggableFlatList
          data={filteredTarefas}
          keyExtractor={(t) => t.id}
          renderItem={renderDraggableItem}
          onDragEnd={({ data }) => onReorder!(data.map((t) => t.id))}
          scrollEnabled={false}
          activationDistance={10}
        />
      ) : (
        staticItems
      )}
      {footer}
      {overlays}
    </>
  );
}

const styles = StyleSheet.create({
  engSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  engSectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ativasBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ativasText: { fontSize: 12, fontWeight: "700", color: PRIMARY },
  addTaskBtn: {
    fontSize: 13,
    fontWeight: "700",
    color: PRIMARY,
  },
  headerMoreBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Progress bar ──────────────────────────────────────────────────────────
  progressSection: {
    marginBottom: 14,
  },
  progressStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },
  progressLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  progressPct: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: PRIMARY,
    borderRadius: 2,
  },

  dragHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
  },
  dragHintText: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  // ── Task card ──────────────────────────────────────────────────────────────
  tarefaCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  tarefaCardConcluida: { opacity: 0.55 },
  tarefaCardReadOnly: {
    opacity: 0.6,
    backgroundColor: "#F9FAFB",
  },
  tarefaCardDragging: {
    borderWidth: 1.5,
    borderColor: PRIMARY + "40",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 6,
  },

  readOnlyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  readOnlyBannerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  limitBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF7ED",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  limitBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#9A3412",
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  checkboxReadOnly: {
    borderColor: "#D1D5DB",
    backgroundColor: "#F3F4F6",
  },

  tarefaInfo: { flex: 1 },
  tarefaTitulo: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  tarefaTituloConcluido: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  tarefaDesc: { fontSize: 12, color: "#9CA3AF", fontWeight: "400" },

  prioBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 2,
    flexShrink: 0,
  },
  prioText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },

  dragHandle: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -4,
    flexShrink: 0,
  },

  // Swipe action (Delete)
  rightActionsWrap: {
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 6,
    marginBottom: 12,
  },
  deleteAction: {
    height: "100%",
    minWidth: 108,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  // ── Expand / collapse descrição ────────────────────────────────────────────
  expandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 4,
  },
  expandBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: PRIMARY,
    letterSpacing: 0.1,
  },

  // ── Empty state ────────────────────────────────────────────────────────────
  emptyState: { alignItems: "center", paddingVertical: 48, gap: 10 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 19,
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    padding: 0,
  },

  moreBtn: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },

  // ── Action sheet ────────────────────────────────────────────────────────────
  actionSheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  actionSheet: {
    marginHorizontal: 16,
    marginBottom: 32,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
  },
  actionSheetTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  actionSheetDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  actionSheetItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  actionSheetItemText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  actionSheetItemDanger: {
    color: "#EF4444",
  },

  standaloneContainer: { flex: 1 },
  standaloneList: { flex: 1 },
  standaloneContent: { paddingHorizontal: 20 },
  standaloneHeader: { paddingTop: 8 },
});

// ─── Skeleton card (mirrors real card layout) ─────────────────────────────────

export function TaskSkeletonCard() {
  return (
    <View style={skeletonStyles.container}>
      <Skeleton width={24} height={24} borderRadius={6} />
      <View style={skeletonStyles.content}>
        <Skeleton width="70%" height={15} borderRadius={5} />
        <Skeleton
          width="45%"
          height={11}
          borderRadius={4}
          style={skeletonStyles.mt6}
        />
      </View>
      <Skeleton width={40} height={22} borderRadius={6} />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  content: { flex: 1 },
  mt6: { marginTop: 6 },
});
