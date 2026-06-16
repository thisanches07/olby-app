import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Swipeable } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { ActivityFormModal } from "@/components/projeto/activity-form-modal";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { FadeSlideIn } from "@/components/ui/fade-slide-in";
import type { ActivityStatus, Atividade, Etapa, StageStatus } from "@/data/obras";
import { useStageActivities } from "@/hooks/use-stage-activities";
import { getErrorMessage } from "@/services/api";
import { stagesService } from "@/services/stages.service";
import { tapMedium } from "@/utils/haptics";
import { mapStage } from "@/utils/stage-mappers";
import {
  ACTIVITY_STATUS_CONFIG,
  STAGE_STATUS_CONFIG,
  progressBarColor,
} from "@/utils/stage-ui";
import { colors } from "@/theme/colors";

// ─── Progress bar ─────────────────────────────────────────────────────────────
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

// ─── Tri-state checkbox ───────────────────────────────────────────────────────
function StatusCheckbox({
  status,
  readOnly,
  onPress,
}: {
  status: ActivityStatus;
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
  const cfg = ACTIVITY_STATUS_CONFIG[status];
  return (
    <Pressable onPress={handlePress} disabled={readOnly} hitSlop={8}>
      <Animated.View
        style={[
          styles.checkbox,
          status === "DONE" && { backgroundColor: cfg.dot, borderColor: cfg.dot },
          status === "IN_PROGRESS" && { borderColor: cfg.dot },
          animStyle,
        ]}
      >
        {status === "DONE" && (
          <MaterialIcons name="check" size={15} color="#FFFFFF" />
        )}
        {status === "IN_PROGRESS" && (
          <View style={[styles.halfDot, { backgroundColor: cfg.dot }]} />
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── Activity row ─────────────────────────────────────────────────────────────
function ActivityRow({
  atividade,
  index,
  readOnly,
  onToggle,
  onMorePress,
}: {
  atividade: Atividade;
  index: number;
  readOnly: boolean;
  onToggle: () => void;
  onMorePress?: () => void;
}) {
  const cfg = ACTIVITY_STATUS_CONFIG[atividade.status];
  const done = atividade.status === "DONE";
  return (
    <FadeSlideIn index={index}>
      <View style={[styles.activityCard, done && styles.activityCardDone]}>
        <StatusCheckbox
          status={atividade.status}
          readOnly={readOnly}
          onPress={onToggle}
        />
        <View style={styles.activityInfo}>
          <Text
            style={[styles.activityTitle, done && styles.activityTitleDone]}
            numberOfLines={2}
          >
            {atividade.nome}
          </Text>
          {!!atividade.descricao && (
            <Text style={styles.activityDesc} numberOfLines={2}>
              {atividade.descricao}
            </Text>
          )}
          <View style={[styles.activityStatusChip, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.activityStatusText, { color: cfg.color }]}>
              {cfg.label}
            </Text>
          </View>
        </View>
        {!readOnly && onMorePress && (
          <TouchableOpacity
            onPress={onMorePress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
            style={styles.moreBtn}
            activeOpacity={0.6}
          >
            <MaterialIcons name="more-vert" size={20} color="#C4C9D4" />
          </TouchableOpacity>
        )}
      </View>
    </FadeSlideIn>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function StageDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    stageId: string;
    projectId?: string;
    name?: string;
    canEdit?: string;
  }>();
  const stageId = params.stageId!;
  const canEdit = params.canEdit === "1";

  const [stage, setStage] = useState<Etapa | null>(null);
  const [stageStatus, setStageStatus] = useState<StageStatus>("NOT_STARTED");

  const {
    atividades,
    loading,
    error,
    total,
    completed,
    progress,
    refresh,
    addActivity,
    updateActivity,
    setActivityStatus,
    deleteActivity,
  } = useStageActivities(stageId);

  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editing, setEditing] = useState<Atividade | undefined>(undefined);
  const [actionActivity, setActionActivity] = useState<Atividade | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const openRowRef = useRef<Swipeable | null>(null);

  // Carrega a etapa para cabeçalho/status. Usa o nome passado por param como
  // placeholder instantâneo enquanto carrega.
  useEffect(() => {
    let active = true;
    stagesService
      .getById(stageId)
      .then((dto) => {
        if (!active) return;
        const mapped = mapStage(dto);
        setStage(mapped);
        setStageStatus(mapped.status);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [stageId]);

  const headerName = stage?.nome ?? params.name ?? "Etapa";
  const statusCfg = STAGE_STATUS_CONFIG[stageStatus];
  const pendingDeleteActivity = atividades.find((a) => a.id === pendingDeleteId);

  const STATUSES: StageStatus[] = useMemo(
    () => ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
    [],
  );

  const handleToggle = useCallback(
    (atividade: Atividade) => {
      const next: ActivityStatus =
        atividade.status === "DONE" ? "PENDING" : "DONE";
      tapMedium();
      setActivityStatus(atividade.id, next).catch(() => {
        Alert.alert("Erro", "Não foi possível atualizar a atividade.");
      });
    },
    [setActivityStatus],
  );

  const handleChangeStageStatus = useCallback(
    async (next: StageStatus) => {
      if (next === stageStatus) return;
      const prev = stageStatus;
      setStageStatus(next);
      try {
        await stagesService.update(stageId, { status: next });
      } catch (e) {
        setStageStatus(prev);
        Alert.alert("Erro", getErrorMessage(e, "Não foi possível alterar o status."));
      }
    },
    [stageId, stageStatus],
  );

  const handleSaveActivity = useCallback(
    async (values: Parameters<typeof addActivity>[0]) => {
      try {
        if (editing) await updateActivity(editing.id, values);
        else await addActivity(values);
        setShowActivityModal(false);
        setEditing(undefined);
      } catch (e) {
        Alert.alert("Erro", getErrorMessage(e, "Não foi possível salvar a atividade."));
        throw e;
      }
    },
    [editing, addActivity, updateActivity],
  );

  const renderRightActions = (atividade: Atividade) => (
    <View style={styles.rightActionsWrap}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setPendingDeleteId(atividade.id)}
        style={styles.deleteAction}
      >
        <MaterialIcons name="delete-outline" size={20} color="#FFFFFF" />
        <Text style={styles.deleteText}>Excluir</Text>
      </TouchableOpacity>
    </View>
  );

  const bottomPad = insets.bottom + (canEdit ? 96 : 24);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back-ios-new" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {headerName}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stage hero */}
        <View style={styles.hero}>
          <View style={[styles.statusChip, { backgroundColor: statusCfg.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusCfg.dot }]} />
            <Text style={[styles.statusChipText, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>

          <Text style={styles.heroTitle}>{headerName}</Text>
          {!!stage?.descricao && (
            <Text style={styles.heroDesc}>{stage.descricao}</Text>
          )}

          <View style={styles.heroProgressRow}>
            <ProgressBar progress={progress} color={progressBarColor(progress)} />
            <Text
              style={[
                styles.heroProgressLabel,
                progress == null && styles.heroProgressMuted,
              ]}
            >
              {progress == null
                ? "Sem atividades"
                : `${completed}/${total} · ${Math.round(progress * 100)}%`}
            </Text>
          </View>

          {/* Stage status control */}
          {canEdit && (
            <View style={styles.statusControl}>
              {STATUSES.map((s) => {
                const cfg = STAGE_STATUS_CONFIG[s];
                const selected = stageStatus === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusSegment,
                      selected && {
                        backgroundColor: cfg.bg,
                        borderColor: cfg.dot,
                      },
                    ]}
                    onPress={() => handleChangeStageStatus(s)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.statusSegmentText,
                        selected && { color: cfg.color, fontWeight: "700" },
                      ]}
                      numberOfLines={1}
                    >
                      {cfg.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Activities */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Atividades</Text>
          {total > 0 && (
            <Text style={styles.sectionCount}>
              {completed} de {total} concluída{total !== 1 ? "s" : ""}
            </Text>
          )}
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <Text style={styles.mutedText}>Carregando atividades…</Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <MaterialIcons name="error-outline" size={32} color="#D1D5DB" />
            <Text style={styles.mutedText}>{error}</Text>
            <TouchableOpacity onPress={refresh} style={styles.retryBtn}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : atividades.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <MaterialIcons name="playlist-add" size={34} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>Nenhuma atividade</Text>
            <Text style={styles.emptySubtitle}>
              {canEdit
                ? "Adicione atividades para acompanhar o progresso desta etapa."
                : "As atividades desta etapa aparecerão aqui."}
            </Text>
            {canEdit && (
              <TouchableOpacity
                style={styles.emptyCta}
                onPress={() => {
                  setEditing(undefined);
                  setShowActivityModal(true);
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.emptyCtaText}>Adicionar atividade</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          atividades.map((atividade, index) => {
            const row = (
              <ActivityRow
                atividade={atividade}
                index={index}
                readOnly={!canEdit}
                onToggle={() => handleToggle(atividade)}
                onMorePress={() => setActionActivity(atividade)}
              />
            );
            if (!canEdit) return <View key={atividade.id}>{row}</View>;
            return (
              <Swipeable
                key={atividade.id}
                overshootRight={false}
                friction={2}
                rightThreshold={24}
                renderRightActions={() => renderRightActions(atividade)}
                onSwipeableWillOpen={() => {
                  if (openRowRef.current) openRowRef.current.close();
                }}
                onSwipeableOpen={(_, swipeable) => {
                  openRowRef.current = swipeable ?? null;
                }}
              >
                {row}
              </Swipeable>
            );
          })
        )}
      </ScrollView>

      {/* FAB add */}
      {canEdit && atividades.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 20 }]}
          activeOpacity={0.9}
          onPress={() => {
            setEditing(undefined);
            setShowActivityModal(true);
          }}
        >
          <MaterialIcons name="add" size={26} color="#FFFFFF" />
          <Text style={styles.fabText}>Atividade</Text>
        </TouchableOpacity>
      )}

      {/* Activity action sheet */}
      <Modal
        visible={actionActivity !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActionActivity(null)}
      >
        <TouchableOpacity
          style={styles.actionSheetBackdrop}
          onPress={() => setActionActivity(null)}
          activeOpacity={1}
        >
          <View style={styles.actionSheet}>
            <Text style={styles.actionSheetTitle} numberOfLines={1}>
              {actionActivity?.nome}
            </Text>
            {actionActivity && actionActivity.status !== "IN_PROGRESS" && (
              <>
                <View style={styles.actionSheetDivider} />
                <TouchableOpacity
                  style={styles.actionSheetItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    const a = actionActivity;
                    setActionActivity(null);
                    setActivityStatus(a.id, "IN_PROGRESS").catch(() => {
                      Alert.alert("Erro", "Não foi possível atualizar.");
                    });
                  }}
                >
                  <MaterialIcons name="hourglass-top" size={20} color="#B45309" />
                  <Text style={styles.actionSheetItemText}>
                    Marcar em andamento
                  </Text>
                </TouchableOpacity>
              </>
            )}
            <View style={styles.actionSheetDivider} />
            <TouchableOpacity
              style={styles.actionSheetItem}
              activeOpacity={0.7}
              onPress={() => {
                setEditing(actionActivity ?? undefined);
                setActionActivity(null);
                setShowActivityModal(true);
              }}
            >
              <MaterialIcons name="edit" size={20} color="#374151" />
              <Text style={styles.actionSheetItemText}>Editar atividade</Text>
            </TouchableOpacity>
            <View style={styles.actionSheetDivider} />
            <TouchableOpacity
              style={styles.actionSheetItem}
              activeOpacity={0.7}
              onPress={() => {
                if (actionActivity) setPendingDeleteId(actionActivity.id);
                setActionActivity(null);
              }}
            >
              <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
              <Text style={[styles.actionSheetItemText, styles.dangerText]}>
                Excluir atividade
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ActivityFormModal
        visible={showActivityModal}
        activity={editing}
        onSave={handleSaveActivity}
        onClose={() => {
          setShowActivityModal(false);
          setEditing(undefined);
        }}
      />

      <ConfirmSheet
        visible={pendingDeleteId !== null}
        icon="delete-outline"
        iconColor="#EF4444"
        title="Excluir atividade?"
        message={
          pendingDeleteActivity
            ? `Tem certeza que deseja excluir "${pendingDeleteActivity.nome}"?`
            : undefined
        }
        confirmLabel="Excluir"
        confirmVariant="destructive"
        onConfirm={() => {
          if (pendingDeleteId)
            deleteActivity(pendingDeleteId).catch(() => {
              Alert.alert("Erro", "Não foi possível excluir a atividade.");
            });
          setPendingDeleteId(null);
        }}
        onClose={() => setPendingDeleteId(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F5F5" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F2F4",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },

  // Hero
  hero: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusChipText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.2 },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.4,
    marginTop: 12,
  },
  heroDesc: { fontSize: 13.5, color: "#6B7280", marginTop: 6, lineHeight: 19 },
  heroProgressRow: { marginTop: 16, gap: 7 },
  heroProgressLabel: { fontSize: 12.5, fontWeight: "700", color: "#374151" },
  heroProgressMuted: { color: "#9CA3AF", fontWeight: "500" },

  statusControl: {
    flexDirection: "row",
    gap: 6,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  statusSegment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  statusSegmentText: { fontSize: 11.5, color: "#6B7280", fontWeight: "500" },

  progressTrack: {
    height: 7,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: 7, borderRadius: 4 },

  // Section
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  sectionCount: { fontSize: 12.5, fontWeight: "600", color: "#6B7280" },

  // Activity card
  activityCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  activityCardDone: { opacity: 0.62 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  halfDot: { width: 10, height: 10, borderRadius: 3 },
  activityInfo: { flex: 1, gap: 6 },
  activityTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  activityTitleDone: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  activityDesc: { fontSize: 12.5, color: "#9CA3AF", lineHeight: 17 },
  activityStatusChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activityStatusText: { fontSize: 10.5, fontWeight: "700", letterSpacing: 0.2 },
  moreBtn: { alignItems: "center", justifyContent: "center", flexShrink: 0 },

  // Swipe delete
  rightActionsWrap: {
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  deleteAction: {
    height: "100%",
    minWidth: 104,
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

  // States
  centerBox: { alignItems: "center", paddingVertical: 40, gap: 10 },
  mutedText: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  retryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },

  emptyState: { alignItems: "center", paddingVertical: 44, gap: 10 },
  emptyIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151" },
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
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 6,
  },
  emptyCtaText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  // FAB
  fab: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingLeft: 16,
    paddingRight: 20,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  fabText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },

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
