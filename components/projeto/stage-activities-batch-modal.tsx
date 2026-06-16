import { useToast } from "@/components/obra/toast";
import { AppModal as Modal } from "@/components/ui/app-modal";
import { CharacterLimitHint } from "@/components/ui/character-limit-hint";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIMARY = "#2563EB";
const ACTIVITY_NAME_MAX = 80;
const BATCH_LIMIT = 100;

type DraftActivity = {
  id: string;
  name: string;
};

interface StageActivitiesBatchModalProps {
  visible: boolean;
  stageName: string;
  onSave: (names: string[]) => Promise<void>;
  onSkip: () => void;
  onClose: () => void;
}

function createDraft(name = ""): DraftActivity {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
  };
}

export function StageActivitiesBatchModal({
  visible,
  stageName,
  onSave,
  onSkip,
  onClose,
}: StageActivitiesBatchModalProps) {
  const { showToast } = useToast();
  const inputRef = useRef<TextInput>(null);
  const [drafts, setDrafts] = useState<DraftActivity[]>([]);
  const [input, setInput] = useState("");
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [invalidIds, setInvalidIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setDrafts([]);
      setInput("");
      setEditingDraftId(null);
      setInvalidIds(new Set());
      setIsSaving(false);
    }
  }, [visible]);

  const trimmedInput = input.trim();
  const limitReached = drafts.length >= BATCH_LIMIT;
  const canAdd =
    trimmedInput.length > 0 && !isSaving && (!!editingDraftId || !limitReached);

  const validNames = useMemo(
    () =>
      drafts
        .map((draft) => draft.name.trim().slice(0, ACTIVITY_NAME_MAX))
        .filter(Boolean),
    [drafts],
  );

  const handleSubmitInput = () => {
    const name = trimmedInput.slice(0, ACTIVITY_NAME_MAX);
    if (!name) {
      showToast({ title: "Nome da atividade obrigatório", tone: "error" });
      return;
    }
    if (!editingDraftId && limitReached) {
      showToast({ title: "Limite de 100 atividades por lote", tone: "error" });
      return;
    }

    if (editingDraftId) {
      setDrafts((prev) =>
        prev.map((draft) =>
          draft.id === editingDraftId ? { ...draft, name } : draft,
        ),
      );
      setInvalidIds((prev) => {
        const next = new Set(prev);
        next.delete(editingDraftId);
        return next;
      });
      setEditingDraftId(null);
    } else {
      setDrafts((prev) => [...prev, createDraft(name)]);
    }
    setInput("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleEditDraft = (draft: DraftActivity) => {
    if (isSaving) return;
    setEditingDraftId(draft.id);
    setInput(draft.name);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const clearEditing = () => {
    setEditingDraftId(null);
    setInput("");
  };

  const handleSave = async () => {
    if (drafts.length === 0) {
      showToast({ title: "Adicione pelo menos uma atividade", tone: "error" });
      return;
    }

    const invalid = new Set(
      drafts
        .filter((draft) => draft.name.trim().length === 0)
        .map((draft) => draft.id),
    );
    setInvalidIds(invalid);
    if (invalid.size > 0) {
      showToast({ title: "Revise os nomes vazios", tone: "error" });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(validNames);
      setDrafts([]);
      setInput("");
      setEditingDraftId(null);
      setInvalidIds(new Set());
    } catch {
      setIsSaving(false);
    }
  };

  const renderItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<DraftActivity>) => {
    const index = Math.max(
      drafts.findIndex((draft) => draft.id === item.id),
      0,
    );
    const invalid = invalidIds.has(item.id);

    return (
      <ScaleDecorator activeScale={1.02}>
        <View style={[styles.item, isActive && styles.itemDragging]}>
          <TouchableOpacity
            style={styles.dragHandle}
            onLongPress={drag}
            delayLongPress={150}
            disabled={isSaving}
            activeOpacity={0.5}
          >
            <MaterialIcons name="drag-indicator" size={22} color="#C4C9D4" />
          </TouchableOpacity>

          <View style={styles.itemIndex}>
            <Text style={styles.itemIndexText}>{index + 1}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.itemContent,
              invalid && styles.itemContentError,
              editingDraftId === item.id && styles.itemContentEditing,
            ]}
            onPress={() => handleEditDraft(item)}
            disabled={isSaving || isActive}
            activeOpacity={0.65}
          >
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.name.trim() || "Nome da atividade"}
            </Text>
            <MaterialIcons name="edit" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => {
              setDrafts((prev) => prev.filter((draft) => draft.id !== item.id));
              if (editingDraftId === item.id) clearEditing();
            }}
            disabled={isSaving}
            activeOpacity={0.6}
          >
            <MaterialIcons name="close" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={onClose}
            disabled={isSaving}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="close"
              size={24}
              color={isSaving ? "#D1D5DB" : "#374151"}
            />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Atividades da etapa</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {stageName}
            </Text>
          </View>
          <View style={styles.headerBtn} />
        </View>

        <Pressable style={styles.content} onPress={Keyboard.dismiss}>
          <View style={styles.addCard}>
            <View style={styles.inputHeaderRow}>
              <Text style={styles.label}>
                {editingDraftId ? "Editar atividade" : "Adicionar atividade"}
              </Text>
              {editingDraftId && (
                <TouchableOpacity onPress={clearEditing} disabled={isSaving}>
                  <Text style={styles.cancelEditText}>Cancelar edição</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.addRow}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={input}
                onChangeText={(text) =>
                  setInput(text.slice(0, ACTIVITY_NAME_MAX))
                }
                editable={!isSaving && !limitReached}
                maxLength={ACTIVITY_NAME_MAX}
                placeholder="Ex: Escavação"
                placeholderTextColor="#9CA3AF"
                returnKeyType="done"
                onSubmitEditing={handleSubmitInput}
              />
              <TouchableOpacity
                style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
                onPress={handleSubmitInput}
                disabled={!canAdd}
                activeOpacity={0.85}
              >
                <MaterialIcons
                  name={editingDraftId ? "check" : "add"}
                  size={22}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
            <CharacterLimitHint
              current={input.length}
              max={ACTIVITY_NAME_MAX}
            />
          </View>

          {drafts.length > 0 && (
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>
                {drafts.length}/{BATCH_LIMIT} atividades
              </Text>
              {drafts.length > 1 && (
                <View style={styles.dragHint}>
                  <MaterialIcons
                    name="drag-indicator"
                    size={14}
                    color="#9CA3AF"
                  />
                  <Text style={styles.dragHintText}>Segure para reordenar</Text>
                </View>
              )}
            </View>
          )}

          <DraggableFlatList
            data={drafts}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            onDragEnd={({ data }) => setDrafts(data)}
            renderPlaceholder={({ item, index }) => (
              <View style={[styles.item, styles.itemPlaceholder]}>
                <View style={styles.dragHandle}>
                  <MaterialIcons
                    name="drag-indicator"
                    size={22}
                    color="#D1D5DB"
                  />
                </View>
                <View style={[styles.itemIndex, styles.itemIndexPlaceholder]}>
                  <Text style={styles.itemIndexPlaceholderText}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.placeholderInput}>
                  <Text style={styles.placeholderText} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
                <View style={styles.removeBtn} />
              </View>
            )}
            activationDistance={12}
            animationConfig={{ damping: 18, stiffness: 180, mass: 0.7 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <MaterialIcons
                    name="playlist-add"
                    size={34}
                    color="#D1D5DB"
                  />
                </View>
                <Text style={styles.emptyTitle}>Nenhuma atividade ainda</Text>
                <Text style={styles.emptySubtitle}>
                  Você pode concluir sem atividades ou montar a lista antes de
                  criar tudo em lote.
                </Text>
              </View>
            }
          />
        </Pressable>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.skipButton]}
            onPress={() => {
              Keyboard.dismiss();
              onSkip();
            }}
            disabled={isSaving}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Criar sem atividades</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.saveButton,
              (isSaving || drafts.length === 0) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={isSaving || drafts.length === 0}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.saveButtonText}>Criar atividades</Text>
                <MaterialIcons name="check" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F6FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  addCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F2F4",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  label: { fontSize: 13, fontWeight: "800", color: "#374151" },
  inputHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cancelEditText: { fontSize: 12, fontWeight: "800", color: PRIMARY },
  addRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  input: {
    flex: 1,
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
  addBtn: {
    width: 46,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnDisabled: { opacity: 0.45 },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  listTitle: { fontSize: 13, fontWeight: "800", color: "#111827" },
  dragHint: { flexDirection: "row", alignItems: "center", gap: 4 },
  dragHintText: { fontSize: 11, fontWeight: "600", color: "#9CA3AF" },
  listContent: { paddingBottom: 20 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F2F4",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  itemDragging: {
    borderColor: PRIMARY + "40",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  itemPlaceholder: {
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    opacity: 0.72,
  },
  dragHandle: {
    width: 26,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  itemIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  itemIndexPlaceholder: { backgroundColor: "#E5E7EB" },
  itemIndexPlaceholderText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
  },
  itemIndexText: { fontSize: 11, fontWeight: "800", color: PRIMARY },
  itemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  itemContentError: { borderColor: "#EF4444", backgroundColor: "#FFF1F2" },
  itemContentEditing: { borderColor: "#BFDBFE", backgroundColor: "#EFF6FF" },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  placeholderInput: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  placeholderText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  removeBtn: {
    width: 30,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#6B7280",
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  skipButton: { backgroundColor: "#F3F4F6" },
  skipButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6B7280",
    textAlign: "center",
  },
  saveButton: { backgroundColor: PRIMARY },
  saveButtonDisabled: { opacity: 0.55 },
  saveButtonText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
});

