import { AppModal } from "@/components/ui/app-modal";
import { CharacterLimitHint } from "@/components/ui/character-limit-hint";
import { useToast } from "@/components/obra/toast";
import { getErrorMessage } from "@/services/api";
import { stagesService } from "@/services/stages.service";
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
  /** Etapa vinculada (centro de custo). null = sem vínculo. */
  stageId: string | null;
}

interface StageOption {
  id: string;
  name: string;
}

interface Props {
  visible: boolean;
  projectId: string;
  initial?: {
    title: string;
    description: string | null;
    stageId?: string | null;
  } | null;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (data: DemandFormData) => Promise<void>;
}

export function DemandFormModal({
  visible,
  projectId,
  initial,
  isSaving = false,
  onClose,
  onSave,
}: Props) {
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stageId, setStageId] = useState<string | null>(null);
  const [titleError, setTitleError] = useState(false);
  const [stages, setStages] = useState<StageOption[]>([]);
  const [loadingStages, setLoadingStages] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title ?? "");
      setDescription(initial?.description ?? "");
      setStageId(initial?.stageId ?? null);
      setTitleError(false);
    }
  }, [visible, initial]);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setLoadingStages(true);
    stagesService
      .listByProject(projectId)
      .then((items) => {
        if (!active) return;
        setStages(
          [...items]
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((s) => ({ id: s.id, name: s.name })),
        );
      })
      .catch(() => {
        if (active) setStages([]);
      })
      .finally(() => {
        if (active) setLoadingStages(false);
      });
    return () => {
      active = false;
    };
  }, [visible, projectId]);

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
        stageId,
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

            {/* Etapa vinculada */}
            <View style={styles.field}>
              <Text style={styles.label}>Etapa vinculada</Text>
              <View style={styles.stageList}>
                <TouchableOpacity
                  style={[
                    styles.stageRow,
                    stageId === null && styles.stageRowActive,
                  ]}
                  onPress={() => setStageId(null)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.radio,
                      stageId === null && styles.radioActive,
                    ]}
                  >
                    {stageId === null && <View style={styles.radioDot} />}
                  </View>
                  <MaterialIcons
                    name="block"
                    size={16}
                    color={stageId === null ? PRIMARY : "#9CA3AF"}
                  />
                  <Text
                    style={[
                      styles.stageName,
                      stageId === null && styles.stageNameActive,
                    ]}
                  >
                    Sem vínculo
                  </Text>
                </TouchableOpacity>

                {loadingStages && (
                  <>
                    <View style={styles.stageDivider} />
                    <View style={styles.stageRow}>
                      <MaterialIcons
                        name="hourglass-empty"
                        size={16}
                        color="#9CA3AF"
                      />
                      <Text style={styles.stageName}>Carregando etapas...</Text>
                    </View>
                  </>
                )}

                {!loadingStages &&
                  stages.map((s) => {
                    const selected = stageId === s.id;
                    return (
                      <React.Fragment key={s.id}>
                        <View style={styles.stageDivider} />
                        <TouchableOpacity
                          style={[
                            styles.stageRow,
                            selected && styles.stageRowActive,
                          ]}
                          onPress={() => setStageId(s.id)}
                          activeOpacity={0.7}
                        >
                          <View
                            style={[styles.radio, selected && styles.radioActive]}
                          >
                            {selected && <View style={styles.radioDot} />}
                          </View>
                          <MaterialIcons
                            name="layers"
                            size={16}
                            color={selected ? PRIMARY : "#9CA3AF"}
                          />
                          <Text
                            style={[
                              styles.stageName,
                              selected && styles.stageNameActive,
                            ]}
                            numberOfLines={1}
                          >
                            {s.name}
                          </Text>
                        </TouchableOpacity>
                      </React.Fragment>
                    );
                  })}
              </View>
              <Text style={styles.helpText}>
                Ao decidir, o gasto gerado entra no custo desta etapa.
              </Text>
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
  helpText: {
    marginTop: 8,
    fontSize: 11.5,
    color: "#9CA3AF",
    lineHeight: 16,
  },
  stageList: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  stageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#FFFFFF",
  },
  stageRowActive: { backgroundColor: PRIMARY + "08" },
  stageDivider: { height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 14 },
  stageName: { flex: 1, fontSize: 14, fontWeight: "500", color: "#374151" },
  stageNameActive: { color: PRIMARY, fontWeight: "700" },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: PRIMARY },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY },
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
