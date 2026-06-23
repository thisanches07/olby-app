import { AppModal } from "@/components/ui/app-modal";
import { useToast } from "@/components/obra/toast";
import { formatCentsBRL } from "@/constants/quote-status";
import { ApiError, getErrorMessage } from "@/services/api";
import { stagesService } from "@/services/stages.service";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useMemo, useState } from "react";
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
const SUCCESS = "#16A34A";

export interface PickerStage {
  id: string;
  nome: string;
  orcadoCents: number | null;
  position?: number;
}

interface Props {
  visible: boolean;
  projectId: string;
  stages: PickerStage[];
  onClose: () => void;
  /** Etapa escolhida (existente ou recém-criada) → abrir o editor. */
  onPick: (stage: { id: string; nome: string }) => void;
  /** Avisa o pai para recarregar a lista após criar uma etapa. */
  onStageCreated?: () => void;
}

/** Picker para escolher em qual etapa adicionar/editar o orçamento — ou criar
 *  uma etapa nova na hora (espelha o AddBudgetPickerDialog do web). */
export function AddBudgetPickerModal({
  visible,
  projectId,
  stages,
  onClose,
  onPick,
  onStageCreated,
}: Props) {
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Etapas sem orçamento primeiro (candidatas naturais ao "adicionar").
  const sorted = useMemo(() => {
    return [...stages].sort((a, b) => {
      const ah = (a.orcadoCents ?? 0) > 0 ? 1 : 0;
      const bh = (b.orcadoCents ?? 0) > 0 ? 1 : 0;
      if (ah !== bh) return ah - bh;
      return (a.position ?? 0) - (b.position ?? 0);
    });
  }, [stages]);

  const withoutBudget = sorted.filter((s) => (s.orcadoCents ?? 0) === 0).length;

  const resetCreate = () => {
    setCreating(false);
    setNewName("");
  };

  const handleClose = () => {
    resetCreate();
    onClose();
  };

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      showToast({ title: "Informe o nome da nova etapa", tone: "error" });
      return;
    }
    setSubmitting(true);
    try {
      const stage = await stagesService.create(projectId, {
        name: trimmed,
        priority: undefined,
      });
      resetCreate();
      onStageCreated?.();
      onPick({ id: stage.id, nome: stage.name });
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      showToast({
        title:
          status === 403 || status === 409
            ? "Limite de etapas atingido"
            : "Erro ao criar etapa",
        message: getErrorMessage(e, "Não foi possível criar a etapa."),
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            disabled={submitting}
          >
            <MaterialIcons name="close" size={22} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Adicionar orçamento</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.lead}>
            {stages.length === 0
              ? "Você ainda não tem etapas. Crie a primeira abaixo."
              : withoutBudget > 0
                ? `${withoutBudget} etapa(s) ainda sem orçamento — escolha uma para começar.`
                : "Todas as etapas têm orçamento. Selecione uma para editar ou crie uma nova."}
          </Text>

          {/* Criar nova etapa */}
          {creating ? (
            <View style={styles.createBox}>
              <Text style={styles.createLabel}>Nome da nova etapa</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                autoFocus
                maxLength={60}
                editable={!submitting}
                placeholder="Ex.: Acabamentos"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                onSubmitEditing={handleCreate}
                returnKeyType="done"
              />
              <View style={styles.createActions}>
                <TouchableOpacity
                  style={styles.cancelCreate}
                  onPress={resetCreate}
                  disabled={submitting}
                >
                  <Text style={styles.cancelCreateText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.createBtn,
                    (submitting || !newName.trim()) && { opacity: 0.6 },
                  ]}
                  onPress={handleCreate}
                  disabled={submitting || !newName.trim()}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.createBtnText}>Criar e definir</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.createCta}
              onPress={() => setCreating(true)}
              activeOpacity={0.85}
            >
              <View style={styles.createCtaIcon}>
                <MaterialIcons name="add" size={16} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.createCtaTitle}>Criar nova etapa</Text>
                <Text style={styles.createCtaSub}>
                  Adicione uma etapa nova e defina o orçamento em seguida.
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={18} color="#C2C8D2" />
            </TouchableOpacity>
          )}

          {/* Etapas existentes */}
          {stages.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Etapas existentes</Text>
              <View style={styles.list}>
                {sorted.map((stage) => {
                  const hasBudget = (stage.orcadoCents ?? 0) > 0;
                  return (
                    <TouchableOpacity
                      key={stage.id}
                      style={styles.row}
                      onPress={() => onPick({ id: stage.id, nome: stage.nome })}
                      disabled={submitting}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.rowBadge,
                          hasBudget
                            ? { backgroundColor: "#DCFCE7" }
                            : { backgroundColor: "#F1F5F9" },
                        ]}
                      >
                        {hasBudget ? (
                          <MaterialIcons
                            name="check-circle"
                            size={15}
                            color={SUCCESS}
                          />
                        ) : (
                          <Text style={styles.rowBadgeText}>
                            {String(stage.position ?? 0).padStart(2, "0")}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {stage.nome}
                        </Text>
                        <Text style={styles.rowSub} numberOfLines={1}>
                          {hasBudget
                            ? `já tem ${formatCentsBRL(stage.orcadoCents!)} · editar`
                            : "sem orçamento definido"}
                        </Text>
                      </View>
                      <MaterialIcons
                        name="chevron-right"
                        size={18}
                        color="#C2C8D2"
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
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
  scroll: { padding: 16, paddingBottom: 32 },
  lead: { fontSize: 13, color: "#6B7280", lineHeight: 19, marginBottom: 16 },
  createBox: {
    borderWidth: 1,
    borderColor: "#DBE3F0",
    backgroundColor: "#F8FAFF",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  createLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: PRIMARY,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: "#111827",
  },
  createActions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  cancelCreate: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  cancelCreateText: { fontSize: 13, fontWeight: "700", color: "#6B7280" },
  createBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  createCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#DBE3F0",
    backgroundColor: "#F8FAFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  createCtaIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#EFF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  createCtaTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  createCtaSub: { fontSize: 11.5, color: "#6B7280", marginTop: 1 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 22,
    marginBottom: 10,
  },
  list: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF1F5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  rowBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    fontVariant: ["tabular-nums"],
  },
  rowName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  rowSub: { fontSize: 12, color: "#6B7280", marginTop: 1 },
});
