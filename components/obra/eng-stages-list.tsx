import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { FadeSlideIn } from "@/components/ui/fade-slide-in";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Skeleton } from "@/components/ui/skeleton";
import {
  StageCompletePendingSheet,
  StageStatusPickerSheet,
} from "@/components/obra/stage-action-sheets";
import type { Etapa, Gasto, StageStatus } from "@/data/obras";
import { PRIMARY } from "@/utils/obra-utils";
import { STAGE_STATUS_CONFIG, progressBarColor } from "@/utils/stage-ui";
import { stageCompletionProgress } from "@/utils/stage-mappers";
import { buildStageBudgetRollup, spentByStage } from "@/utils/stage-costs";
import { formatCentsBRL } from "@/constants/quote-status";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Swipeable } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { tapMedium } from "@/utils/haptics";

// --- Animated progress bar ----------------------------------------------------
function ProgressBar({
  progress,
  color,
}: {
  progress: number | null;
  color: string;
}) {
  const width = useSharedValue(0);
  const target = progress ?? 0;

  useEffect(() => {
    width.value = withTiming(target, { duration: 600 });
  }, [target]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%` as any,
  }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View
        style={[styles.progressFill, { backgroundColor: color }, barStyle]}
      />
    </View>
  );
}

// --- Stage status checkbox ----------------------------------------------------
function StageStatusCheck({
  status,
  onPress,
}: {
  status: StageStatus;
  onPress?: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const cfg = STAGE_STATUS_CONFIG[status];

  const handlePress = () => {
    scale.value = withSpring(1.25, { damping: 8, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    });
    onPress?.();
  };

  return (
    <Pressable onPress={handlePress} disabled={!onPress} hitSlop={10}>
      <Animated.View
        style={[
          styles.check,
          status === "COMPLETED" && {
            backgroundColor: cfg.dot,
            borderColor: cfg.dot,
          },
          status === "IN_PROGRESS" && { borderColor: cfg.dot },
          !onPress && status === "NOT_STARTED" && styles.checkDisabled,
          animStyle,
        ]}
      >
        {status === "COMPLETED" && (
          <MaterialIcons name="check" size={16} color="#FFFFFF" />
        )}
        {status === "IN_PROGRESS" && (
          <View style={[styles.checkHalfDot, { backgroundColor: cfg.dot }]} />
        )}
      </Animated.View>
    </Pressable>
  );
}

// --- Stage budget rollup ------------------------------------------------------
/**
 * Consolidado de custo das etapas (orçado × realizado). Aparece quando há
 * orçamento em alguma etapa ou já há gastos.
 * Portado de obra-web/src/components/obra-detail/panels/etapas-panel.tsx.
 */
function StageBudgetRollup({
  rollup,
}: {
  rollup: ReturnType<typeof buildStageBudgetRollup>;
}) {
  const { budgetedCents, spentOnStagesCents, stagesWithBudget } = rollup;
  if (stagesWithBudget === 0 && spentOnStagesCents <= 0) return null;

  const hasBudget = budgetedCents > 0;
  const balance = budgetedCents - spentOnStagesCents;
  const over = hasBudget && balance < 0;
  return (
    <View style={styles.rollupCard}>
      <View style={styles.rollupRow}>
        <View style={styles.rollupStat}>
          <Text style={styles.rollupLabel}>Orçado (etapas)</Text>
          <Text style={styles.rollupValue}>
            {hasBudget ? formatCentsBRL(budgetedCents) : "—"}
          </Text>
        </View>
        <View style={styles.rollupStat}>
          <Text style={styles.rollupLabel}>Realizado</Text>
          <Text style={styles.rollupValue}>
            {formatCentsBRL(spentOnStagesCents)}
          </Text>
        </View>
        <View style={styles.rollupStat}>
          <Text style={styles.rollupLabel}>Saldo</Text>
          <Text
            style={[
              styles.rollupValue,
              hasBudget && (over ? styles.rollupOver : styles.rollupOk),
            ]}
          >
            {hasBudget ? formatCentsBRL(balance) : "—"}
          </Text>
        </View>
      </View>
    </View>
  );
}

// --- Stage card ---------------------------------------------------------------
interface StageCardProps {
  etapa: Etapa;
  index: number;
  readOnly: boolean;
  /** Realizado (centavos) das despesas vinculadas a esta etapa. */
  spentCents?: number;
  onPress: () => void;
  onMorePress?: (etapa: Etapa) => void;
  onToggleStatus?: () => void;
  onOpenStatusPicker?: () => void;
  drag?: () => void;
  isActive?: boolean;
}

function StageCard({
  etapa,
  index,
  readOnly,
  spentCents = 0,
  onPress,
  onMorePress,
  onToggleStatus,
  onOpenStatusPicker,
  drag,
  isActive,
}: StageCardProps) {
  const status = STAGE_STATUS_CONFIG[etapa.status];
  const barColor = progressBarColor(etapa.progress);
  const hasActivities = etapa.totalActivities > 0;
  const done = etapa.status === "COMPLETED";
  const pct = Math.round((etapa.progress ?? 0) * 100);
  const hasBudget =
    typeof etapa.budgetCents === "number" && etapa.budgetCents > 0;
  const overBudget = hasBudget && spentCents > etapa.budgetCents!;
  const showCost = hasBudget || spentCents > 0;

  return (
    <FadeSlideIn index={index}>
      <PressableScale
        style={[styles.card, isActive && styles.cardDragging]}
        onPress={onPress}
        scaleTo={0.99}
      >
        <StageStatusCheck status={etapa.status} onPress={onToggleStatus} />

        <View style={styles.cardMain}>
          <Text
            style={[styles.cardTitle, done && styles.cardTitleDone]}
            numberOfLines={1}
          >
            {etapa.nome}
          </Text>

          <View style={styles.metaRow}>
            <TouchableOpacity
              style={[styles.statusPill, { backgroundColor: status.bg }]}
              onPress={onOpenStatusPicker}
              disabled={!onOpenStatusPicker}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              activeOpacity={0.7}
            >
              <View
                style={[styles.statusPillDot, { backgroundColor: status.dot }]}
              />
              <Text style={[styles.statusPillText, { color: status.color }]}>
                {status.label}
              </Text>
              {!readOnly && onOpenStatusPicker && (
                <MaterialIcons
                  name="expand-more"
                  size={14}
                  color={status.color}
                />
              )}
            </TouchableOpacity>

            {hasActivities && (
              <View style={styles.progressInline}>
                <View style={styles.miniTrack}>
                  <View
                    style={[
                      styles.miniFill,
                      { width: `${pct}%` as any, backgroundColor: barColor },
                    ]}
                  />
                </View>
                <Text style={styles.miniCount}>
                  {etapa.completedActivities}/{etapa.totalActivities}
                </Text>
              </View>
            )}
          </View>

          {showCost && (
            <Text style={styles.costLine}>
              <Text style={overBudget ? styles.costOver : undefined}>
                {formatCentsBRL(spentCents)}
              </Text>
              {hasBudget && (
                <Text style={styles.costBudget}>
                  {" "}
                  / {formatCentsBRL(etapa.budgetCents)}
                </Text>
              )}
            </Text>
          )}
        </View>

        <View style={styles.cardTrailing}>
          {!readOnly && onMorePress && (
            <TouchableOpacity
              onPress={() => onMorePress(etapa)}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 4 }}
              activeOpacity={0.6}
            >
              <MaterialIcons name="more-vert" size={20} color="#C4C9D4" />
            </TouchableOpacity>
          )}
          {drag && (
            <TouchableOpacity
              onLongPress={() => {
                tapMedium();
                drag();
              }}
              delayLongPress={150}
              hitSlop={{ top: 10, bottom: 10, left: 4, right: 6 }}
              activeOpacity={0.4}
            >
              <MaterialIcons name="drag-indicator" size={20} color="#C4C9D4" />
            </TouchableOpacity>
          )}
          <MaterialIcons name="chevron-right" size={20} color="#D1D5DB" />
        </View>
      </PressableScale>
    </FadeSlideIn>
  );
}

// --- Props --------------------------------------------------------------------
interface EngStagesListProps {
  etapas: Etapa[];
  totalActivities: number;
  completedActivities: number;
  /** Gastos da obra (para derivar "realizado por etapa"). */
  gastos?: Gasto[];
  onOpenStage: (etapa: Etapa) => void;
  onAddStage?: () => void;
  onEditStage?: (etapa: Etapa) => void;
  onDeleteStage?: (id: string) => void;
  onSetStageStatus?: (etapa: Etapa, status: StageStatus) => void;
  onCompleteStageActivities?: (etapa: Etapa) => Promise<void> | void;
  onReorder?: (orderedIds: string[]) => void;
  readOnly?: boolean;
  readOnlyReason?: "concluida" | "pausada";
  limitReached?: boolean;
  scrollPadBottom?: number;
}

export function EngStagesList({
  etapas,
  totalActivities,
  completedActivities,
  gastos = [],
  onOpenStage,
  onAddStage,
  onEditStage,
  onDeleteStage,
  onSetStageStatus,
  onCompleteStageActivities,
  onReorder,
  readOnly = false,
  readOnlyReason,
  limitReached = false,
  scrollPadBottom = 32,
}: EngStagesListProps) {
  const [query, setQuery] = useState("");
  const [actionStage, setActionStage] = useState<Etapa | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [statusPickerStage, setStatusPickerStage] = useState<Etapa | null>(null);
  const [pendingCompleteStage, setPendingCompleteStage] =
    useState<Etapa | null>(null);
  const [availableHeight, setAvailableHeight] = useState(0);
  const openRowRef = useRef<Swipeable | null>(null);

  const canChangeStatus = !readOnly && !!onSetStageStatus;

  // Conclui a etapa: direto quando não há atividades pendentes; senão pergunta
  // (concluir todas as atividades x concluir só a etapa).
  const requestComplete = useCallback(
    (etapa: Etapa) => {
      const hasPending =
        etapa.totalActivities > 0 &&
        etapa.completedActivities < etapa.totalActivities;
      if (hasPending) {
        setPendingCompleteStage(etapa);
      } else {
        onSetStageStatus?.(etapa, "COMPLETED");
      }
    },
    [onSetStageStatus],
  );

  const handleToggleStatus = useCallback(
    (etapa: Etapa) => {
      if (!canChangeStatus) return;
      tapMedium();
      if (etapa.status === "COMPLETED") {
        onSetStageStatus?.(etapa, "IN_PROGRESS"); // reabrir
      } else {
        requestComplete(etapa);
      }
    },
    [canChangeStatus, onSetStageStatus, requestComplete],
  );

  const handlePickStatus = useCallback(
    (status: StageStatus) => {
      const etapa = statusPickerStage;
      setStatusPickerStage(null);
      if (!etapa) return;
      if (status === "COMPLETED") {
        requestComplete(etapa);
      } else {
        onSetStageStatus?.(etapa, status);
      }
    },
    [statusPickerStage, onSetStageStatus, requestComplete],
  );

  const ordered = useMemo(
    () => [...etapas].sort((a, b) => a.order - b.order),
    [etapas],
  );

  const spentMap = useMemo(() => spentByStage(gastos), [gastos]);
  const rollup = useMemo(
    () => buildStageBudgetRollup(ordered, gastos),
    [ordered, gastos],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return ordered;
    const q = query.toLowerCase();
    return ordered.filter(
      (e) =>
        e.nome.toLowerCase().includes(q) ||
        e.descricao.toLowerCase().includes(q),
    );
  }, [ordered, query]);

  const concluidas = ordered.filter((e) => e.status === "COMPLETED").length;
  // Progresso da obra = etapas concluídas / total de etapas (não atividades -
  // uma etapa pode estar concluída mesmo sem atividades).
  const stageProgress = stageCompletionProgress(ordered);
  const pendingDeleteStage = etapas.find((e) => e.id === pendingDeleteId);

  const readOnlyLabel =
    readOnlyReason === "concluida" ? "Projeto concluído" : "Projeto arquivado";
  const dragEnabled = Boolean(onReorder && !readOnly && !query);
  // Swipe-delete só quando o drag está desabilitado (mesma lógica das tarefas).
  const enableSwipe = !readOnly && !!onDeleteStage && !query && !dragEnabled;

  const renderDraggableItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<Etapa>) => {
      const idx = typeof getIndex === "function" ? (getIndex() ?? 0) : 0;
      return (
        <ScaleDecorator activeScale={1.02}>
          <StageCard
            etapa={item}
            index={idx}
            readOnly={readOnly}
            spentCents={spentMap.get(item.id) ?? 0}
            onPress={() => onOpenStage(item)}
            onMorePress={
              onEditStage || onDeleteStage ? setActionStage : undefined
            }
            onToggleStatus={
              canChangeStatus ? () => handleToggleStatus(item) : undefined
            }
            onOpenStatusPicker={
              canChangeStatus ? () => setStatusPickerStage(item) : undefined
            }
            drag={drag}
            isActive={isActive}
          />
        </ScaleDecorator>
      );
    },
    [readOnly, onEditStage, onDeleteStage, onOpenStage, canChangeStatus, handleToggleStatus, spentMap],
  );

  const renderRightActions = (etapa: Etapa) => (
    <View style={styles.rightActionsWrap}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setPendingDeleteId(etapa.id)}
        style={styles.deleteAction}
      >
        <MaterialIcons name="delete-outline" size={20} color="#FFFFFF" />
        <Text style={styles.deleteText}>Excluir</Text>
      </TouchableOpacity>
    </View>
  );

  const header = (
    <>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Etapas</Text>
        <View style={styles.headerRight}>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {query
                ? `${filtered.length} encontrada${filtered.length !== 1 ? "s" : ""}`
                : `${ordered.length} etapa${ordered.length !== 1 ? "s" : ""}`}
            </Text>
          </View>
          {!readOnly && onAddStage && !limitReached && (
            <TouchableOpacity
              onPress={onAddStage}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Text style={styles.addBtn}>+ etapa</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Obra-level progress summary */}
      {ordered.length > 0 && !query && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <Text style={styles.summaryLabel}>Progresso da obra</Text>
            <Text style={styles.summaryPct}>
              {stageProgress != null
                ? `${Math.round(stageProgress * 100)}%`
                : "Sem etapas"}
            </Text>
          </View>
          <ProgressBar
            progress={stageProgress}
            color={progressBarColor(stageProgress)}
          />
          <View style={styles.summaryChipsRow}>
            <View style={styles.summaryChip}>
              <MaterialIcons name="layers" size={13} color="#6B7280" />
              <Text style={styles.summaryChipText}>
                {concluidas}/{ordered.length} etapas
              </Text>
            </View>
            <View style={styles.summaryChip}>
              <MaterialIcons name="check-circle" size={13} color="#16A34A" />
              <Text style={styles.summaryChipText}>
                {completedActivities}/{totalActivities} atividades
              </Text>
            </View>
          </View>
        </View>
      )}

      {ordered.length > 0 && !query && (
        <StageBudgetRollup rollup={rollup} />
      )}

      {ordered.length > 3 && (
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar etapas..."
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

      {readOnly && readOnlyReason && (
        <View style={styles.readOnlyBanner}>
          <MaterialIcons
            name={readOnlyReason === "concluida" ? "check-circle" : "archive"}
            size={15}
            color="#6B7280"
          />
          <Text style={styles.readOnlyBannerText}>
            {readOnlyLabel} - etapas somente leitura
          </Text>
        </View>
      )}

      {limitReached && !readOnly && (
        <View style={styles.limitBanner}>
          <MaterialIcons name="info-outline" size={15} color="#9A3412" />
          <Text style={styles.limitBannerText}>
            Limite de 500 etapas atingido. Exclua uma etapa para adicionar
            outra.
          </Text>
        </View>
      )}

      {dragEnabled && filtered.length > 1 && (
        <View style={styles.dragHint}>
          <MaterialIcons name="drag-indicator" size={14} color="#9CA3AF" />
          <Text style={styles.dragHintText}>
            Segure e arraste para reordenar as etapas
          </Text>
        </View>
      )}
    </>
  );

  const emptyNode = (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <MaterialIcons name="layers" size={36} color="#D1D5DB" />
      </View>
      <Text style={styles.emptyTitle}>
        {query ? "Nenhuma etapa encontrada" : "Nenhuma etapa ainda"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {query
          ? `Sem resultados para "${query}"`
          : "Organize a obra em etapas e adicione atividades a cada uma."}
      </Text>
      {!query && !readOnly && onAddStage && !limitReached && (
        <TouchableOpacity
          style={styles.emptyCta}
          onPress={onAddStage}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.emptyCtaText}>Criar primeira etapa</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const cards = filtered.map((etapa, index) => {
    const card = (
      <StageCard
        etapa={etapa}
        index={index}
        readOnly={readOnly}
        spentCents={spentMap.get(etapa.id) ?? 0}
        onPress={() => onOpenStage(etapa)}
        onMorePress={onEditStage || onDeleteStage ? setActionStage : undefined}
        onToggleStatus={
          canChangeStatus ? () => handleToggleStatus(etapa) : undefined
        }
        onOpenStatusPicker={
          canChangeStatus ? () => setStatusPickerStage(etapa) : undefined
        }
      />
    );

    if (!enableSwipe) return <View key={etapa.id}>{card}</View>;

    return (
      <Swipeable
        key={etapa.id}
        overshootRight={false}
        friction={2}
        rightThreshold={24}
        renderRightActions={() => renderRightActions(etapa)}
        onSwipeableWillOpen={() => {
          if (openRowRef.current) openRowRef.current.close();
        }}
        onSwipeableOpen={(_, swipeable) => {
          openRowRef.current = swipeable ?? null;
        }}
      >
        {card}
      </Swipeable>
    );
  });

  return (
    <>
      <View
        style={styles.list}
        onLayout={(e) => setAvailableHeight(e.nativeEvent.layout.height)}
      >
        {dragEnabled ? (
          <DraggableFlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderDraggableItem}
            onDragEnd={({ data }) => onReorder!(data.map((e) => e.id))}
            activationDistance={12}
            style={
              availableHeight > 0 ? { height: availableHeight } : styles.list
            }
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: scrollPadBottom },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={<View>{header}</View>}
            ListEmptyComponent={emptyNode}
          />
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: scrollPadBottom },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {header}
            {filtered.length === 0 ? emptyNode : cards}
          </ScrollView>
        )}
      </View>

      {/* Action sheet */}
      <Modal
        visible={actionStage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActionStage(null)}
      >
        <TouchableOpacity
          style={styles.actionSheetBackdrop}
          onPress={() => setActionStage(null)}
          activeOpacity={1}
        >
          <View style={styles.actionSheet}>
            <Text style={styles.actionSheetTitle} numberOfLines={1}>
              {actionStage?.nome}
            </Text>
            {onEditStage && (
              <>
                <View style={styles.actionSheetDivider} />
                <TouchableOpacity
                  style={styles.actionSheetItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (actionStage) onEditStage(actionStage);
                    setActionStage(null);
                  }}
                >
                  <MaterialIcons name="edit" size={20} color="#374151" />
                  <Text style={styles.actionSheetItemText}>Editar etapa</Text>
                </TouchableOpacity>
              </>
            )}
            {onDeleteStage && (
              <>
                <View style={styles.actionSheetDivider} />
                <TouchableOpacity
                  style={styles.actionSheetItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (actionStage) setPendingDeleteId(actionStage.id);
                    setActionStage(null);
                  }}
                >
                  <MaterialIcons
                    name="delete-outline"
                    size={20}
                    color="#EF4444"
                  />
                  <Text
                    style={[styles.actionSheetItemText, styles.dangerText]}
                  >
                    Excluir etapa
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <ConfirmSheet
        visible={pendingDeleteId !== null}
        icon="delete-outline"
        iconColor="#EF4444"
        title="Excluir etapa?"
        message={
          pendingDeleteStage
            ? `"${pendingDeleteStage.nome}" e todas as suas atividades serão excluídas. Esta ação não pode ser desfeita.`
            : undefined
        }
        confirmLabel="Excluir"
        confirmVariant="destructive"
        onConfirm={() => {
          if (pendingDeleteId && onDeleteStage) onDeleteStage(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        onClose={() => setPendingDeleteId(null)}
      />

      <StageStatusPickerSheet
        visible={statusPickerStage !== null}
        current={statusPickerStage?.status ?? "NOT_STARTED"}
        onSelect={handlePickStatus}
        onClose={() => setStatusPickerStage(null)}
      />

      <StageCompletePendingSheet
        visible={pendingCompleteStage !== null}
        stageName={pendingCompleteStage?.nome}
        pendingCount={
          pendingCompleteStage
            ? pendingCompleteStage.totalActivities -
              pendingCompleteStage.completedActivities
            : 0
        }
        onCompleteAll={() => {
          const etapa = pendingCompleteStage;
          setPendingCompleteStage(null);
          if (etapa) void onCompleteStageActivities?.(etapa);
        }}
        onCompleteStageOnly={() => {
          const etapa = pendingCompleteStage;
          setPendingCompleteStage(null);
          if (etapa) onSetStageStatus?.(etapa, "COMPLETED");
        }}
        onClose={() => setPendingCompleteStage(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#F5F5F5" },
  listContent: { paddingHorizontal: 20, paddingTop: 8 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  countBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  countBadgeText: { fontSize: 12, fontWeight: "700", color: PRIMARY },
  addBtn: { fontSize: 13, fontWeight: "700", color: PRIMARY },

  // Summary card
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  summaryLabel: { fontSize: 13, fontWeight: "600", color: "#374151" },
  summaryPct: {
    fontSize: 14,
    fontWeight: "800",
    color: PRIMARY,
    letterSpacing: -0.3,
  },
  summaryChipsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  summaryChipText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },

  // Rollup (orçado × realizado × saldo)
  rollupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF0F3",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    marginTop: -4,
  },
  rollupRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  rollupStat: { flex: 1 },
  rollupLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  rollupValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  rollupOver: { color: "#EF4444" },
  rollupOk: { color: "#16A34A" },

  // Linha de custo por etapa
  costLine: { fontSize: 12, fontWeight: "600", color: "#9CA3AF" },
  costOver: { color: "#EF4444", fontWeight: "700" },
  costBudget: { color: "#9CA3AF" },

  // Card (minimalista)
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  cardDragging: {
    borderWidth: 1.5,
    borderColor: PRIMARY + "40",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 7,
  },
  dragHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
  },
  dragHintText: { fontSize: 11, color: "#9CA3AF", fontWeight: "500" },

  // Status checkbox
  check: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkDisabled: { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },
  checkHalfDot: { width: 11, height: 11, borderRadius: 3.5 },

  cardMain: { flex: 1, gap: 7 },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
  cardTitleDone: {
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
  },
  statusPillDot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.1 },

  progressInline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    justifyContent: "flex-end",
  },
  miniTrack: {
    flex: 1,
    maxWidth: 90,
    height: 3,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  miniFill: { height: 3, borderRadius: 2 },
  miniCount: { fontSize: 11, fontWeight: "700", color: "#6B7280" },

  cardTrailing: { flexDirection: "row", alignItems: "center", gap: 6 },

  // Progress bar (summary)
  progressTrack: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: 6, borderRadius: 3 },

  // Swipe delete
  rightActionsWrap: {
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 0,
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

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEF0F3",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827", padding: 0 },

  readOnlyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  readOnlyBannerText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  limitBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF7ED",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  limitBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#9A3412",
  },

  // Empty
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
    paddingHorizontal: 24,
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: PRIMARY,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 6,
  },
  emptyCtaText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  // Action sheet
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
  actionSheetDivider: { height: 1, backgroundColor: "#F3F4F6" },
  actionSheetItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  actionSheetItemText: { fontSize: 16, fontWeight: "500", color: "#111827" },
  dangerText: { color: "#EF4444" },
});

// --- Skeleton -----------------------------------------------------------------
export function StageSkeletonCard() {
  return (
    <View style={skeletonStyles.card}>
      <Skeleton width={26} height={26} borderRadius={8} />
      <View style={skeletonStyles.body}>
        <Skeleton width="60%" height={16} borderRadius={5} />
        <Skeleton width={120} height={18} borderRadius={7} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    elevation: 2,
  },
  body: { flex: 1, gap: 8 },
});
