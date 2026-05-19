import { AppModal } from "@/components/ui/app-modal";
import { CharacterLimitHint } from "@/components/ui/character-limit-hint";
import { useToast } from "@/components/obra/toast";
import { getErrorMessage } from "@/services/api";
import type {
  QuoteResponse,
  SupplierSuggestion,
} from "@/services/quotes.service";
import { formatBRLInput } from "@/utils/obra-utils";
import { formatBRPhone } from "@/utils/phone";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useRef, useState } from "react";
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
const MAX_DIGITS = 12;
const MAX_NOTES = 120;
const MAX_SUPPLIER_NAME = 30;
/** Valor máximo do orçamento: R$ 10.000.000,00 (em centavos). */
const MAX_AMOUNT_CENTS = 1_000_000_000;

export interface QuoteFormData {
  supplierName: string;
  supplierPhone: string | null;
  amountCents: number;
  notes: string | null;
}

interface Props {
  visible: boolean;
  editing?: QuoteResponse | null;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (data: QuoteFormData) => Promise<void>;
  fetchSuggestions: (q?: string) => Promise<SupplierSuggestion[]>;
}

export function QuoteFormModal({
  visible,
  editing,
  isSaving = false,
  onClose,
  onSave,
  fetchSuggestions,
}: Props) {
  const { showToast } = useToast();
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [amountDigits, setAmountDigits] = useState("");
  const [notes, setNotes] = useState("");
  const [nameError, setNameError] = useState(false);
  const [amountError, setAmountError] = useState(false);

  const [suggestions, setSuggestions] = useState<SupplierSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setSupplierName(editing?.supplierName ?? "");
      setSupplierPhone(
        editing?.supplierPhone ? formatBRPhone(editing.supplierPhone) : "",
      );
      setAmountDigits(
        editing ? String(Math.max(0, Math.round(editing.amountCents))) : "",
      );
      setNotes(editing?.notes ?? "");
      setNameError(false);
      setAmountError(false);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [visible, editing]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const querySuggestions = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const list = await fetchSuggestions(q);
      setSuggestions(list);
      setShowSuggestions(list.length > 0);
    }, 250);
  };

  const handleNameChange = (t: string) => {
    setSupplierName(t);
    if (nameError) setNameError(false);
    if (!editing) querySuggestions(t);
  };

  const applySuggestion = (s: SupplierSuggestion) => {
    setSupplierName(s.supplierName);
    if (s.supplierPhone) setSupplierPhone(formatBRPhone(s.supplierPhone));
    setShowSuggestions(false);
  };

  const handleSave = async () => {
    const name = supplierName.trim();
    const cents = parseInt(amountDigits || "0", 10);
    const nameInvalid = !name;
    const amountOverLimit = cents > MAX_AMOUNT_CENTS;
    const amountInvalid =
      !Number.isFinite(cents) || cents <= 0 || amountOverLimit;
    setNameError(nameInvalid);
    setAmountError(amountInvalid);
    if (amountOverLimit) {
      showToast({
        title: "Valor acima do limite",
        message: "O valor máximo do orçamento é R$ 10.000.000,00.",
        tone: "error",
      });
      return;
    }
    if (nameInvalid || amountInvalid) {
      showToast({
        title: "Preencha fornecedor e valor",
        tone: "error",
      });
      return;
    }
    const normalizedNotes = notes
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, MAX_NOTES);
    try {
      await onSave({
        supplierName: name.slice(0, MAX_SUPPLIER_NAME),
        supplierPhone: supplierPhone.trim() || null,
        amountCents: cents,
        notes: normalizedNotes || null,
      });
    } catch (e: unknown) {
      showToast({
        title: "Erro ao salvar",
        message: getErrorMessage(e, "Não foi possível salvar a cotação."),
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
            {editing ? "Editar orçamento" : "Novo orçamento"}
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
              <Text style={[styles.label, nameError && styles.labelError]}>
                Fornecedor <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, nameError && styles.inputError]}
                placeholder="Nome do fornecedor"
                placeholderTextColor="#9CA3AF"
                value={supplierName}
                onChangeText={handleNameChange}
                onFocus={() => {
                  if (!editing) querySuggestions(supplierName);
                }}
                maxLength={MAX_SUPPLIER_NAME}
              />
              {showSuggestions && (
                <View style={styles.suggestBox}>
                  {suggestions.slice(0, 6).map((s, i) => (
                    <TouchableOpacity
                      key={`${s.supplierName}-${i}`}
                      style={styles.suggestItem}
                      onPress={() => applySuggestion(s)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name="history"
                        size={15}
                        color="#9CA3AF"
                      />
                      <Text style={styles.suggestText} numberOfLines={1}>
                        {s.supplierName}
                        {s.supplierPhone
                          ? ` · ${formatBRPhone(s.supplierPhone)}`
                          : ""}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <CharacterLimitHint
                current={supplierName.length}
                max={MAX_SUPPLIER_NAME}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Telefone (WhatsApp)</Text>
              <TextInput
                style={styles.input}
                placeholder="(11) 99999-9999"
                placeholderTextColor="#9CA3AF"
                value={supplierPhone}
                onChangeText={(t) => setSupplierPhone(formatBRPhone(t))}
                keyboardType="phone-pad"
                maxLength={16}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, amountError && styles.labelError]}>
                Valor do orçamento <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, amountError && styles.inputError]}
                placeholder="R$ 0,00"
                placeholderTextColor="#9CA3AF"
                value={
                  amountDigits ? `R$ ${formatBRLInput(amountDigits)}` : ""
                }
                onChangeText={(t) => {
                  let digits = t.replace(/\D/g, "").slice(0, MAX_DIGITS);
                  if (parseInt(digits || "0", 10) > MAX_AMOUNT_CENTS) {
                    digits = String(MAX_AMOUNT_CENTS);
                  }
                  setAmountDigits(digits);
                  if (amountError) setAmountError(false);
                }}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Observações (opcional)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Prazo de entrega, condições, etc."
                placeholderTextColor="#9CA3AF"
                value={notes}
                onChangeText={(t) => setNotes(t.slice(0, MAX_NOTES))}
                maxLength={MAX_NOTES}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <CharacterLimitHint current={notes.length} max={MAX_NOTES} />
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
                  name={editing ? "check" : "add"}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.saveText}>
                  {editing ? "Salvar" : "Adicionar"}
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
  inputMultiline: { minHeight: 90, paddingTop: 12 },
  inputError: { borderColor: "#EF4444", backgroundColor: "#FFF1F2" },
  suggestBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  suggestItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F3F4F6",
  },
  suggestText: { flex: 1, fontSize: 13, color: "#374151", fontWeight: "600" },
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
