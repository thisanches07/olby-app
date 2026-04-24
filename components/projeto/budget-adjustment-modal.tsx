import { useToast } from "@/components/obra/toast";
import { AppModal as Modal } from "@/components/ui/app-modal";
import { formatBRLInput } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  findNodeHandle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIMARY = "#2563EB";
const MAX_BUDGET_VALUE_DIGITS = 9;

interface BudgetAdjustmentModalProps {
  visible: boolean;
  currentBudget: number;
  totalInvestido: number;
  onSave: (newBudget: number | null) => void;
  onClose: () => void;
}

function limitBudgetValueDigits(raw: string) {
  return raw.replace(/\D/g, "").slice(0, MAX_BUDGET_VALUE_DIGITS);
}

export function BudgetAdjustmentModal({
  visible,
  currentBudget,
  totalInvestido,
  onSave,
  onClose,
}: BudgetAdjustmentModalProps) {
  const { showToast } = useToast();
  const [newBudget, setNewBudget] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const [focusedField, setFocusedField] = useState<"orcamento" | null>(null);
  const orcamentoRef = useRef<TextInput | null>(null);
  const isAtBudgetLimit = newBudget.length >= MAX_BUDGET_VALUE_DIGITS;

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const s = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const h = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setNewBudget(
        currentBudget > 0 ? Math.round(currentBudget * 100).toString() : "",
      );
      setFocusedField(null);
    }
  }, [visible, currentBudget]);

  const scrollToKeyboard = (
    ref: React.RefObject<TextInput | null>,
    offset = 240,
  ) => {
    const node = ref.current ? findNodeHandle(ref.current) : null;
    if (!node) return;
    setTimeout(() => {
      scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(
        node,
        offset,
        true,
      );
    }, 50);
  };

  const handleSave = () => {
    const parsedBudget = parseInt(newBudget, 10) / 100;
    const isEffectivelyEmpty = newBudget === "" || parsedBudget === 0;

    if (isEffectivelyEmpty) {
      // Campo vazio ou zero: remove o orçamento se havia um, senão fecha sem mudança
      onSave(currentBudget > 0 ? null : currentBudget);
      onClose();
      return;
    }

    if (newBudget.length > MAX_BUDGET_VALUE_DIGITS) {
      showToast({
        title: "Valor acima do limite",
        message: "Reduza a quantidade de dígitos do valor informado.",
        tone: "error",
      });
      return;
    }
    onSave(parsedBudget);
    onClose();
  };

  const handleValueChange = (text: string) => {
    setNewBudget(limitBudgetValueDigits(text));
  };

  const percentageUsed =
    currentBudget > 0 ? (totalInvestido / currentBudget) * 100 : 0;

  const formattedCurrentBudget =
    currentBudget > 0
      ? currentBudget.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })
      : "Sem teto";

  const formattedTotalInvestido = totalInvestido.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const remainingBudget = currentBudget - totalInvestido;
  const formattedRemainingBudget =
    currentBudget > 0
      ? remainingBudget.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })
      : "—";

  const getPercentageColor = () => {
    if (percentageUsed >= 90) return "#DC2626";
    if (percentageUsed >= 70) return "#EA580C";
    if (percentageUsed >= 50) return "#EAB308";
    return "#22C55E";
  };

  const dynamicScrollPaddingBottom = 16 + keyboardHeight + 120;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ajustar Orçamento</Text>
          <View style={styles.headerBtn} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        >
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: dynamicScrollPaddingBottom },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
          >
            {/* Current Budget Info */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Orçamento</Text>
                <Text style={styles.infoBudgetValue}>
                  {formattedCurrentBudget}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Investido</Text>
                <Text style={styles.infoInvestedValue}>
                  {formattedTotalInvestido}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Saldo Disponível</Text>
                <Text
                  style={[
                    styles.infoValue,
                    {
                      color:
                        currentBudget > 0
                          ? remainingBudget >= 0
                            ? "#22C55E"
                            : "#DC2626"
                          : "#9CA3AF",
                    },
                  ]}
                >
                  {formattedRemainingBudget}
                </Text>
              </View>

              {/* Progress Bar — só exibe se houver orçamento definido */}
              {currentBudget > 0 && (
                <View style={styles.progressSection}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(percentageUsed, 100)}%`,
                          backgroundColor: getPercentageColor(),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.percentageText}>
                    {percentageUsed.toFixed(1)}% utilizado
                  </Text>
                </View>
              )}
            </View>

            {/* Orçamento input */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>Novo Orçamento (R$)</Text>

              <View style={styles.inlineInputWrap}>
                <TextInput
                  ref={orcamentoRef}
                  style={styles.input}
                  placeholder="0,00"
                  placeholderTextColor="#9CA3AF"
                  value={formatBRLInput(newBudget)}
                  onChangeText={handleValueChange}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onFocus={() => {
                    setFocusedField("orcamento");
                    scrollToKeyboard(orcamentoRef, 300);
                  }}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
                {isAtBudgetLimit && (
                  <View style={styles.valueLimitBanner}>
                    <MaterialIcons
                      name="warning-amber"
                      size={14}
                      color="#D97706"
                    />
                    <Text style={styles.valueLimitText}>
                      Limite máximo de orçamento atingido.
                    </Text>
                  </View>
                )}

                {focusedField === "orcamento" && (
                  <View style={styles.inlineActions}>
                    <TouchableOpacity
                      style={styles.inlinePrimary}
                      onPress={() => Keyboard.dismiss()}
                    >
                      <Text style={styles.inlinePrimaryText}>OK</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.inlineSecondary}
                      onPress={() => Keyboard.dismiss()}
                    >
                      <Text style={styles.inlineSecondaryText}>Fechar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {newBudget && parseInt(newBudget, 10) / 100 < totalInvestido && (
              <View style={styles.warningBox}>
                <MaterialIcons name="warning" size={16} color="#F59E0B" />
                <Text style={styles.warningText}>
                  Orçamento deve ser maior ou igual ao total investido
                </Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
            activeOpacity={0.7}
          >
            <MaterialIcons name="check" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Salvar</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  infoCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  infoBudgetValue: {
    fontSize: 16,
    fontWeight: "700",
    color: PRIMARY,
  },
  infoInvestedValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#EF4444",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  progressSection: {
    gap: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  percentageText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textAlign: "right",
  },

  inputSection: {
    gap: 8,
  },
  inlineInputWrap: { gap: 8 },
  inlineActions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
  inlinePrimary: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  inlinePrimaryText: { color: "#FFFFFF", fontWeight: "800" },
  inlineSecondary: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  inlineSecondaryText: { color: "#374151", fontWeight: "800" },

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
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },
  valueLimitBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 6,
    backgroundColor: "#FFF7ED",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  valueLimitText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9A3412",
  },

  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: "#F59E0B",
    fontWeight: "600",
  },

  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
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
  saveButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
