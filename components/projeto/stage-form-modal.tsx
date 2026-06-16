import { useToast } from "@/components/obra/toast";
import { AppModal as Modal } from "@/components/ui/app-modal";
import { CharacterLimitHint } from "@/components/ui/character-limit-hint";
import type { Etapa, StageStatus } from "@/data/obras";
import { STAGE_STATUS_CONFIG } from "@/utils/stage-ui";
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

const PRIMARY = "#2563EB";
const STAGE_NAME_MAX = 60;
const STAGE_DESCRIPTION_MAX = 160;

type LocalPriority = "ALTA" | "MEDIA" | "BAIXA";

const PRIORITIES: { value: LocalPriority | null; label: string; color: string }[] =
  [
    { value: null, label: "Nenhuma", color: "#9CA3AF" },
    { value: "ALTA", label: "Alta", color: "#DC2626" },
    { value: "MEDIA", label: "Média", color: "#EA580C" },
    { value: "BAIXA", label: "Baixa", color: "#22C55E" },
  ];

const STATUSES: StageStatus[] = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"];

export interface StageFormValues {
  nome: string;
  descricao: string;
  prioridade: LocalPriority | null;
  status: StageStatus;
}

interface StageFormModalProps {
  visible: boolean;
  stage?: Etapa;
  onSave: (values: StageFormValues) => Promise<void>;
  onClose: () => void;
}

export function StageFormModal({
  visible,
  stage,
  onSave,
  onClose,
}: StageFormModalProps) {
  const { showToast } = useToast();
  const [nome, setNome] = useState("");
  const [nomeError, setNomeError] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState<LocalPriority | null>(null);
  const [status, setStatus] = useState<StageStatus>("NOT_STARTED");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (stage) {
      setNome(stage.nome);
      setDescricao(stage.descricao);
      setPrioridade(stage.prioridade);
      setStatus(stage.status);
      setNomeError(false);
      setIsSaving(false);
    } else {
      reset();
    }
  }, [stage, visible]);

  const reset = () => {
    setNome("");
    setNomeError(false);
    setDescricao("");
    setPrioridade(null);
    setStatus("NOT_STARTED");
    setIsSaving(false);
  };

  const handleSave = async () => {
    const trimmedNome = nome.trim().slice(0, STAGE_NAME_MAX);
    if (!trimmedNome) {
      setNomeError(true);
      showToast({ title: "Nome obrigatório", tone: "error" });
      return;
    }
    setNomeError(false);
    setIsSaving(true);
    try {
      await onSave({
        nome: trimmedNome,
        descricao: descricao.trim().slice(0, STAGE_DESCRIPTION_MAX),
        prioridade,
        status,
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
            {stage ? "Editar Etapa" : "Nova Etapa"}
          </Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Nome */}
          <View style={styles.field}>
            <Text style={[styles.label, nomeError && { color: "#EF4444" }]}>
              Nome da etapa *
            </Text>
            <TextInput
              style={[styles.input, nomeError && styles.inputError]}
              placeholder="Ex: Fundação"
              placeholderTextColor="#9CA3AF"
              value={nome}
              onChangeText={(t) => {
                setNome(t);
                if (nomeError) setNomeError(false);
              }}
              maxLength={STAGE_NAME_MAX}
            />
            <CharacterLimitHint current={nome.length} max={STAGE_NAME_MAX} />
          </View>

          {/* Descrição */}
          <View style={styles.field}>
            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Detalhes sobre a etapa (opcional)"
              placeholderTextColor="#9CA3AF"
              value={descricao}
              onChangeText={setDescricao}
              maxLength={STAGE_DESCRIPTION_MAX}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <CharacterLimitHint
              current={descricao.length}
              max={STAGE_DESCRIPTION_MAX}
            />
          </View>

          {/* Status */}
          <View style={styles.field}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.segmented}>
              {STATUSES.map((s) => {
                const cfg = STAGE_STATUS_CONFIG[s];
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
            <Text style={styles.hint}>
              O progresso é calculado pelas atividades; o status é definido por
              você.
            </Text>
          </View>

          {/* Prioridade */}
          <View style={styles.field}>
            <Text style={styles.label}>Prioridade</Text>
            <View style={styles.prioRow}>
              {PRIORITIES.map((p) => {
                const selected = prioridade === p.value;
                return (
                  <TouchableOpacity
                    key={p.label}
                    style={[
                      styles.prioChip,
                      selected && {
                        borderColor: p.color,
                        backgroundColor: p.color + "12",
                      },
                    ]}
                    onPress={() => setPrioridade(p.value)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[styles.prioDot, { backgroundColor: p.color }]}
                    />
                    <Text
                      style={[
                        styles.prioChipText,
                        selected && { color: p.color, fontWeight: "700" },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
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
                  {stage ? "Atualizar" : "Criar etapa"}
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
  hint: { fontSize: 11.5, color: "#9CA3AF", lineHeight: 16 },

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

  prioRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  prioChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  prioDot: { width: 10, height: 10, borderRadius: 5 },
  prioChipText: { fontSize: 13, color: "#6B7280", fontWeight: "500" },

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
