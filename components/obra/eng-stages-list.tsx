import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { FadeSlideIn } from "@/components/ui/fade-slide-in";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Skeleton } from "@/components/ui/skeleton";
import type { Etapa } from "@/data/obras";
import { PRIMARY, getPriorityConfig } from "@/utils/obra-utils";
import {
  STAGE_STATUS_CONFIG,
  progressBarColor,
  progressLabel,
} from "@/utils/stage-ui";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
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
  withTiming,
} from "react-native-reanimated";

// ─── Animated progress bar ────────────────────────────────────────────────────
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

// ─── Stage card ───────────────────────────────────────────────────────────────
interface StageCardProps {
  etapa: Etapa;
  index: number;
  readOnly: boolean;
  onPress: () => void;
  onMorePress?: (etapa: Etapa) => void;
}

function StageCard({ etapa, index, readOnly, onPress, onMorePress }: StageCardProps) {
  const status = STAGE_STATUS_CONFIG[etapa.status];
  const prio = etapa.prioridade ? getPriorityConfig(etapa.prioridade) : null;
  const barColor = progressBarColor(etapa.progress);
  const hasActivities = etapa.totalActivities > 0;

  return (
    <FadeSlideIn index={index}>
      <PressableScale style={styles.card} onPress={onPress} scaleTo={0.985}>
        <View style={[styles.statusAccent, { backgroundColor: status.dot }]} />

        <View style={styles.cardBody}>
          {/* Top row: status + priority + overflow */}
          <View style={styles.cardTopRow}>
            <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
              <Text style={[styles.statusChipText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>

            <View style={styles.cardTopRight}>
              {prio && (
                <View style={styles.prioWrap}>
                  <View
                    style={[styles.prioDot, { backgroundColor: prio.color }]}
                  />
                  <Text style={[styles.prioText, { color: prio.color }]}>
                    {prio.label}
                  </Text>
                </View>
              )}
              {!readOnly && onMorePress && (
                <TouchableOpacity
                  onPress={() => onMorePress(etapa)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}
                  activeOpacity={0.6}
                >
                  <MaterialIcons name="more-vert" size={20} color="#C4C9D4" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Title */}
          <Text style={styles.cardTitle} numberOfLines={2}>
            {etapa.nome}
          </Text>
          {!!etapa.descricao && (
            <Text style={styles.cardDesc} numberOfLines={1}>
              {etapa.descricao}
            </Text>
          )}

          {/* Progress */}
          <View style={styles.progressRow}>
            <ProgressBar progress={etapa.progress} color={barColor} />
            <Text
              style={[
                styles.progressLabel,
                !hasActivities && styles.progressLabelMuted,
              ]}
            >
              {progressLabel(
                etapa.progress,
                etapa.completedActivities,
                etapa.totalActivities,
              )}
            </Text>
          </View>

          {/* Footer: open hint */}
          <View style={styles.cardFooter}>
            <MaterialIcons
              name="playlist-add-check"
              size={15}
              color="#9CA3AF"
            />
            <Text style={styles.cardFooterText}>
              {hasActivities
                ? `${etapa.totalActivities} atividade${etapa.totalActivities !== 1 ? "s" : ""}`
                : "Toque para adicionar atividades"}
            </Text>
            <View style={{ flex: 1 }} />
            <MaterialIcons name="chevron-right" size={20} color="#C4C9D4" />
          </View>
        </View>
      </PressableScale>
    </FadeSlideIn>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface EngStagesListProps {
  etapas: Etapa[];
  obraProgress: number | null;
  totalActivities: number;
  completedActivities: number;
  onOpenStage: (etapa: Etapa) => void;
  onAddStage?: () => void;
  onEditStage?: (etapa: Etapa) => void;
  onDeleteStage?: (id: string) => void;
  readOnly?: boolean;
  readOnlyReason?: "concluida" | "pausada";
  limitReached?: boolean;
  scrollPadBottom?: number;
}

export function EngStagesList({
  etapas,
  obraProgress,
  totalActivities,
  completedActivities,
  onOpenStage,
  onAddStage,
  onEditStage,
  onDeleteStage,
  readOnly = false,
  readOnlyReason,
  limitReached = false,
  scrollPadBottom = 32,
}: EngStagesListProps) {
  const [query, setQuery] = useState("");
  const [actionStage, setActionStage] = useState<Etapa | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const openRowRef = useRef<Swipeable | null>(null);

  const ordered = useMemo(
    () => [...etapas].sort((a, b) => a.order - b.order),
    [etapas],
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
  const pendingDeleteStage = etapas.find((e) => e.id === pendingDeleteId);

  const readOnlyLabel =
    readOnlyReason === "concluida" ? "Projeto concluído" : "Projeto arquivado";
  const enableSwipe = !readOnly && !!onDeleteStage && !query;

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
              {obraProgress != null
                ? `${Math.round(obraProgress * 100)}%`
                : "Sem atividades"}
            </Text>
          </View>
          <ProgressBar
            progress={obraProgress}
            color={progressBarColor(obraProgress)}
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

      {readOnly && (
        <View style={styles.readOnlyBanner}>
          <MaterialIcons
            name={readOnlyReason === "concluida" ? "check-circle" : "archive"}
            size={15}
            color="#6B7280"
          />
          <Text style={styles.readOnlyBannerText}>
            {readOnlyLabel} — etapas somente leitura
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
        onPress={() => onOpenStage(etapa)}
        onMorePress={onEditStage || onDeleteStage ? setActionStage : undefined}
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

  // Card
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  statusAccent: { width: 5 },
  cardBody: { flex: 1, padding: 16 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTopRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusChipText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.2 },
  prioWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  prioDot: { width: 8, height: 8, borderRadius: 4 },
  prioText: { fontSize: 11, fontWeight: "700" },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
  cardDesc: { fontSize: 12.5, color: "#9CA3AF", marginTop: 3 },

  progressRow: { marginTop: 12, gap: 6 },
  progressTrack: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: 6, borderRadius: 3 },
  progressLabel: { fontSize: 11.5, fontWeight: "600", color: "#374151" },
  progressLabelMuted: { color: "#9CA3AF", fontWeight: "500" },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  cardFooterText: { fontSize: 12, fontWeight: "500", color: "#9CA3AF" },

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

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function StageSkeletonCard() {
  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.accent} />
      <View style={skeletonStyles.body}>
        <Skeleton width={110} height={20} borderRadius={7} />
        <Skeleton
          width="65%"
          height={16}
          borderRadius={5}
          style={skeletonStyles.mt10}
        />
        <Skeleton
          width="100%"
          height={6}
          borderRadius={3}
          style={skeletonStyles.mt12}
        />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 2,
  },
  accent: { width: 5, backgroundColor: "#E5E7EB" },
  body: { flex: 1, padding: 16 },
  mt10: { marginTop: 10 },
  mt12: { marginTop: 12 },
});
