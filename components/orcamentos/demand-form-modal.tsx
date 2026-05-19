import { AppModal } from "@/components/ui/app-modal";
import { CharacterLimitHint } from "@/components/ui/character-limit-hint";
import { useToast } from "@/components/obra/toast";
import { getErrorMessage } from "@/services/api";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIMARY = "#2563EB";
const MAX_TITLE = 30;
const MAX_DESC = 50;

export interface DemandFormData {
  title: string;
  description: string;
}

interface Props {
  visible: boolean;
  initial?: { title: string; description: string | null } | null;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (data: DemandFormData) => Promise<void>;
}

export function DemandFormModal({
  visible,
  initial,
  isSaving = false,
  onClose,
  onSave,
}: Props) {
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [titleError, setTitleError] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title ?? "");
      setDescription(initial?.description ?? "");
      setTitleError(false);
    }
  }, [visible, initial]);

  const handleSave = async () => {
    if (!title.trim()) {
      setTitleError(true);
      showToast({ title: "Informe o nome da demanda", tone: "error" });
      return;
    }
    try {
      await onSave({
        title: title.trim().slice(0, MAX_TITLE),
        description: description
          .replace(/\n{3,}/g, "\n\n")
          .trim()
          .slice(0, MAX_DESC),
      });
    } catch (e: unknown) {
      showToast({
        title: "Erro ao salvar",
        message: getErrorMessage(e, "Não foi possível salvar a demanda."),
        tone: "error",
      });
    }
  };

  return (
    <AppModal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            disabled={isSaving}
          >
            <MaterialIcons name="close" size={22} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {initial ? "Editar demanda" : "Nova demanda"}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.field}>
              <Text style={[styles.label, titleError && styles.labelError]}>
                Demanda <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, titleError && styles.inputError]}
                placeholder="Ex: Terraplanagem"
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={(t) => {
                  setTitle(t);
                  if (titleError) setTitleError(false);
                }}
                maxLength={MAX_TITLE}
                returnKeyType="next"
              />
              <CharacterLimitHint current={title.length} max={MAX_TITLE} />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Descrição (opcional)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Detalhes do que precisa ser cotado..."
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={(t) => setDescription(t.slice(0, MAX_DESC))}
                maxLength={MAX_DESC}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <CharacterLimitHint
                current={description.length}
                max={MAX_DESC}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            disabled={isSaving}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.88}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <MaterialIcons
                  name={initial ? "check" : "add"}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.saveText}>
                  {initial ? "Salvar" : "Criar demanda"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 20 },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: "700", color: "#374151" },
  labelError: { color: "#EF4444" },
  required: { color: "#EF4444" },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
  },
  inputMultiline: { minHeight: 110, paddingTop: 12 },
  inputError: { borderColor: "#EF4444", backgroundColor: "#FFF1F2" },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  cancelText: { fontSize: 14, fontWeight: "700", color: "#6B7280" },
  saveBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    gap: 7,
  },
  saveText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
});
