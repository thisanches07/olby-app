import { Gasto, Tarefa } from "@/data/obras";
import { useToast } from "@/components/obra/toast";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { formatBRLInput } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const PRIMARY = "#2563EB";
const MAX_EXPENSE_DESCRIPTION = 30;

const CATEGORIES = [
  {
    value: "MATERIAL" as const,
    label: "Material",
    icon: "construction" as const,
    color: "#F97316",
  },
  {
    value: "LABOR" as const,
    label: "Mão de Obra",
    icon: "person" as const,
    color: "#EF4444",
  },
  {
    value: "TOOLS" as const,
    label: "Ferramentas",
    icon: "build" as const,
    color: "#F59E0B",
  },
  {
    value: "SERVICES" as const,
    label: "Serviços",
    icon: "business" as const,
    color: "#8B5CF6",
  },
  {
    value: "TRANSPORT" as const,
    label: "Transporte",
    icon: "local-shipping" as const,
    color: "#0EA5E9",
  },
  {
    value: "FEES" as const,
    label: "Taxas",
    icon: "receipt" as const,
    color: "#10B981",
  },
  {
    value: "CONTINGENCY" as const,
    label: "Imprevistos",
    icon: "warning" as const,
    color: "#F43F5E",
  },
  {
    value: "OTHER" as const,
    label: "Outros",
    icon: "category" as const,
    color: "#6B7280",
  },
];

type ExpenseCategory = (typeof CATEGORIES)[number]["value"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function maskBRDate(text: string) {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseBRDateToLocalDate(input: string): Date | null {
  const raw = input.trim();
  if (!raw) return null;
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy))
    return null;
  if (yyyy < 1900 || yyyy > 2100) return null;
  if (mm < 1 || mm > 12) return null;
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd)
    return null;
  return d;
}

function isoToBRDate(iso: string): string {
  const parts = iso.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return "";
}

function onlyDigitsLen(text: string) {
  return text.replace(/\D/g, "").length;
}

const PRIORITY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  ALTA: { label: "Alta", color: "#DC2626", bg: "#FEE2E2" },
  MEDIA: { label: "Média", color: "#EA580C", bg: "#FFEDD5" },
  BAIXA: { label: "Baixa", color: "#16A34A", bg: "#DCFCE7" },
};

interface ExpenseFormModalProps {
  visible: boolean;
  expense?: Gasto;
  tarefas: Tarefa[];
  onSave: (expense: Omit<Gasto, "id">) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export function ExpenseFormModal({
  visible,
  expense,
  tarefas,
  onSave,
  onDelete,
  onClose,
}: ExpenseFormModalProps) {
  const { showToast } = useToast();
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [dateText, setDateText] = useState("");
  const [dateTouched, setDateTouched] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [categoria, setCategoria] = useState<ExpenseCategory>("MATERIAL");
  const [tarefaId, setTarefaId] = useState<string | undefined>(undefined);

  // Evita re-hidratar o form e sobrescrever seleção do usuário enquanto o modal está aberto.
  const lastInitKeyRef = useRef<string | null>(null);

  const resetForm = useCallback(() => {
    setDescricao("");
    setValor("");
    setDateText("");
    setDateTouched(false);
    setSaveAttempted(false);
    setCategoria("MATERIAL");
    setTarefaId(undefined);
  }, []);

  const initFromExpense = useCallback(() => {
    if (expense) {
      setDescricao(expense.descricao);
      setValor(Math.round(expense.valor * 100).toString());
      setDateText(isoToBRDate(expense.data));
      setCategoria(expense.categoria as ExpenseCategory);
      setTarefaId(expense.tarefaId);
    } else {
      resetForm();
    }
  }, [expense, resetForm]);

  // ✅ Inicializa apenas quando abre OU quando troca o expense (id).
  useEffect(() => {
    if (!visible) return;

    const key = expense?.id ?? "__new__";
    if (lastInitKeyRef.current === key) return;

    lastInitKeyRef.current = key;
    initFromExpense();
  }, [visible, expense?.id, initFromExpense]);

  // ✅ Limpa quando fecha (pra próxima abertura vir limpinho).
  useEffect(() => {
    if (visible) return;
    lastInitKeyRef.current = null;
    resetForm();
  }, [visible, resetForm]);

  const handleDateChange = (t: string) => {
    setDateTouched(true);
    setDateText(maskBRDate(t));
  };

  const parsedValor = useMemo(() => {
    const v = parseInt(valor, 10) / 100;
    return Number.isFinite(v) ? v : NaN;
  }, [valor]);

  const dateDigitsLen = useMemo(() => onlyDigitsLen(dateText), [dateText]);

  const parsedDate = useMemo(
    () => (dateDigitsLen === 8 ? parseBRDateToLocalDate(dateText) : null),
    [dateText, dateDigitsLen],
  );

  const shouldShowDateValidation = useMemo(
    () =>
      dateDigitsLen === 8 ||
      saveAttempted ||
      (dateTouched && !dateText.trim()),
    [dateDigitsLen, saveAttempted, dateTouched, dateText],
  );

  const dateError = useMemo(() => {
    if (!shouldShowDateValidation) return null;
    const raw = dateText.trim();
    if (!raw) return "Informe a data do gasto.";
    if (dateDigitsLen !== 8) return "Complete a data no formato DD/MM/AAAA.";
    const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return "Use o formato DD/MM/AAAA.";
    const yyyy = Number(m[3]);
    if (yyyy < 1900 || yyyy > 2100) return "Ano inválido.";
    const parsed = parseBRDateToLocalDate(raw);
    if (!parsed) return "Data inválida (dia/mês não existe).";
    return null;
  }, [shouldShowDateValidation, dateText, dateDigitsLen]);

  const handleSave = () => {
    setSaveAttempted(true);
    const trimmedDescricao = descricao.trim();
    if (!trimmedDescricao) {
      showToast({ title: "Descrição obrigatória", message: "Informe uma descrição para o gasto.", tone: "error" });
      return;
    }
    if (trimmedDescricao.length > MAX_EXPENSE_DESCRIPTION) {
      showToast({
        title: "Descrição muito longa",
        message: `Use até ${MAX_EXPENSE_DESCRIPTION} caracteres.`,
        tone: "error",
      });
      return;
    }
    if (isNaN(parsedValor) || parsedValor <= 0) {
      showToast({ title: "Valor inválido", message: "Informe um valor maior que zero.", tone: "error" });
      return;
    }
    const rawDate = dateText.trim();
    if (!rawDate || dateDigitsLen !== 8 || !parsedDate) {
      const msg = !rawDate
        ? "Informe a data do gasto."
        : !parsedDate
          ? "Data inválida (dia/mês não existe)."
          : "Complete a data no formato DD/MM/AAAA.";
      showToast({ title: "Data inválida", message: msg, tone: "error" });
      return;
    }

    onSave({
      descricao: trimmedDescricao,
      valor: parsedValor,
      data: `${parsedDate.getFullYear()}-${pad2(parsedDate.getMonth() + 1)}-${pad2(parsedDate.getDate())}`,
      categoria,
      tarefaId,
    });

    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const handleDelete = () => {
    if (!expense?.id || !onDelete) return;
    setDeleteConfirmVisible(true);
  };

  const showDelete = !!expense?.id && !!onDelete;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        {/* ── Header (limpo + premium): fechar + título centralizado ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={22} color="#6B7280" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {expense ? "Editar Gasto" : "Novo Gasto"}
          </Text>

          {/* Placeholder para manter o título realmente centralizado */}
          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Descrição ── */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Descrição <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Cimento Portland 50kg"
              placeholderTextColor="#9CA3AF"
              value={descricao}
              onChangeText={(text) =>
                setDescricao(text.slice(0, MAX_EXPENSE_DESCRIPTION))
              }
              maxLength={MAX_EXPENSE_DESCRIPTION}
            />
            <Text style={styles.charCounter}>
              {descricao.length}/{MAX_EXPENSE_DESCRIPTION}
            </Text>
          </View>

          {/* ── Valor + Data (linha) ── */}
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>
                Valor (R$) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor="#9CA3AF"
                value={formatBRLInput(valor)}
                onChangeText={(t) => setValor(t.replace(/\D/g, ""))}
                keyboardType="number-pad"
                returnKeyType="done"
              />
            </View>
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
                  style={styles.dateInput}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#9CA3AF"
                  value={dateText}
                  onChangeText={handleDateChange}
                  maxLength={10}
                  keyboardType="number-pad"
                  returnKeyType="done"
                />
                {!!dateText.trim() && (
                  <TouchableOpacity
                    onPress={() => {
                      setDateTouched(true);
                      setDateText("");
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
            </View>
          </View>

          {/* ── Categoria — chips ── */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Categoria <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.chipsWrap}>
              {CATEGORIES.map((cat) => {
                const active = categoria === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.chip,
                      active
                        ? { backgroundColor: cat.color, borderColor: cat.color }
                        : { borderColor: "#E5E7EB" },
                    ]}
                    onPress={() => setCategoria(cat.value)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={cat.icon}
                      size={14}
                      color={active ? "#FFFFFF" : cat.color}
                    />
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Tarefa Vinculada ── */}
          <View style={styles.field}>
            <Text style={styles.label}>Tarefa Vinculada</Text>
            <Text style={styles.sublabel}>
              Opcional — associe este gasto a uma tarefa da obra
            </Text>

            <View style={styles.taskList}>
              <TouchableOpacity
                style={[
                  styles.taskRow,
                  tarefaId === undefined && styles.taskRowActive,
                ]}
                onPress={() => setTarefaId(undefined)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.radio,
                    tarefaId === undefined && styles.radioActive,
                  ]}
                >
                  {tarefaId === undefined && <View style={styles.radioDot} />}
                </View>
                <MaterialIcons
                  name="block"
                  size={16}
                  color={tarefaId === undefined ? PRIMARY : "#9CA3AF"}
                />
                <Text
                  style={[
                    styles.taskName,
                    tarefaId === undefined && styles.taskNameActive,
                  ]}
                >
                  Sem vínculo
                </Text>
              </TouchableOpacity>

              {tarefas.length > 0 && <View style={styles.taskDivider} />}

              {tarefas.map((tarefa, idx) => {
                const selected = tarefaId === tarefa.id;
                const prio = PRIORITY_CONFIG[tarefa.prioridade];
                return (
                  <React.Fragment key={tarefa.id}>
                    <TouchableOpacity
                      style={[styles.taskRow, selected && styles.taskRowActive]}
                      onPress={() => setTarefaId(tarefa.id)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[styles.radio, selected && styles.radioActive]}
                      >
                        {selected && <View style={styles.radioDot} />}
                      </View>

                      <View style={styles.taskBody}>
                        <Text
                          style={[
                            styles.taskName,
                            selected && styles.taskNameActive,
                          ]}
                          numberOfLines={1}
                        >
                          {tarefa.titulo}
                        </Text>
                        {tarefa.concluida && (
                          <Text style={styles.taskConcluida}>Concluída</Text>
                        )}
                      </View>

                      <View
                        style={[styles.prioBadge, { backgroundColor: prio.bg }]}
                      >
                        <Text style={[styles.prioText, { color: prio.color }]}>
                          {prio.label}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {idx < tarefas.length - 1 && (
                      <View style={styles.taskDivider} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* ── Footer (onde faz mais sentido UX): Delete sempre visível quando editando ── */}
        <View style={styles.footer}>
          {showDelete && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDelete}
              activeOpacity={0.85}
            >
              <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
              <Text style={styles.deleteText}>Excluir</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.cancelBtn, showDelete && styles.cancelBtnCompact]}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <MaterialIcons
              name={expense ? "check" : "add"}
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.saveText}>
              {expense ? "Atualizar" : "Adicionar Gasto"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ConfirmSheet
        visible={deleteConfirmVisible}
        icon="delete-outline"
        iconColor="#EF4444"
        title="Excluir gasto?"
        message="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        confirmVariant="destructive"
        onConfirm={() => {
          if (expense?.id && onDelete) {
            onDelete(expense.id);
            onClose();
          }
        }}
        onClose={() => setDeleteConfirmVisible(false)}
      />
    </Modal>
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
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  headerRightPlaceholder: {
    width: 36,
    height: 36,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },

  field: { marginBottom: 20 },
  row: { flexDirection: "row" },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  required: { color: "#EF4444" },
  sublabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
    marginTop: -4,
    marginBottom: 10,
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
  charCounter: {
    marginTop: 6,
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
    fontWeight: "600",
  },

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

  chipsWrap: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: "#FFFFFF",
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 5,
  },
  chipTextActive: { color: "#FFFFFF" },

  taskList: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#FFFFFF",
  },
  taskRowActive: { backgroundColor: PRIMARY + "08" },
  taskDivider: { height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 14 },

  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  radioActive: { borderColor: PRIMARY },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY },

  taskBody: { flex: 1 },
  taskName: { fontSize: 14, fontWeight: "500", color: "#374151" },
  taskNameActive: { color: PRIMARY, fontWeight: "700" },
  taskConcluida: {
    fontSize: 11,
    color: "#22C55E",
    fontWeight: "600",
    marginTop: 2,
  },

  prioBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 10,
  },
  prioText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },

  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    alignItems: "center",
  },

  deleteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    marginRight: 10,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#EF4444",
    marginLeft: 6,
  },

  cancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    marginRight: 10,
  },
  cancelBtnCompact: {
    // quando tem delete, mantém o cancel mais "secundário"
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
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 7,
  },
});
