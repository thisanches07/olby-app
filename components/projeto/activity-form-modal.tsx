import { useToast } from "@/components/obra/toast";
import { AppModal as Modal } from "@/components/ui/app-modal";
import { CharacterLimitHint } from "@/components/ui/character-limit-hint";
import type { ActivityStatus, Atividade } from "@/data/obras";
import type { ActivityFormValues } from "@/hooks/use-stage-activities";
import { ACTIVITY_STATUS_CONFIG } from "@/utils/stage-ui";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityDateRangeFields,
  validateActivityDateRange,
} from "./activity-date-range-fields";

const PRIMARY = "#2563EB";
const ACTIVITY_NAME_MAX = 80;
const ACTIVITY_DESCRIPTION_MAX = 200;

const STATUSES: ActivityStatus[] = ["PENDING", "IN_PROGRESS", "DONE"];

interface ActivityFormModalProps {
  visible: boolean;
  activity?: Atividade;
  onSave: (values: ActivityFormValues) => Promise<void>;
  onClose: () => void;
}

export function ActivityFormModal({
  visible,
  activity,
  onSave,
  onClose,
}: ActivityFormModalProps) {
  const { showToast } = useToast();
  const [nome, setNome] = useState("");
  const [nomeError, setNomeError] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<ActivityStatus>("PENDING");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activity) {
      setNome(activity.nome);
      setDescricao(activity.descricao);
      setStatus(activity.status);
      setStartDate(activity.startDate);
      setDueDate(activity.dueDate);
      setNomeError(false);
      setIsSaving(false);
    } else {
      reset();
    }
  }, [activity, visible]);

  const reset = () => {
    setNome("");
    setNomeError(false);
    setDescricao("");
    setStatus("PENDING");
    setStartDate(null);
    setDueDate(null);
    setIsSaving(false);
  };

  const handleSave = async () => {
    const trimmedNome = nome.trim().slice(0, ACTIVITY_NAME_MAX);
    if (!trimmedNome) {
      setNomeError(true);
      showToast({ title: "Nome obrigatório", tone: "error" });
      return;
    }
    const dateError = validateActivityDateRange({ startDate, dueDate });
    if (dateError) {
      showToast({ title: dateError, tone: "error" });
      return;
    }
    setNomeError(false);
    setIsSaving(true);
    try {
      await onSave({
        nome: trimmedNome,
        descricao: descricao.trim().slice(0, ACTIVITY_DESCRIPTION_MAX),
        status,
        startDate,
        dueDate,
      });
      reset();
    } catch {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isSaving) return;
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleCancel}
            activeOpacity={0.7}
            disabled={isSaving}
          >
            <MaterialIcons
              name="close"
              size={24}
              color={isSaving ? "#D1D5DB" : "#374151"}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {activity ? "Editar Atividade" : "Nova Atividade"}
          </Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.field}>
            <Text style={[styles.label, nomeError && { color: "#EF4444" }]}>
              Nome da atividade *
            </Text>
            <TextInput
              style={[styles.input, nomeError && styles.inputError]}
              placeholder="Ex: Concretagem da sapata"
              placeholderTextColor="#9CA3AF"
              value={nome}
              onChangeText={(t) => {
                setNome(t);
                if (nomeError) setNomeError(false);
              }}
              maxLength={ACTIVITY_NAME_MAX}
            />
            <CharacterLimitHint current={nome.length} max={ACTIVITY_NAME_MAX} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Detalhes sobre a atividade (opcional)"
              placeholderTextColor="#9CA3AF"
              value={descricao}
              onChangeText={setDescricao}
              maxLength={ACTIVITY_DESCRIPTION_MAX}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <CharacterLimitHint
              current={descricao.length}
              max={ACTIVITY_DESCRIPTION_MAX}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.segmented}>
              {STATUSES.map((s) => {
                const cfg = ACTIVITY_STATUS_CONFIG[s];
                const selected = status === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.segment,
                      selected && {
                        backgroundColor: cfg.bg,
                        borderColor: cfg.dot,
                      },
                    ]}
                    onPress={() => setStatus(s)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[styles.segmentDot, { backgroundColor: cfg.dot }]}
                    />
                    <Text
                      style={[
                        styles.segmentText,
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
          </View>

          <View style={styles.field}>
            <ActivityDateRangeFields
              value={{ startDate, dueDate }}
              onChange={(next) => {
                setStartDate(next.startDate ?? null);
                setDueDate(next.dueDate ?? null);
              }}
              disabled={isSaving}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            activeOpacity={0.7}
            disabled={isSaving}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              styles.saveButton,
              isSaving && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="check" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>
                  {activity ? "Atualizar" : "Adicionar"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: 20, paddingVertical: 16, gap: 16 },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: "700", color: "#374151" },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
  },
  inputError: { borderColor: "#EF4444", backgroundColor: "#FFF1F2" },
  textArea: { minHeight: 84, paddingTop: 12 },
  segmented: { flexDirection: "row", gap: 8 },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  segmentDot: { width: 8, height: 8, borderRadius: 4 },
  segmentText: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  cancelButton: { backgroundColor: "#F3F4F6" },
  cancelButtonText: { fontSize: 14, fontWeight: "700", color: "#6B7280" },
  saveButton: { backgroundColor: PRIMARY },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
});
