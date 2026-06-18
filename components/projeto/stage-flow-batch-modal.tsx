import { useToast } from "@/components/obra/toast";
import { AppModal as Modal } from "@/components/ui/app-modal";
import type { CreateStageBatchItemDto } from "@/services/stages.service";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityDateRangeFields,
  validateActivityDateRange,
} from "./activity-date-range-fields";

const PRIMARY = "#2563EB";
const STAGE_NAME_MAX = 60;
const ACTIVITY_NAME_MAX = 80;
const STAGE_BATCH_MAX = 100;
const ACTIVITY_BATCH_MAX = 100;

type DraftActivity = {
  id: string;
  name: string;
  startDate: string | null;
  dueDate: string | null;
};
type DraftStage = {
  id: string;
  name: string;
  activities: DraftActivity[];
  expanded: boolean;
};

interface StageFlowBatchModalProps {
  visible: boolean;
  onSave: (stages: CreateStageBatchItemDto[]) => Promise<void>;
  onClose: () => void;
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createStage(): DraftStage {
  return { id: uid("stage"), name: "", activities: [], expanded: true };
}

function createActivity(): DraftActivity {
  return { id: uid("act"), name: "", startDate: null, dueDate: null };
}

export function StageFlowBatchModal({
  visible,
  onSave,
  onClose,
}: StageFlowBatchModalProps) {
  const { showToast } = useToast();
  const [stages, setStages] = useState<DraftStage[]>([createStage()]);
  const [autoFocusId, setAutoFocusId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setStages([createStage()]);
      setAutoFocusId(null);
      setIsSaving(false);
    }
  }, [visible]);

  const validStageCount = useMemo(
    () => stages.filter((s) => s.name.trim().length > 0).length,
    [stages],
  );

  const limitReached = stages.length >= STAGE_BATCH_MAX;

  // -- Stage mutations ---------------------------------------------------------
  const addStage = () => {
    if (limitReached) {
      showToast({
        title: `Limite de ${STAGE_BATCH_MAX} etapas por fluxo`,
        tone: "error",
      });
      return;
    }
    const next = createStage();
    setStages((prev) => [...prev, next]);
    setAutoFocusId(next.id);
  };

  const removeStage = (id: string) => {
    setStages((prev) => prev.filter((s) => s.id !== id));
  };

  const updateStageName = (id: string, name: string) => {
    setStages((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, name: name.slice(0, STAGE_NAME_MAX) } : s,
      ),
    );
  };

  const toggleExpand = (id: string) => {
    setStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, expanded: !s.expanded } : s)),
    );
  };

  // -- Activity mutations ------------------------------------------------------
  const addActivity = (stageId: string) => {
    let createdId: string | null = null;
    setStages((prev) =>
      prev.map((s) => {
        if (s.id !== stageId) return s;
        if (s.activities.length >= ACTIVITY_BATCH_MAX) {
          showToast({
            title: `Limite de ${ACTIVITY_BATCH_MAX} atividades por etapa`,
            tone: "error",
          });
          return s;
        }
        const act = createActivity();
        createdId = act.id;
        return { ...s, expanded: true, activities: [...s.activities, act] };
      }),
    );
    if (createdId) setAutoFocusId(createdId);
  };

  const updateActivityName = (
    stageId: string,
    activityId: string,
    name: string,
  ) => {
    setStages((prev) =>
      prev.map((s) =>
        s.id === stageId
          ? {
              ...s,
              activities: s.activities.map((a) =>
                a.id === activityId
                  ? { ...a, name: name.slice(0, ACTIVITY_NAME_MAX) }
                  : a,
              ),
            }
          : s,
      ),
    );
  };

  const updateActivityDates = (
    stageId: string,
    activityId: string,
    dates: { startDate?: string | null; dueDate?: string | null },
  ) => {
    setStages((prev) =>
      prev.map((s) =>
        s.id === stageId
          ? {
              ...s,
              activities: s.activities.map((a) =>
                a.id === activityId ? { ...a, ...dates } : a,
              ),
            }
          : s,
      ),
    );
  };

  const removeActivity = (stageId: string, activityId: string) => {
    setStages((prev) =>
      prev.map((s) =>
        s.id === stageId
          ? { ...s, activities: s.activities.filter((a) => a.id !== activityId) }
          : s,
      ),
    );
  };

  // -- Save --------------------------------------------------------------------
  const handleSave = async () => {
    const dateError = stages
      .flatMap((s) => s.activities)
      .map((activity) =>
        validateActivityDateRange({
          startDate: activity.startDate,
          dueDate: activity.dueDate,
        }),
      )
      .find(Boolean);
    if (dateError) {
      showToast({ title: dateError, tone: "error" });
      return;
    }

    const payload: CreateStageBatchItemDto[] = stages
      .map((s) => {
        const name = s.name.trim().slice(0, STAGE_NAME_MAX);
        const activities = s.activities
          .map((a) => ({
            name: a.name.trim().slice(0, ACTIVITY_NAME_MAX),
            startDate: a.startDate,
            dueDate: a.dueDate,
          }))
          .filter((activity) => activity.name.length > 0);
        return {
          name,
          activities: activities.length ? { activities } : undefined,
        };
      })
      .filter((s) => s.name.length > 0);

    if (payload.length === 0) {
      showToast({
        title: "Adicione ao menos uma etapa com nome",
        tone: "error",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(payload);
    } catch {
      setIsSaving(false);
    }
  };

  // -- Render ------------------------------------------------------------------
  const renderStage = ({
    item,
    drag,
    isActive,
    getIndex,
  }: RenderItemParams<DraftStage>) => {
    const index = typeof getIndex === "function" ? (getIndex() ?? 0) : 0;
    const activityCount = item.activities.length;

    return (
      <ScaleDecorator activeScale={1.02}>
        <View style={[styles.stageCard, isActive && styles.stageCardDragging]}>
          <View style={styles.stageHeader}>
            <TouchableOpacity
              style={styles.dragHandle}
              onLongPress={drag}
              delayLongPress={150}
              disabled={isSaving || stages.length < 2}
              activeOpacity={0.5}
            >
              <Text style={styles.stageNumber}>{index + 1}</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.stageInput}
              value={item.name}
              onChangeText={(t) => updateStageName(item.id, t)}
              editable={!isSaving}
              autoFocus={autoFocusId === item.id}
              maxLength={STAGE_NAME_MAX}
              placeholder="Nome da etapa"
              placeholderTextColor="#9CA3AF"
              returnKeyType="next"
            />

            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => removeStage(item.id)}
              disabled={isSaving}
              activeOpacity={0.6}
            >
              <MaterialIcons name="close" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.stageMetaRow}
            onPress={() => toggleExpand(item.id)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="checklist"
              size={16}
              color={activityCount > 0 ? PRIMARY : "#9CA3AF"}
            />
            <Text
              style={[
                styles.stageMetaText,
                activityCount > 0 && { color: PRIMARY },
              ]}
            >
              {activityCount > 0
                ? `${activityCount} atividade${activityCount !== 1 ? "s" : ""}`
                : "Sem atividades"}
            </Text>
            <View style={{ flex: 1 }} />
            <MaterialIcons
              name={item.expanded ? "expand-less" : "expand-more"}
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>

          {item.expanded && (
            <View style={styles.activitiesBlock}>
              {item.activities.map((activity, actIndex) => (
                <View key={activity.id} style={styles.activityCard}>
                  <View style={styles.activityRow}>
                  <View style={styles.activityDot}>
                    <Text style={styles.activityDotText}>{actIndex + 1}</Text>
                  </View>
                  <TextInput
                    style={styles.activityInput}
                    value={activity.name}
                    onChangeText={(t) =>
                      updateActivityName(item.id, activity.id, t)
                    }
                    editable={!isSaving}
                    autoFocus={autoFocusId === activity.id}
                    maxLength={ACTIVITY_NAME_MAX}
                    placeholder="Ex: Escavação"
                    placeholderTextColor="#9CA3AF"
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={styles.iconBtnSmall}
                    onPress={() => removeActivity(item.id, activity.id)}
                    disabled={isSaving}
                    activeOpacity={0.6}
                  >
                    <MaterialIcons name="close" size={18} color="#C4C9D4" />
                  </TouchableOpacity>
                  </View>
                  <View style={styles.activityDates}>
                    <ActivityDateRangeFields
                      value={{
                        startDate: activity.startDate,
                        dueDate: activity.dueDate,
                      }}
                      onChange={(next) =>
                        updateActivityDates(item.id, activity.id, next)
                      }
                      disabled={isSaving}
                      compact
                    />
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addActivityBtn}
                onPress={() => addActivity(item.id)}
                disabled={isSaving}
                activeOpacity={0.7}
              >
                <MaterialIcons name="add" size={18} color={PRIMARY} />
                <Text style={styles.addActivityText}>Adicionar atividade</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={onClose}
            disabled={isSaving}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="close"
              size={24}
              color={isSaving ? "#D1D5DB" : "#374151"}
            />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Fluxo de etapas</Text>
            <Text style={styles.headerSubtitle}>Monte tudo de uma vez</Text>
          </View>
          <View style={styles.headerBtn} />
        </View>

        <DraggableFlatList
          data={stages}
          keyExtractor={(item) => item.id}
          renderItem={renderStage}
          onDragEnd={({ data }) => setStages(data)}
          activationDistance={14}
          animationConfig={{ damping: 18, stiffness: 180, mass: 0.7 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.listHeaderRow}>
              <Text style={styles.listHeaderTitle}>
                {stages.length}/{STAGE_BATCH_MAX} etapas
              </Text>
              {stages.length > 1 && (
                <View style={styles.dragHint}>
                  <MaterialIcons
                    name="drag-indicator"
                    size={14}
                    color="#9CA3AF"
                  />
                  <Text style={styles.dragHintText}>
                    Segure o número para reordenar
                  </Text>
                </View>
              )}
            </View>
          }
          ListFooterComponent={
            <TouchableOpacity
              style={[styles.addStageBtn, limitReached && styles.btnDisabled]}
              onPress={addStage}
              disabled={isSaving || limitReached}
              activeOpacity={0.85}
            >
              <MaterialIcons name="add" size={20} color={PRIMARY} />
              <Text style={styles.addStageText}>Adicionar etapa</Text>
            </TouchableOpacity>
          }
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (isSaving || validStageCount === 0) && styles.btnDisabled,
            ]}
            onPress={handleSave}
            disabled={isSaving || validStageCount === 0}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.saveButtonText}>
                  {validStageCount > 0
                    ? `Criar ${validStageCount} etapa${validStageCount !== 1 ? "s" : ""}`
                    : "Criar etapas"}
                </Text>
                <MaterialIcons name="check" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F6FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  listHeaderTitle: { fontSize: 13, fontWeight: "800", color: "#111827" },
  dragHint: { flexDirection: "row", alignItems: "center", gap: 4 },
  dragHintText: { fontSize: 11, fontWeight: "600", color: "#9CA3AF" },

  stageCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F2F4",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  stageCardDragging: {
    borderColor: PRIMARY + "40",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  stageHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  dragHandle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  stageNumber: { fontSize: 13, fontWeight: "800", color: PRIMARY },
  stageInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnSmall: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  stageMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingLeft: 2,
  },
  stageMetaText: { fontSize: 12.5, fontWeight: "700", color: "#9CA3AF" },

  activitiesBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 8,
  },
  activityCard: {
    gap: 8,
  },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  activityDates: {
    marginLeft: 30,
  },
  activityDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  activityDotText: { fontSize: 11, fontWeight: "700", color: "#6B7280" },
  activityInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13.5,
    color: "#111827",
  },
  addActivityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  addActivityText: { fontSize: 13, fontWeight: "700", color: PRIMARY },

  addStageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  addStageText: { fontSize: 14, fontWeight: "800", color: PRIMARY },
  btnDisabled: { opacity: 0.5 },

  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  saveButton: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveButtonText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
});
