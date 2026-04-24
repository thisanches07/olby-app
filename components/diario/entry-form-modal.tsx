import { DiaryEntry } from "@/hooks/use-diary-state";
import { EntryFormData } from "@/hooks/use-diary-data";
import { parseISODateToBR } from "@/hooks/use-diary-data";
import { getErrorMessage } from "@/services/api";
import type { LocalPhotoAsset } from "@/utils/photo-upload";
import { brDateDigitsLen, maskBRDate, parseBRDateToLocalDate } from "@/utils/br-date";
import { useToast } from "@/components/obra/toast";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AppModal as Modal } from "@/components/ui/app-modal";
import {
  ActivityIndicator,
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
import { GalleryPicker } from "./gallery-picker";

const PRIMARY = "#2563EB";
const MAX_DIARY_DESCRIPTION = 160;

/** Valores fixos dos chips de duração (em minutos). Qualquer outro valor usa o stepper. */
const PRESET_DURATION_VALUES = [30, 60, 90, 120, 180];

// ── Presets de horas ──────────────────────────────────────────────────────────
const PRESETS_ROW1 = [
  { label: "30min", value: 30 },
  { label: "1h", value: 60 },
  { label: "1h30", value: 90 },
];
const PRESETS_ROW2 = [
  { label: "2h", value: 120 },
  { label: "3h", value: 180 },
  { label: "4h+", value: -1 }, // -1 = modo customizado
];

function formatMinutesLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}`;
}

function formatTime(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}:${d.slice(2, 4)}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface EntryFormModalProps {
  visible: boolean;
  editingEntry?: DiaryEntry | null;
  onClose: () => void;
  /** Async: lança exceção em caso de falha. Fecha modal se bem-sucedido. */
  onSave: (data: EntryFormData) => Promise<void>;
  onDeleteExistingPhoto?: (photoId: string) => Promise<void>;
  isSaving?: boolean;
}

export function EntryFormModal({
  visible,
  editingEntry,
  onClose,
  onSave,
  onDeleteExistingPhoto,
  isSaving = false,
}: EntryFormModalProps) {
  const { showToast } = useToast();
  const [date, setDate] = useState("");
  const [dateTouched, setDateTouched] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newPhotoAssets, setNewPhotoAssets] = useState<LocalPhotoAsset[]>([]);

  // duration em minutos; null = não selecionado
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  // Para o modo custom (4h+): valor atual em minutos
  const [customMinutes, setCustomMinutes] = useState(240); // 4h
  const [showCustom, setShowCustom] = useState(false);

  // ── Keyboard handling ──────────────────────────────────────────────────────
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [focusedField, setFocusedField] = useState<"date" | "time" | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);
  const dateRef = useRef<TextInput | null>(null);
  const timeRef = useRef<TextInput | null>(null);
  const titleRef = useRef<TextInput | null>(null);
  const descRef = useRef<TextInput | null>(null);

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

  const scrollToKeyboard = (
    ref: React.RefObject<TextInput | null>,
    extraOffset = 220,
  ) => {
    const node = ref.current ? findNodeHandle(ref.current) : null;
    if (!node) return;
    setTimeout(() => {
      scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(
        node,
        extraOffset,
        true,
      );
    }, 50);
  };

  const nextFor = (field: "date" | "time") => {
    if (field === "date") {
      timeRef.current?.focus();
      scrollToKeyboard(timeRef, 260);
    } else {
      titleRef.current?.focus();
      scrollToKeyboard(titleRef, 220);
    }
  };

  // ── Popular form ao abrir ──────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      if (editingEntry) {
        // Converte ISO date → "DD/MM/AAAA" para o campo
        setDate(parseISODateToBR(editingEntry.dateISO));
        setTime(editingEntry.time ?? "");
        setTitle(editingEntry.title ?? "");
        setDescription(editingEntry.description ?? "");
        setNewPhotoAssets([]); // fotos existentes ficam no GalleryPicker via existingPhotos

        const dm = editingEntry.durationMinutes;
        if (dm != null && !PRESET_DURATION_VALUES.includes(dm)) {
          setShowCustom(true);
          setCustomMinutes(dm);
          setDurationMinutes(dm);
        } else {
          setShowCustom(false);
          setDurationMinutes(dm);
        }
      } else {
        resetForm();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingEntry, visible]);

  const dateDigitsLen = useMemo(() => brDateDigitsLen(date), [date]);

  const shouldShowDateValidation = useMemo(
    () => dateDigitsLen === 8 || saveAttempted || (dateTouched && !date.trim()),
    [dateDigitsLen, saveAttempted, dateTouched, date],
  );

  const dateError = useMemo(() => {
    if (!shouldShowDateValidation) return null;
    const raw = date.trim();
    if (!raw) return "Informe a data do registro.";
    if (dateDigitsLen !== 8) return "Complete a data no formato DD/MM/AAAA.";
    const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return "Use o formato DD/MM/AAAA.";
    const yyyy = Number(m[3]);
    if (yyyy < 1900 || yyyy > 2100) return "Ano inválido.";
    const parsed = parseBRDateToLocalDate(raw);
    if (!parsed) return "Data inválida (dia/mês não existe).";
    return null;
  }, [shouldShowDateValidation, date, dateDigitsLen]);

  const handleDateChange = (t: string) => {
    setDateTouched(true);
    setDate(maskBRDate(t));
  };

  const resetForm = () => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    setDate(`${dd}/${mm}/${yyyy}`);
    setDateTouched(false);
    setSaveAttempted(false);
    setTime(`${hh}:${min}`);
    setTitle("");
    setDescription("");
    setNewPhotoAssets([]);
    setDurationMinutes(null);
    setCustomMinutes(270);
    setShowCustom(false);
    setFocusedField(null);
  };

  const handlePreset = (value: number) => {
    if (value === -1) {
      setShowCustom(true);
      setDurationMinutes(customMinutes);
    } else {
      setShowCustom(false);
      setDurationMinutes(value);
    }
  };

  const adjustCustom = (delta: number) => {
    const next = Math.max(30, Math.min(1440, customMinutes + delta));
    setCustomMinutes(next);
    setDurationMinutes(next);
  };

  // ── Salvar ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaveAttempted(true);
    if (!title.trim()) {
      showToast({ title: "Título obrigatório", message: "Informe um título para o registro.", tone: "error" });
      return;
    }
    const rawDate = date.trim();
    if (!rawDate || dateDigitsLen !== 8 || !parseBRDateToLocalDate(rawDate)) {
      return;
    }
    if (durationMinutes === null) {
      showToast({ title: "Tempo não selecionado", message: "Selecione o tempo na obra.", tone: "error" });
      return;
    }
    try {
      await onSave({
        date,
        time,
        title,
        description: description.slice(0, MAX_DIARY_DESCRIPTION),
        durationMinutes,
        newPhotoAssets,
      });
      resetForm();
      // Nota: o parent fecha o modal chamando setShowFormModal(false)
    } catch (e: unknown) {
      showToast({
        title: "Erro ao salvar",
        message: getErrorMessage(
          e,
          "Não foi possível salvar o registro. Tente novamente.",
        ),
        tone: "error",
      });
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // ── Render chip de hora ────────────────────────────────────────────────────
  const renderChip = (preset: { label: string; value: number }) => {
    const isCustomChip = preset.value === -1;
    const isActive = isCustomChip
      ? showCustom
      : durationMinutes === preset.value && !showCustom;

    return (
      <TouchableOpacity
        key={preset.label}
        style={[styles.hourChip, isActive && styles.hourChipActive]}
        onPress={() => handlePreset(preset.value)}
        activeOpacity={0.7}
      >
        {isCustomChip && (
          <MaterialIcons
            name="more-horiz"
            size={13}
            color={isActive ? "#FFFFFF" : "#6B7280"}
          />
        )}
        <Text
          style={[styles.hourChipText, isActive && styles.hourChipTextActive]}
        >
          {preset.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const dynamicScrollPaddingBottom = 12 + keyboardHeight + 90;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            activeOpacity={0.7}
            disabled={isSaving}
          >
            <MaterialIcons name="close" size={22} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {editingEntry ? "Editar Registro" : "Novo Registro"}
          </Text>
          <TouchableOpacity
            style={[styles.saveHeaderBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.saveHeaderText}>Salvar</Text>
                <MaterialIcons name="check" size={15} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: dynamicScrollPaddingBottom },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
          >
            {/* ── Data + Hora ── */}
            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>
                  Data <Text style={styles.required}>*</Text>
                </Text>
                <View
                  style={[
                    styles.dateInputWrap,
                    dateError ? styles.dateInputWrapError : null,
                  ]}
                >
                  <MaterialIcons
                    name="event"
                    size={16}
                    color={dateError ? "#EF4444" : "#9CA3AF"}
                  />
                  <TextInput
                    ref={dateRef}
                    style={styles.dateInput}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor="#9CA3AF"
                    value={date}
                    onChangeText={handleDateChange}
                    maxLength={10}
                    keyboardType="number-pad"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onFocus={() => {
                      setFocusedField("date");
                      scrollToKeyboard(dateRef, 280);
                    }}
                    onBlur={() => setFocusedField(null)}
                    onSubmitEditing={() => nextFor("date")}
                  />
                  {!!date.trim() && (
                    <TouchableOpacity
                      onPress={() => {
                        setDateTouched(true);
                        setDate("");
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="close" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>
                {dateError ? (
                  <Text style={styles.dateErrorText}>{dateError}</Text>
                ) : (
                  <Text style={styles.dateHelperText}>DD/MM/AAAA</Text>
                )}
                {focusedField === "date" && (
                  <View style={styles.inlineActions}>
                    <TouchableOpacity
                      style={styles.inlinePrimary}
                      onPress={() => nextFor("date")}
                    >
                      <Text style={styles.inlinePrimaryText}>Próximo</Text>
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

              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>
                  Chegada <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  ref={timeRef}
                  style={styles.input}
                  placeholder="HH:MM"
                  placeholderTextColor="#9CA3AF"
                  value={time}
                  onChangeText={(t) => setTime(formatTime(t))}
                  maxLength={5}
                  keyboardType="number-pad"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onFocus={() => {
                    setFocusedField("time");
                    scrollToKeyboard(timeRef, 280);
                  }}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => nextFor("time")}
                />
                {focusedField === "time" && (
                  <View style={styles.inlineActions}>
                    <TouchableOpacity
                      style={styles.inlinePrimary}
                      onPress={() => nextFor("time")}
                    >
                      <Text style={styles.inlinePrimaryText}>Próximo</Text>
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

            {/* ── Tempo na Obra ── */}
            <View style={styles.field}>
              <View style={styles.tempoLabelRow}>
                <MaterialIcons name="schedule" size={16} color={PRIMARY} />
                <Text style={styles.label}>Tempo na Obra</Text>
                {durationMinutes !== null && (
                  <View style={styles.tempoBadge}>
                    <Text style={styles.tempoBadgeText}>
                      {formatMinutesLabel(durationMinutes)}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.sublabel}>Horas dedicadas a esta visita</Text>

              <View style={styles.chipsRow}>
                {PRESETS_ROW1.map(renderChip)}
              </View>
              <View style={[styles.chipsRow, { marginTop: 8 }]}>
                {PRESETS_ROW2.map(renderChip)}
              </View>

              {showCustom && (
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => adjustCustom(-30)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="remove" size={22} color={PRIMARY} />
                  </TouchableOpacity>
                  <View style={styles.stepperCenter}>
                    <Text style={styles.stepperValue}>
                      {formatMinutesLabel(customMinutes)}
                    </Text>
                    <Text style={styles.stepperSub}>na obra</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => adjustCustom(30)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="add" size={22} color={PRIMARY} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* ── Título ── */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Título <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                ref={titleRef}
                style={styles.input}
                placeholder="Ex: Inspeção da estrutura – Pavimento 2"
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={setTitle}
                maxLength={120}
                returnKeyType="next"
                blurOnSubmit={false}
                onFocus={() => scrollToKeyboard(titleRef, 220)}
                onSubmitEditing={() => {
                  descRef.current?.focus();
                  scrollToKeyboard(descRef, 240);
                }}
              />
            </View>

            {/* ── Observações ── */}
            <View style={styles.field}>
              <Text style={styles.label}>Observações</Text>
              <TextInput
                ref={descRef}
                style={[styles.input, styles.inputMultiline]}
                placeholder="Descreva as atividades, ocorrências e próximos passos..."
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={(text) =>
                  setDescription(text.slice(0, MAX_DIARY_DESCRIPTION))
                }
                maxLength={MAX_DIARY_DESCRIPTION}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                returnKeyType="done"
                onFocus={() => scrollToKeyboard(descRef, 260)}
              />
              <Text style={styles.charCounter}>
                {description.length}/{MAX_DIARY_DESCRIPTION}
              </Text>
            </View>

            {/* ── Fotos ── */}
            <View style={styles.field}>
              <Text style={styles.label}>Registros Fotográficos</Text>
              <GalleryPicker
                key={editingEntry?.id ?? "new"}
                existingPhotos={editingEntry?.photos ?? []}
                onNewPhotosSelected={setNewPhotoAssets}
                onDeleteExistingPhoto={onDeleteExistingPhoto}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleClose}
            activeOpacity={0.7}
            disabled={isSaving}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <MaterialIcons
                  name={editingEntry ? "check" : "add"}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.saveText}>
                  {editingEntry ? "Atualizar" : "Registrar Visita"}
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

  // ── Header ──
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
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  saveHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    justifyContent: "center",
  },
  saveHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 20,
  },

  // ── Fields ──
  field: { gap: 8 },
  row: { flexDirection: "row", gap: 12 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  required: { color: "#EF4444" },
  sublabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
    marginTop: -4,
  },
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
  inputMultiline: {
    minHeight: 100,
    paddingTop: 12,
  },
  charCounter: {
    marginTop: 4,
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
    fontWeight: "600",
  },

  // ── Date input ──
  dateInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  dateInputWrapError: {
    borderColor: "#EF4444",
  },
  dateInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    paddingHorizontal: 6,
    paddingVertical: 0,
  },
  dateErrorText: {
    marginTop: 4,
    fontSize: 11,
    color: "#EF4444",
    fontWeight: "500",
  },
  dateHelperText: {
    marginTop: 4,
    fontSize: 11,
    color: "#9CA3AF",
  },

  // ── Inline actions ──
  inlineActions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
    marginTop: 8,
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

  // ── Tempo na Obra ──
  tempoLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tempoBadge: {
    backgroundColor: PRIMARY + "18",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  tempoBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  hourChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  hourChipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  hourChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  hourChipTextActive: {
    color: "#FFFFFF",
  },

  // ── Stepper customizado ──
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  stepperBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: PRIMARY + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperCenter: {
    alignItems: "center",
  },
  stepperValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  stepperSub: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
    marginTop: 1,
  },

  // ── Footer ──
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },
  saveBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    gap: 7,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 50,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
