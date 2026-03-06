import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import type { Tarefa } from "@/data/obras";
import { PRIMARY, getPriorityConfig } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";
import {
  Modal,
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
}: EngTasksListProps) {
  const ativas = tarefas.filter((t) => !t.concluida).length;
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

  const pendingToggleTask = tarefas.find((t) => t.id === pendingToggleId);
  const pendingDeleteTask = tarefas.find((t) => t.id === pendingDeleteId);

  // ── Drag ───────────────────────────────────────────────────────────────────
  const dragEnabled = Boolean(onReorder && !readOnly && !query);

  // Swipe disabled when drag is enabled or readOnly
  const enableSwipeDelete = Boolean(
    !dragEnabled && !showActions && onDelete && !readOnly,
  );

  // Descrição longa se > 70 chars ou contém quebras de linha
  const isLongDesc = (desc: string) =>
    desc.length > 70 || desc.includes("\n");

  // Fecha a linha anterior quando outra abre (padrão premium)
  const openRowRef = useRef<Swipeable | null>(null);

  const readOnlyLabel =
    readOnlyReason === "concluida" ? "Projeto concluído" : "Projeto arquivado";
  const readOnlyIcon =
    readOnlyReason === "concluida" ? "check-circle" : "archive";

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

  // ── Render single task card ────────────────────────────────────────────────
  const renderCard = (
    tarefa: Tarefa,
    opts?: { drag?: () => void; isActive?: boolean },
  ) => {
    const prio = getPriorityConfig(tarefa.prioridade);
    const isExpanded = expandedIds.has(tarefa.id);
    const hasLongDesc = !!tarefa.descricao && isLongDesc(tarefa.descricao);

    const handleTogglePress = () => {
      if (readOnly) return;
      // Only show confirm when marking as complete; undo is immediate
      if (!tarefa.concluida) {
        setPendingToggleId(tarefa.id);
      } else {
        onToggle(tarefa.id);
      }
    };

    return (
      <TouchableOpacity
        style={[
          styles.tarefaCard,
          tarefa.concluida && styles.tarefaCardConcluida,
          readOnly && styles.tarefaCardReadOnly,
          opts?.isActive && styles.tarefaCardDragging,
        ]}
        onPress={readOnly ? undefined : handleTogglePress}
        activeOpacity={readOnly ? 1 : 0.7}
        disabled={readOnly}
      >
        {/* Checkbox */}
        <View
          style={[
            styles.checkbox,
            tarefa.concluida && styles.checkboxChecked,
            readOnly && !tarefa.concluida && styles.checkboxReadOnly,
          ]}
        >
          {tarefa.concluida && (
            <MaterialIcons name="check" size={14} color="#FFFFFF" />
          )}
          {readOnly && !tarefa.concluida && (
            <MaterialIcons name="lock" size={11} color="#9CA3AF" />
          )}
        </View>

        {/* Conteúdo central */}
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
                  onPress={() => toggleExpand(tarefa.id)}
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

        {/* Prioridade */}
        <View
          style={[
            styles.prioBadge,
            tarefa.prioridade === "ALTA" && styles.prioBadgeAlta,
          ]}
        >
          <Text style={[styles.prioText, { color: prio.color }]}>
            {prio.label}
          </Text>
        </View>

        {/* Overflow menu */}
        {showActions && onEdit && onDelete && !readOnly && (
          <TouchableOpacity
            onPress={() => setActionTask(tarefa)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
            style={styles.moreBtn}
            activeOpacity={0.6}
          >
            <MaterialIcons name="more-vert" size={20} color="#C4C9D4" />
          </TouchableOpacity>
        )}

        {/* Drag handle */}
        {opts?.drag && (
          <TouchableOpacity
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              opts.drag!();
            }}
            delayLongPress={150}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            activeOpacity={0.4}
            style={styles.dragHandle}
          >
            <MaterialIcons name="drag-indicator" size={22} color="#C4C9D4" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // ── DraggableFlatList render item ──────────────────────────────────────────
  const renderDraggableItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Tarefa>) => (
      <ScaleDecorator activeScale={1.02}>
        {renderCard(item, { drag, isActive })}
      </ScaleDecorator>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tarefas, expandedIds, readOnly, showActions],
  );

  // ── Header ─────────────────────────────────────────────────────────────────
  const header = (
    <>
      <View style={styles.engSectionHeader}>
        <Text style={styles.engSectionTitle}>
          {showActions ? "Tarefas" : "Tarefas"}
        </Text>
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
        </View>
      </View>

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
  const footer =
    !readOnly && tarefas.length > 0 && onDeleteAll ? (
      <TouchableOpacity
        style={styles.dangerBtn}
        onPress={onDeleteAll}
        activeOpacity={0.8}
      >
        <MaterialIcons name="delete-sweep" size={16} color="#EF4444" />
        <Text style={styles.dangerBtnText}>Excluir todas as tarefas</Text>
      </TouchableOpacity>
    ) : null;

  // ── Shared nodes ────────────────────────────────────────────────────────────
  const emptyNode = (
    <View style={styles.emptyState}>
      <MaterialIcons name="check-circle-outline" size={48} color="#D1D5DB" />
      <Text style={styles.emptyStateText}>
        {query ? `Nenhuma tarefa encontrada para "${query}"` : emptyMessage}
      </Text>
    </View>
  );

  const staticItems = filteredTarefas.map((tarefa) => {
    if (!enableSwipeDelete) {
      return <View key={tarefa.id}>{renderCard(tarefa)}</View>;
    }
    return (
      <Swipeable
        key={tarefa.id}
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
        {renderCard(tarefa)}
      </Swipeable>
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
              <Text style={[styles.actionSheetItemText, styles.actionSheetItemDanger]}>
                Excluir tarefa
              </Text>
            </TouchableOpacity>
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
              style={availableHeight > 0 ? { height: availableHeight } : styles.standaloneList}
              contentContainerStyle={[styles.standaloneContent, pad]}
              ListHeaderComponent={<View style={styles.standaloneHeader}>{header}</View>}
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
      {filteredTarefas.length === 0 ? emptyNode : dragEnabled ? (
        <DraggableFlatList
          data={filteredTarefas}
          keyExtractor={(t) => t.id}
          renderItem={renderDraggableItem}
          onDragEnd={({ data }) => onReorder!(data.map((t) => t.id))}
          scrollEnabled={false}
          activationDistance={10}
        />
      ) : staticItems}
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

  tarefaCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
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
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
    flexShrink: 0,
  },
  prioBadgeAlta: {
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    marginBottom: 8,
  },
  deleteAction: {
    height: "100%",
    minWidth: 108,
    paddingHorizontal: 14,
    borderRadius: 14,
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

  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyStateText: { fontSize: 14, color: "#9CA3AF", fontWeight: "500" },

  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    backgroundColor: "#FFF5F5",
  },
  dangerBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EF4444",
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
