import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  type ProposalTask,
  type WizardOption,
  type WizardQuestion,
  Q1,
  Q2_BY_TYPE,
  Q3,
  Q4,
  selectProposalTasks,
} from "@/data/task-proposals";

const PRIMARY = "#2563EB";
const PRIMARY_BG = "#EFF6FF";
const BORDER = "#E5E7EB";
const TEXT = "#111827";
const TEXT_MUTED = "#6B7280";
const TEXT_SUBTLE = "#9CA3AF";
const SUCCESS = "#16A34A";

const PRIORITY_COLORS = {
  ALTA: "#DC2626",
  MEDIA: "#F59E0B",
  BAIXA: "#6B7280",
} as const;

interface RawAnswers {
  q1: string | null;
  q2: string | null;
  q3: string | null;
  q4: string | null;
}

interface TaskProposalModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (tasks: Array<{ titulo: string; descricao: string; prioridade: "ALTA" | "MEDIA" | "BAIXA" }>) => void;
  existingCount: number;
  taskLimit: number;
}

const TOTAL_STEPS = 4;

export function TaskProposalModal({
  visible,
  onClose,
  onConfirm,
  existingCount,
  taskLimit,
}: TaskProposalModalProps) {
  const [step, setStep] = useState(0); // 0-3 = questions, 4 = review
  const [answers, setAnswers] = useState<RawAnswers>({ q1: null, q2: null, q3: null, q4: null });
  const [proposedTasks, setProposedTasks] = useState<ProposalTask[]>([]);
  const [selectedSet, setSelectedSet] = useState<Set<number>>(new Set());

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const questions: WizardQuestion[] = useMemo(() => {
    const q2 = Q2_BY_TYPE[answers.q1 ?? "new_construction"] ?? Q2_BY_TYPE.new_construction;
    return [Q1, q2, Q3, Q4];
  }, [answers.q1]);

  const currentAnswer = useCallback(
    (s: number): string | null => {
      if (s === 0) return answers.q1;
      if (s === 1) return answers.q2;
      if (s === 2) return answers.q3;
      return answers.q4;
    },
    [answers],
  );

  const animateTransition = useCallback((fn: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 12, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      fn();
      slideAnim.setValue(-12);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  const handleSelect = (optionId: string) => {
    setAnswers((prev) => {
      if (step === 0) return { ...prev, q1: optionId, q2: null };
      if (step === 1) return { ...prev, q2: optionId };
      if (step === 2) return { ...prev, q3: optionId };
      return { ...prev, q4: optionId };
    });
  };

  const handleNext = () => {
    const answer = currentAnswer(step);
    if (!answer) return;

    if (step < TOTAL_STEPS - 1) {
      animateTransition(() => setStep((s) => s + 1));
      return;
    }

    // Last question answered — generate tasks
    const tasks = selectProposalTasks({
      projectType: answers.q1 as any,
      scope: answers.q2 ?? "house",
      minPhase: Number(answers.q3 ?? "1"),
      detailLevel: answer as any,
    });

    const available = taskLimit - existingCount;
    const capped = tasks.slice(0, available);
    setProposedTasks(capped);
    setSelectedSet(new Set(capped.map((_, i) => i)));
    animateTransition(() => setStep(4));
  };

  const handleBack = () => {
    if (step === 0) {
      handleClose();
      return;
    }
    animateTransition(() => setStep((s) => s - 1));
  };

  const handleClose = () => {
    // Reset on close
    setTimeout(() => {
      setStep(0);
      setAnswers({ q1: null, q2: null, q3: null, q4: null });
      setProposedTasks([]);
      setSelectedSet(new Set());
      slideAnim.setValue(0);
      fadeAnim.setValue(1);
    }, 300);
    onClose();
  };

  const toggleTask = (idx: number) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedSet.size === proposedTasks.length) {
      setSelectedSet(new Set());
    } else {
      setSelectedSet(new Set(proposedTasks.map((_, i) => i)));
    }
  };

  const handleConfirm = () => {
    const chosen = proposedTasks
      .filter((_, i) => selectedSet.has(i))
      .map((t) => ({ titulo: t.title, descricao: "", prioridade: t.priority }));
    onConfirm(chosen);
    handleClose();
  };

  // Group tasks by category preserving insertion order
  const grouped = useMemo(() => {
    const map = new Map<string, { task: ProposalTask; idx: number }[]>();
    proposedTasks.forEach((task, idx) => {
      const arr = map.get(task.category) ?? [];
      arr.push({ task, idx });
      map.set(task.category, arr);
    });
    return Array.from(map.entries());
  }, [proposedTasks]);

  const selectedCount = selectedSet.size;
  const isReview = step === 4;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />

        {/* ── Header ── */}
        <View style={styles.header}>
          {isReview ? (
            <View style={{ flex: 1 }} />
          ) : (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.headerBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialIcons name="arrow-back-ios" size={18} color={TEXT_MUTED} />
            </TouchableOpacity>
          )}

          {!isReview && (
            <View style={styles.progressRow}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.progressSegment, i <= step && styles.progressSegmentFilled]}
                />
              ))}
            </View>
          )}

          <TouchableOpacity
            onPress={handleClose}
            style={styles.headerBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialIcons name="close" size={20} color={TEXT_MUTED} />
          </TouchableOpacity>
        </View>

        {isReview ? (
          /* ── Review Screen ── */
          <View style={styles.flex}>
            <View style={styles.reviewTitleWrap}>
              <Text style={styles.reviewTitle}>Tarefas sugeridas</Text>
              <Text style={styles.reviewSubtitle}>
                {proposedTasks.length} tarefa{proposedTasks.length !== 1 ? "s" : ""} •{" "}
                <Text
                  style={{ color: PRIMARY }}
                  onPress={toggleAll}
                >
                  {selectedSet.size === proposedTasks.length ? "Desmarcar todas" : "Marcar todas"}
                </Text>
              </Text>
            </View>

            <ScrollView
              style={styles.reviewScroll}
              contentContainerStyle={styles.reviewScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {grouped.map(([category, items]) => (
                <View key={category} style={styles.categoryGroup}>
                  <Text style={styles.categoryLabel}>{category.toUpperCase()}</Text>
                  {items.map(({ task, idx }) => {
                    const checked = selectedSet.has(idx);
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={styles.taskRow}
                        onPress={() => toggleTask(idx)}
                        activeOpacity={0.65}
                      >
                        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                          {checked && (
                            <MaterialIcons name="check" size={11} color="#fff" />
                          )}
                        </View>
                        <Text
                          style={[styles.taskRowTitle, !checked && styles.taskRowTitleUnchecked]}
                          numberOfLines={1}
                        >
                          {task.title}
                        </Text>
                        <View
                          style={[
                            styles.priorityDot,
                            { backgroundColor: PRIORITY_COLORS[task.priority] },
                          ]}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

              <View style={{ height: 24 }} />
            </ScrollView>

            <View style={styles.reviewFooter}>
              <TouchableOpacity
                style={[styles.confirmBtn, selectedCount === 0 && styles.confirmBtnDisabled]}
                onPress={handleConfirm}
                disabled={selectedCount === 0}
                activeOpacity={0.85}
              >
                <MaterialIcons name="add-task" size={18} color="#fff" />
                <Text style={styles.confirmBtnText}>
                  Adicionar {selectedCount} tarefa{selectedCount !== 1 ? "s" : ""}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ── Question Screen ── */
          <Animated.View
            style={[styles.flex, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.questionContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.questionTitle}>{questions[step].title}</Text>
              <Text style={styles.questionSubtitle}>{questions[step].subtitle}</Text>

              <View style={styles.optionsWrap}>
                {questions[step].options.map((opt) => (
                  <OptionCard
                    key={opt.id}
                    option={opt}
                    selected={currentAnswer(step) === opt.id}
                    onPress={() => handleSelect(opt.id)}
                  />
                ))}
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.nextBtn,
                  !currentAnswer(step) && styles.nextBtnDisabled,
                ]}
                onPress={handleNext}
                disabled={!currentAnswer(step)}
                activeOpacity={0.85}
              >
                <Text style={styles.nextBtnText}>
                  {step < TOTAL_STEPS - 1 ? "Próximo" : "Ver sugestões"}
                </Text>
                <MaterialIcons
                  name={step < TOTAL_STEPS - 1 ? "arrow-forward" : "auto-awesome"}
                  size={18}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Option Card ──────────────────────────────────────────────────────────────

function OptionCard({
  option,
  selected,
  onPress,
}: {
  option: WizardOption;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.optionCard,
        selected && styles.optionCardSelected,
        pressed && !selected && styles.optionCardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.optionLeft}>
        <Text style={styles.optionEmoji}>{option.emoji}</Text>
        <View>
          <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
            {option.label}
          </Text>
          {option.description != null && (
            <Text style={styles.optionDescription}>{option.description}</Text>
          )}
        </View>
      </View>
      <View style={[styles.optionCheck, selected && styles.optionCheckSelected]}>
        {selected && <MaterialIcons name="check" size={13} color="#fff" />}
      </View>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  flex: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  progressRow: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    marginHorizontal: 12,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 99,
    backgroundColor: "#E5E7EB",
  },
  progressSegmentFilled: {
    backgroundColor: PRIMARY,
  },

  // Question
  questionContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  questionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: TEXT,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  questionSubtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    lineHeight: 20,
    marginBottom: 28,
  },
  optionsWrap: {
    gap: 10,
  },

  // Option card
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
  },
  optionCardSelected: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_BG,
  },
  optionCardPressed: {
    backgroundColor: "#F9FAFB",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  optionEmoji: {
    fontSize: 26,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: TEXT,
  },
  optionLabelSelected: {
    color: PRIMARY,
  },
  optionDescription: {
    fontSize: 12,
    color: TEXT_SUBTLE,
    marginTop: 2,
  },
  optionCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  optionCheckSelected: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },

  // Footer / Next button
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "android" ? 24 : 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
  },
  nextBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Review
  reviewTitleWrap: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT,
    letterSpacing: -0.3,
  },
  reviewSubtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  reviewScroll: {
    flex: 1,
  },
  reviewScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  categoryGroup: {
    marginBottom: 20,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_SUBTLE,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: {
    backgroundColor: SUCCESS,
    borderColor: SUCCESS,
  },
  taskRowTitle: {
    flex: 1,
    fontSize: 14,
    color: TEXT,
    fontWeight: "400",
  },
  taskRowTitleUnchecked: {
    color: TEXT_SUBTLE,
    textDecorationLine: "line-through",
  },
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
  },

  // Review footer
  reviewFooter: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "android" ? 24 : 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
  },
  confirmBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
