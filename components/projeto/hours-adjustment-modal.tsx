import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const PRIMARY = "#2563EB";

interface HoursAdjustmentModalProps {
  visible: boolean;
  currentHorasContratadas: number;
  horasRealizadas: number;
  onSave: (newHoras: number) => void;
  onClose: () => void;
}

export function HoursAdjustmentModal({
  visible,
  currentHorasContratadas,
  horasRealizadas,
  onSave,
  onClose,
}: HoursAdjustmentModalProps) {
  const [newHoras, setNewHoras] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [focusedField, setFocusedField] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const horasRef = useRef<TextInput | null>(null);

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
      setNewHoras(
        currentHorasContratadas > 0
          ? currentHorasContratadas.toString()
          : "",
      );
      setFocusedField(false);
    }
  }, [visible, currentHorasContratadas]);

  const handleSave = () => {
    const parsed = newHoras ? parseInt(newHoras.replace(/\D/g, ""), 10) : 0;
    onSave(isNaN(parsed) ? 0 : parsed);
    onClose();
  };

  const handleClearHours = () => {
    setNewHoras("");
    Keyboard.dismiss();
  };

  const hasHoras = currentHorasContratadas > 0;
  const horasPct = hasHoras
    ? Math.min(
        Math.round((horasRealizadas / currentHorasContratadas) * 100),
        100,
      )
    : 0;
  const isExcedido =
    hasHoras && horasRealizadas > currentHorasContratadas;

  const getHorasColor = () => {
    if (!hasHoras) return "#9CA3AF";
    if (horasPct >= 90) return "#DC2626";
    if (horasPct >= 75) return "#D97706";
    return "#059669";
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
          <Text style={styles.headerTitle}>Horas do Projeto</Text>
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
            {/* Current Info Card */}
            <View style={styles.infoCard}>
              {hasHoras ? (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Horas Contratadas</Text>
                    <Text style={styles.infoHorasValue}>
                      {currentHorasContratadas}h
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Horas Realizadas</Text>
                    <Text style={[styles.infoValue, { color: getHorasColor() }]}>
                      {horasRealizadas}h
                    </Text>
                  </View>

                  {isExcedido ? (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Excedidas</Text>
                      <Text style={[styles.infoValue, { color: "#DC2626" }]}>
                        +{horasRealizadas - currentHorasContratadas}h
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Disponíveis</Text>
                      <Text style={[styles.infoValue, { color: "#22C55E" }]}>
                        {currentHorasContratadas - horasRealizadas}h
                      </Text>
                    </View>
                  )}

                  {/* Progress Bar */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(horasPct, 100)}%`,
                            backgroundColor: getHorasColor(),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.percentageText}>
                      {horasPct}% utilizado
                    </Text>
                  </View>
                </>
              ) : (
                /* Sem limite state */
                <View style={styles.noHorasState}>
                  <View style={styles.noHorasBadge}>
                    <MaterialIcons name="schedule" size={20} color={PRIMARY} />
                    <Text style={styles.noHorasTitle}>Sem limite de horas</Text>
                  </View>
                  <Text style={styles.noHorasDesc}>
                    Este projeto não possui horas contratadas definidas. Defina
                    um limite abaixo para acompanhar o progresso.
                  </Text>
                  <View style={[styles.infoRow, { marginTop: 4 }]}>
                    <Text style={styles.infoLabel}>Horas Realizadas</Text>
                    <Text style={[styles.infoValue, { color: "#6B7280" }]}>
                      {horasRealizadas}h
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Input section */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>Horas Contratadas</Text>
              <Text style={styles.labelHint}>
                Total de horas previstas. Deixe em branco para Sem limite.
              </Text>

              <View style={styles.inputRow}>
                <MaterialIcons name="schedule" size={18} color="#9CA3AF" />
                <TextInput
                  ref={horasRef}
                  style={styles.input}
                  placeholder="ex: 240"
                  placeholderTextColor="#9CA3AF"
                  value={newHoras}
                  onChangeText={(t) => setNewHoras(t.replace(/\D/g, ""))}
                  keyboardType="number-pad"
                  maxLength={5}
                  returnKeyType="done"
                  onFocus={() => setFocusedField(true)}
                  onBlur={() => setFocusedField(false)}
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
                <Text style={styles.inputSuffix}>h</Text>
              </View>

              {focusedField && (
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

              {newHoras !== "" && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={handleClearHours}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="remove-circle-outline"
                    size={15}
                    color="#6B7280"
                  />
                  <Text style={styles.clearBtnText}>
                    Definir como Sem limite
                  </Text>
                </TouchableOpacity>
              )}
            </View>
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
  infoHorasValue: {
    fontSize: 16,
    fontWeight: "700",
    color: PRIMARY,
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

  noHorasState: { gap: 10 },
  noHorasBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noHorasTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: PRIMARY,
  },
  noHorasDesc: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },

  inputSection: { gap: 8 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  labelHint: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
    marginTop: -4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    padding: 0,
  },
  inputSuffix: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },

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

  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  clearBtnText: {
    fontSize: 13,
    color: "#6B7280",
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
  cancelButton: { backgroundColor: "#F3F4F6" },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },
  saveButton: { backgroundColor: PRIMARY },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
