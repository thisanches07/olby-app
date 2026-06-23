import { AppModal } from "@/components/ui/app-modal";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { useToast } from "@/components/obra/toast";
import { formatCentsBRL } from "@/constants/quote-status";
import type {
  BudgetItem,
  UpsertBudgetItemInput,
} from "@/services/budget.service";
import { ApiError, getErrorMessage } from "@/services/api";
import { formatBRLInput } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useMemo, useState } from "react";
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

import {
  budgetStateFromItem,
  budgetStateToPayload,
  budgetSumDetailsCents,
  budgetTotalCents,
  cleanQuantity,
  emptyBudgetState,
  emptyRow,
  onlyDigits,
  recomputeRowAmount,
  validateBudget,
  type BudgetEditorRow,
  type BudgetEditorState,
} from "./budget-editor.logic";

const PRIMARY = "#2563EB";
const DANGER = "#EF4444";
const SUCCESS = "#16A34A";

interface Props {
  visible: boolean;
  stageName: string;
  /** Orçamento atual da etapa (ou null se ainda não tem). */
  item: BudgetItem | null;
  isSaving?: boolean;
  onClose: () => void;
  /** Persiste o orçamento (PUT). Pode lançar (422 = soma ≠ total). */
  onSave: (input: UpsertBudgetItemInput) => Promise<unknown>;
  /** Remove o orçamento da etapa (DELETE). */
  onDelete: () => Promise<unknown>;
  onSaved?: () => void;
}

/** Editor do orçamento de uma etapa (espelha o BudgetSection do web). Controlado:
 *  o pai é dono dos dados (hook `useStageBudget`) e passa item/onSave/onDelete. */
export function BudgetEditorModal({
  visible,
  stageName,
  item,
  isSaving = false,
  onClose,
  onSave,
  onDelete,
  onSaved,
}: Props) {
  const { showToast } = useToast();
  const [state, setState] = useState<BudgetEditorState>(emptyBudgetState);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Hidrata o editor quando abre, a partir do item atual (ou vazio habilitado).
  useEffect(() => {
    if (!visible) return;
    setState(
      item ? budgetStateFromItem(item) : { ...emptyBudgetState(), enabled: true },
    );
  }, [visible, item]);

  const totalCents = budgetTotalCents(state);
  const sumCents = budgetSumDetailsCents(state);
  const hasDetails = state.details.length > 0;
  const sumMatches = sumCents === totalCents;
  const validation = useMemo(() => validateBudget(state), [state]);

  const patch = (p: Partial<BudgetEditorState>) =>
    setState((s) => ({ ...s, ...p }));

  const updateRow = (key: string, p: Partial<BudgetEditorRow>) =>
    setState((s) => ({
      ...s,
      details: s.details.map((r) => (r.key === key ? { ...r, ...p } : r)),
    }));

  const setRowQuantity = (key: string, value: string) =>
    setState((s) => ({
      ...s,
      details: s.details.map((r) => {
        if (r.key !== key) return r;
        const updated = { ...r, quantityText: cleanQuantity(value) };
        return { ...updated, amountDigits: recomputeRowAmount(updated) };
      }),
    }));

  const setRowUnitPrice = (key: string, value: string) =>
    setState((s) => ({
      ...s,
      details: s.details.map((r) => {
        if (r.key !== key) return r;
        const updated = { ...r, unitPriceDigits: onlyDigits(value) };
        return { ...updated, amountDigits: recomputeRowAmount(updated) };
      }),
    }));

  const setRowAmount = (key: string, value: string) =>
    updateRow(key, { amountDigits: onlyDigits(value), amountManuallyEdited: true });

  const addRow = () =>
    setState((s) => ({ ...s, details: [...s.details, emptyRow()] }));

  const removeRow = (key: string) =>
    setState((s) => ({
      ...s,
      details: s.details.filter((r) => r.key !== key),
    }));

  const pullSumIntoTotal = () => {
    if (sumCents > 0) patch({ totalDigits: String(sumCents) });
  };

  const handleSave = async () => {
    const v = validateBudget(state);
    if (!v.ok) {
      showToast({
        title: "Revise o orçamento",
        message: v.message,
        tone: "error",
      });
      return;
    }
    const payload = budgetStateToPayload(state);
    if (!payload) {
      onClose();
      return;
    }
    try {
      await onSave(payload);
      showToast({ title: "Orçamento salvo", tone: "success" });
      onSaved?.();
      onClose();
    } catch (e) {
      // 422 = invariante de soma rejeitado pelo backend (fallback à validação local).
      const msg =
        e instanceof ApiError && e.status === 422
          ? "Soma dos itens diferente do total. Ajuste e tente de novo."
          : getErrorMessage(e, "Não foi possível salvar o orçamento.");
      showToast({ title: "Erro ao salvar", message: msg, tone: "error" });
    }
  };

  const handleRemove = async () => {
    try {
      await onDelete();
      showToast({ title: "Orçamento removido", tone: "success" });
      onSaved?.();
      onClose();
    } catch (e) {
      showToast({
        title: "Erro",
        message: getErrorMessage(e, "Não foi possível remover o orçamento."),
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
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Orçamento da etapa</Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {stageName}
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Total */}
              <View style={styles.field}>
                <Text style={styles.label}>Valor total</Text>
                <TextInput
                  style={styles.totalInput}
                  placeholder="R$ 0,00"
                  placeholderTextColor="#9CA3AF"
                  value={
                    state.totalDigits
                      ? `R$ ${formatBRLInput(state.totalDigits)}`
                      : ""
                  }
                  onChangeText={(t) => patch({ totalDigits: onlyDigits(t) })}
                  keyboardType="number-pad"
                />
              </View>

              {/* Indicador soma × total */}
              {hasDetails && (
                <View
                  style={[
                    styles.sumBanner,
                    {
                      backgroundColor: sumMatches ? "#F0FDF4" : "#FEF2F2",
                      borderColor: sumMatches ? "#BBF7D0" : "#FECACA",
                    },
                  ]}
                >
                  <MaterialIcons
                    name={sumMatches ? "check-circle" : "error-outline"}
                    size={16}
                    color={sumMatches ? SUCCESS : DANGER}
                  />
                  {sumMatches ? (
                    <Text style={[styles.sumText, { color: "#15803D" }]}>
                      Soma dos itens bate com o total ({formatCentsBRL(sumCents)}
                      ).
                    </Text>
                  ) : (
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sumText, { color: "#B91C1C" }]}>
                        Soma {formatCentsBRL(sumCents)} · Total{" "}
                        {formatCentsBRL(totalCents)}
                      </Text>
                      <TouchableOpacity onPress={pullSumIntoTotal} hitSlop={6}>
                        <Text style={styles.sumLink}>Usar soma como total</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Itens detalhados */}
              <View style={styles.sectionHeadRow}>
                <Text style={styles.sectionHead}>Itens detalhados</Text>
                <Text style={styles.optional}>opcional</Text>
              </View>

              {state.details.length === 0 ? (
                <Text style={styles.emptyDetails}>
                  Salve só com o total, ou adicione linhas para detalhar o
                  orçamento (material, mão de obra, etc.).
                </Text>
              ) : (
                state.details.map((row, idx) => (
                  <DetailRow
                    key={row.key}
                    index={idx}
                    row={row}
                    onChangeDescription={(v) =>
                      updateRow(row.key, { description: v })
                    }
                    onChangeUnit={(v) => updateRow(row.key, { unit: v })}
                    onChangeQuantity={(v) => setRowQuantity(row.key, v)}
                    onChangeUnitPrice={(v) => setRowUnitPrice(row.key, v)}
                    onChangeAmount={(v) => setRowAmount(row.key, v)}
                    onRemove={() => removeRow(row.key)}
                  />
                ))
              )}

              <TouchableOpacity
                style={styles.addRowBtn}
                onPress={addRow}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add" size={16} color={PRIMARY} />
                <Text style={styles.addRowText}>Adicionar item detalhado</Text>
              </TouchableOpacity>

              {/* Observações */}
              <View style={[styles.field, { marginTop: 18 }]}>
                <Text style={styles.label}>Observações</Text>
                <TextInput
                  style={[styles.totalInput, styles.notesInput]}
                  placeholder="Ex.: valores conforme cotação de 12/05."
                  placeholderTextColor="#9CA3AF"
                  value={state.notes}
                  onChangeText={(t) => patch({ notes: t.slice(0, 2000) })}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {!validation.ok && validation.reason !== "SUM_MISMATCH" && (
                <Text style={styles.validationErr}>{validation.message}</Text>
              )}
            </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.footer}>
          {item ? (
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => setConfirmDelete(true)}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              <MaterialIcons name="delete-outline" size={18} color={DANGER} />
              <Text style={styles.removeText}>Remover</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isSaving}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          )}
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
                <MaterialIcons name="check" size={18} color="#FFFFFF" />
                <Text style={styles.saveText}>Salvar orçamento</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <ConfirmSheet
          visible={confirmDelete}
          icon="delete-outline"
          title="Remover orçamento da etapa?"
          message="O valor orçado e os itens detalhados desta etapa serão removidos. Esta ação não pode ser desfeita."
          confirmLabel="Remover"
          onConfirm={() => {
            setConfirmDelete(false);
            void handleRemove();
          }}
          onClose={() => setConfirmDelete(false)}
        />
      </SafeAreaView>
    </AppModal>
  );
}

function DetailRow({
  index,
  row,
  onChangeDescription,
  onChangeUnit,
  onChangeQuantity,
  onChangeUnitPrice,
  onChangeAmount,
  onRemove,
}: {
  index: number;
  row: BudgetEditorRow;
  onChangeDescription: (v: string) => void;
  onChangeUnit: (v: string) => void;
  onChangeQuantity: (v: string) => void;
  onChangeUnitPrice: (v: string) => void;
  onChangeAmount: (v: string) => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailTopRow}>
        <Text style={styles.detailIndex}>
          {String(index + 1).padStart(2, "0")}
        </Text>
        <TextInput
          style={styles.detailDesc}
          placeholder="Descrição do item"
          placeholderTextColor="#9CA3AF"
          value={row.description}
          onChangeText={onChangeDescription}
          maxLength={160}
        />
        <TouchableOpacity onPress={onRemove} hitSlop={8} style={styles.rowRemove}>
          <MaterialIcons name="close" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
      <View style={styles.detailGrid}>
        <MiniInput
          flex={1.1}
          placeholder="unid."
          value={row.unit}
          onChangeText={(v) => onChangeUnit(v.slice(0, 20))}
        />
        <MiniInput
          flex={1.1}
          placeholder="qtd"
          value={row.quantityText}
          onChangeText={onChangeQuantity}
          keyboardType="decimal-pad"
          align="right"
        />
        <MiniInput
          flex={1.5}
          placeholder="V. unit."
          value={row.unitPriceDigits ? formatBRLInput(row.unitPriceDigits) : ""}
          onChangeText={onChangeUnitPrice}
          keyboardType="number-pad"
          align="right"
        />
        <MiniInput
          flex={1.7}
          placeholder="V. total"
          value={row.amountDigits ? formatBRLInput(row.amountDigits) : ""}
          onChangeText={onChangeAmount}
          keyboardType="number-pad"
          align="right"
          emphasis
        />
      </View>
    </View>
  );
}

function MiniInput({
  flex,
  align = "left",
  emphasis,
  ...rest
}: {
  flex: number;
  align?: "left" | "right";
  emphasis?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...rest}
      placeholderTextColor="#B6BCC6"
      style={[
        styles.miniInput,
        { flex, textAlign: align },
        emphasis && styles.miniInputEmphasis,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  headerTitleWrap: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  headerSub: { fontSize: 12, color: "#9CA3AF", marginTop: 1, maxWidth: 220 },
  scrollContent: { padding: 20, paddingBottom: 32 },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: "700", color: "#374151" },
  totalInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 13,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  notesInput: {
    minHeight: 76,
    paddingTop: 12,
    fontSize: 14,
    fontWeight: "400",
  },
  sumBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
  },
  sumText: { flex: 1, fontSize: 12.5, fontWeight: "600", lineHeight: 17 },
  sumLink: {
    fontSize: 12.5,
    fontWeight: "700",
    color: PRIMARY,
    marginTop: 3,
  },
  sectionHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 10,
  },
  sectionHead: { fontSize: 13, fontWeight: "700", color: "#374151" },
  optional: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  emptyDetails: {
    fontSize: 12.5,
    color: "#9CA3AF",
    lineHeight: 18,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#EFF1F4",
    borderRadius: 10,
    padding: 12,
  },
  detailRow: {
    borderWidth: 1,
    borderColor: "#EFF1F4",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  detailTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailIndex: {
    fontSize: 11,
    fontWeight: "700",
    color: "#C2C8D2",
    fontVariant: ["tabular-nums"],
    width: 18,
  },
  detailDesc: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    paddingVertical: 2,
  },
  rowRemove: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  detailGrid: { flexDirection: "row", gap: 6, marginTop: 8 },
  miniInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 12.5,
    color: "#374151",
    fontVariant: ["tabular-nums"],
  },
  miniInputEmphasis: { fontWeight: "700", color: "#111827" },
  addRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DBE3F0",
    borderStyle: "dashed",
    backgroundColor: "#F8FAFF",
  },
  addRowText: { fontSize: 13, fontWeight: "700", color: PRIMARY },
  validationErr: {
    marginTop: 12,
    fontSize: 12.5,
    fontWeight: "600",
    color: DANGER,
  },
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
  removeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  removeText: { fontSize: 14, fontWeight: "700", color: DANGER },
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
