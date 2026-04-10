import { Tarefa } from "@/data/obras";
import { useToast } from "@/components/obra/toast";
import { CharacterLimitHint } from "@/components/ui/character-limit-hint";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useState } from "react";
import { AppModal as Modal } from "@/components/ui/app-modal";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const PRIMARY = "#2563EB";
const TASK_TITLE_MAX = 30;
const TASK_DESCRIPTION_MAX = 120;

interface TaskFormModalProps {
  visible: boolean;
  task?: Tarefa;
  onSave: (task: Omit<Tarefa, "id">) => Promise<void>;
  onClose: () => void;
}

const PRIORITIES = [
  { value: "ALTA" as const, label: "Alta", color: "#DC2626" },
  { value: "MEDIA" as const, label: "Média", color: "#EA580C" },
  { value: "BAIXA" as const, label: "Baixa", color: "#22C55E" },
];

export function TaskFormModal({
  visible,
  task,
  onSave,
  onClose,
}: TaskFormModalProps) {
  const { showToast } = useToast();
  const [titulo, setTitulo] = useState("");
  const [tituloError, setTituloError] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState<"ALTA" | "MEDIA" | "BAIXA">(
    "MEDIA",
  );
  const [showPrioritySelector, setShowPrioritySelector] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setTitulo(task.titulo);
      setDescricao(task.descricao);
      setPrioridade(task.prioridade);
    } else {
      resetForm();
    }
  }, [task, visible]);

  const resetForm = () => {
    setTitulo("");
    setTituloError(false);
    setDescricao("");
    setPrioridade("MEDIA");
    setShowPrioritySelector(false);
    setIsSaving(false);
  };

  const handleSave = async () => {
    const trimmedTitulo = titulo.trim().slice(0, TASK_TITLE_MAX);
    const trimmedDescricao = descricao.trim().slice(0, TASK_DESCRIPTION_MAX);
    if (!trimmedTitulo) {
      setTituloError(true);
      showToast({ title: "Título obrigatório", tone: "error" });
      return;
    }
    setTituloError(false);

    setIsSaving(true);
    try {
      await onSave({
        titulo: trimmedTitulo,
        descricao: trimmedDescricao,
        prioridade,
        concluida: task?.concluida ?? false,
        order: task?.order ?? 0,
      });
      resetForm();
    } catch {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isSaving) return;
    resetForm();
    onClose();
  };

  const getPriorityLabel = () => {
    return PRIORITIES.find((p) => p.value === prioridade)?.label || "Média";
  };

  const getPriorityColor = () => {
    return PRIORITIES.find((p) => p.value === prioridade)?.color || "#EA580C";
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
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
            {task ? "Editar Tarefa" : "Nova Tarefa"}
          </Text>
          <View style={styles.headerBtn} />
        </View>

        {/* Form Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Título */}
          <View style={styles.field}>
            <Text style={[styles.label, tituloError && { color: "#EF4444" }]}>
              Título *
            </Text>
            <TextInput
              style={[styles.input, tituloError && styles.inputError]}
              placeholder="Ex: Preparar terreno"
              placeholderTextColor="#9CA3AF"
              value={titulo}
              onChangeText={(t) => {
                setTitulo(t);
                if (tituloError) setTituloError(false);
              }}
              maxLength={TASK_TITLE_MAX}
            />
            <CharacterLimitHint current={titulo.length} max={TASK_TITLE_MAX} />
          </View>

          {/* Descrição */}
          <View style={styles.field}>
            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Detalhes sobre a tarefa (opcional)"
              placeholderTextColor="#9CA3AF"
              value={descricao}
              onChangeText={setDescricao}
              maxLength={TASK_DESCRIPTION_MAX}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <CharacterLimitHint
              current={descricao.length}
              max={TASK_DESCRIPTION_MAX}
            />
          </View>

          {/* Prioridade */}
          <View style={styles.field}>
            <Text style={styles.label}>Prioridade *</Text>
            <TouchableOpacity
              style={[
                styles.priorityButton,
                { borderColor: getPriorityColor() },
              ]}
              onPress={() => setShowPrioritySelector(!showPrioritySelector)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.priorityDot,
                  { backgroundColor: getPriorityColor() },
                ]}
              />
              <Text style={styles.priorityButtonText}>
                {getPriorityLabel()}
              </Text>
              <MaterialIcons
                name={showPrioritySelector ? "expand-less" : "expand-more"}
                size={20}
                color={getPriorityColor()}
              />
            </TouchableOpacity>

            {showPrioritySelector && (
              <View style={styles.prioritySelector}>
                {PRIORITIES.map((pri) => (
                  <TouchableOpacity
                    key={pri.value}
                    style={[
                      styles.priorityOption,
                      prioridade === pri.value && styles.priorityOptionSelected,
                    ]}
                    onPress={() => {
                      setPrioridade(pri.value);
                      setShowPrioritySelector(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.priorityOptionDot,
                        { backgroundColor: pri.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.priorityOptionText,
                        prioridade === pri.value &&
                          styles.priorityOptionTextSelected,
                      ]}
                    >
                      {pri.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {task && (
            <View style={styles.infoBox}>
              <MaterialIcons name="info" size={16} color={PRIMARY} />
              <Text style={styles.infoBoxText}>
                Status de conclusão será mantido ao editar.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer - Action Buttons */}
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
                  {task ? "Atualizar" : "Adicionar"}
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
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
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
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
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
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FFF1F2",
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  priorityButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  priorityButtonText: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  prioritySelector: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  priorityOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 8,
  },
  priorityOptionSelected: {
    backgroundColor: PRIMARY + "15",
  },
  priorityOptionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  priorityOptionText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  priorityOptionTextSelected: {
    color: PRIMARY,
    fontWeight: "700",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY + "15",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    color: PRIMARY,
    fontWeight: "600",
  },
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
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },
  saveButton: {
    backgroundColor: PRIMARY,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
