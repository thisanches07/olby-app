import { useToast } from "@/components/obra/toast";
import { AppModal as Modal } from "@/components/ui/app-modal";
import { CharacterLimitHint } from "@/components/ui/character-limit-hint";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import type { DocumentSource } from "@/data/obras";
import { Etapa, Gasto } from "@/data/obras";
import { ApiError } from "@/services/api";
import { documentsService } from "@/services/documents.service";
import { expensesService } from "@/services/expenses.service";
import { quotesService } from "@/services/quotes.service";
import { stagesService } from "@/services/stages.service";
import { mapStage } from "@/utils/stage-mappers";
import { STAGE_STATUS_CONFIG } from "@/utils/stage-ui";
import {
  validateDocumentAssetSize,
  uploadDocumentToExpense,
  type LocalDocumentAsset,
} from "@/utils/document-upload";
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
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaptureOptionsSheet } from "./capture-options-sheet";

const PRIMARY = "#2563EB";
const MAX_EXPENSE_DESCRIPTION = 30;
const MAX_EXPENSE_VALUE_DIGITS = 12;

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

function limitExpenseValueDigits(raw: string) {
  return raw.replace(/\D/g, "").slice(0, MAX_EXPENSE_VALUE_DIGITS);
}

function sanitizeExpenseFileStem(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function extensionFromAsset(
  fileName: string,
  mimeType: string,
): string {
  const match = fileName.match(/\.([a-zA-Z0-9]+)$/);
  if (match?.[1]) return match[1].toLowerCase();

  const mimeMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
    "image/heic": "heic",
  };

  return mimeMap[mimeType] ?? "bin";
}

function renameAssetForExpense(
  asset: LocalDocumentAsset,
  expenseDescription: string,
): LocalDocumentAsset {
  const stem = sanitizeExpenseFileStem(expenseDescription) || "gasto";
  const extension = extensionFromAsset(asset.fileName, asset.mimeType);

  return {
    ...asset,
    fileName: `${stem}.${extension}`,
  };
}


interface ExpenseFormModalProps {
  visible: boolean;
  expense?: Gasto;
  projectId: string;
  onReceiptStateChange?: (
    expenseId: string,
    receipt: { receiptDocumentId: string | null; documentCount?: number },
  ) => void;
  onSave: (
    expense: Omit<Gasto, "id">,
    pendingDoc?: { asset: LocalDocumentAsset; source: DocumentSource },
  ) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export function ExpenseFormModal({
  visible,
  expense,
  projectId,
  onReceiptStateChange,
  onSave,
  onDelete,
  onClose,
}: ExpenseFormModalProps) {
  const { showToast } = useToast();
  const quoteGroupId = expense?.quoteGroupId ?? null;
  const isGenerated = !!quoteGroupId;
  const [generatedFromTitle, setGeneratedFromTitle] = useState<string | null>(
    null,
  );
  const [confirmDetachVisible, setConfirmDetachVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [descricaoError, setDescricaoError] = useState(false);
  const [valor, setValor] = useState("");
  const [valorError, setValorError] = useState(false);
  const [dateText, setDateText] = useState("");
  const [dataError, setDataError] = useState(false);
  const [categoria, setCategoria] = useState<ExpenseCategory>("MATERIAL");
  const [stageId, setStageId] = useState<string | undefined>(undefined);
  const [stages, setStages] = useState<Etapa[]>([]);
  const [loadingStages, setLoadingStages] = useState(false);
  const [pendingReceiptId, setPendingReceiptId] = useState<string | null>(null);
  const [pendingReceiptName, setPendingReceiptName] = useState<string | null>(
    null,
  );
  // Creation mode: document staged locally, uploaded only after expense is created.
  const [pendingDocAsset, setPendingDocAsset] = useState<{
    asset: LocalDocumentAsset;
    source: DocumentSource;
  } | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [deleteReceiptConfirmVisible, setDeleteReceiptConfirmVisible] =
    useState(false);
  const [deletingReceipt, setDeletingReceipt] = useState(false);
  const [showCaptureOptions, setShowCaptureOptions] = useState(false);

  // Evita re-hidratar o form e sobrescrever seleção do usuário enquanto o modal está aberto.
  const lastInitKeyRef = useRef<string | null>(null);

  const resetForm = useCallback(() => {
    setDescricao("");
    setDescricaoError(false);
    setValor("");
    setValorError(false);
    setDateText("");
    setDataError(false);
    setCategoria("MATERIAL");
    setStageId(undefined);
    setPendingReceiptId(null);
    setPendingReceiptName(null);
    setPendingDocAsset(null);
  }, []);

  const initFromExpense = useCallback(() => {
    if (expense) {
      setDescricao(expense.descricao);
      setValor(Math.round(expense.valor * 100).toString());
      setDateText(isoToBRDate(expense.data));
      setCategoria(expense.categoria as ExpenseCategory);
      setStageId(expense.stageId);
      setPendingReceiptId(expense.receiptDocumentId ?? null);
      setPendingReceiptName(
        expense.receiptDocumentId ? "Comprovante anexado" : null,
      );
    } else {
      resetForm();
    }
  }, [expense, resetForm]);

  //  Inicializa apenas quando abre OU quando troca o expense (id).
  useEffect(() => {
    if (!visible) return;

    const key = expense?.id ?? "__new__";
    if (lastInitKeyRef.current === key) return;

    lastInitKeyRef.current = key;
    initFromExpense();
  }, [visible, expense?.id, initFromExpense]);

  // Resolve o título da demanda que gerou esta despesa (para banner/confirmação).
  useEffect(() => {
    if (!visible || !quoteGroupId) {
      setGeneratedFromTitle(null);
      return;
    }
    let active = true;
    quotesService
      .listByProject(projectId)
      .then((groups) => {
        if (!active) return;
        setGeneratedFromTitle(
          groups.find((g) => g.id === quoteGroupId)?.title ?? null,
        );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [visible, quoteGroupId, projectId]);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setLoadingStages(true);
    stagesService
      .listByProject(projectId)
      .then((items) => {
        if (!active) return;
        setStages(items.map(mapStage).sort((a, b) => a.order - b.order));
      })
      .catch(() => {
        if (!active) return;
        setStages([]);
      })
      .finally(() => {
        if (active) setLoadingStages(false);
      });
    return () => {
      active = false;
    };
  }, [visible, projectId]);

  //  Limpa quando fecha (pra próxima abertura vir limpinho).
  useEffect(() => {
    if (visible) return;
    lastInitKeyRef.current = null;
    resetForm();
  }, [visible, resetForm]);

  //  Fallback: se expense não tem receiptDocumentId mas pode ter um
  // documento RECEIPT vinculado via tela Documentos
  useEffect(() => {
    if (!visible) return;
    if (!expense?.id) return;
    if (expense.receiptDocumentId) return;

    let cancelled = false;
    documentsService
      .listByExpense(projectId, expense.id)
      .then((docs) => {
        if (cancelled) return;
        const receipt = docs.find((d) => d.kind === "RECEIPT");
        if (receipt) {
          setPendingReceiptId(receipt.id);
          setPendingReceiptName(receipt.originalFileName);
        }
      })
      .catch(() => {
        // falha silenciosa - campo fica como "Adicionar comprovante"
      });

    return () => {
      cancelled = true;
    };
  }, [visible, expense?.id, expense?.receiptDocumentId, projectId]);

  useEffect(() => {
    if (!visible) return;
    if (!expense) return;
    if (pendingDocAsset) return;

    if (expense.receiptDocumentId) {
      setPendingReceiptId(expense.receiptDocumentId);
      setPendingReceiptName("Comprovante anexado");
      return;
    }

    setPendingReceiptId(null);
    setPendingReceiptName(null);
  }, [
    visible,
    expense,
    expense?.receiptDocumentId,
    pendingDocAsset,
  ]);

  const handleDateChange = (t: string) => {
    setDateText(maskBRDate(t));
    if (dataError) setDataError(false);
  };

  const parsedValor = useMemo(() => {
    const v = parseInt(valor, 10) / 100;
    return Number.isFinite(v) ? v : NaN;
  }, [valor]);
  const isAtValueLimit = useMemo(
    () => valor.length >= MAX_EXPENSE_VALUE_DIGITS,
    [valor],
  );

  const dateDigitsLen = useMemo(() => onlyDigitsLen(dateText), [dateText]);

  const parsedDate = useMemo(
    () => (dateDigitsLen === 8 ? parseBRDateToLocalDate(dateText) : null),
    [dateText, dateDigitsLen],
  );

  const handleReceiptSelected = async (
    asset: LocalDocumentAsset,
    source: DocumentSource,
  ) => {
    const normalizedAsset = renameAssetForExpense(
      asset,
      descricao.trim() || expense?.descricao || "gasto",
    );

    if (!expense) {
      try {
        await validateDocumentAssetSize(normalizedAsset, "RECEIPT");
        // Creation mode: stage locally, upload happens after expense is created.
        setPendingDocAsset({ asset: normalizedAsset, source });
      } catch (err) {
        showToast({
          title: "Erro no envio",
          message:
            err instanceof Error
              ? err.message
              : "Falha ao validar comprovante",
          tone: "error",
        });
      }
      return;
    }

    // Edit mode: presign -> upload -> confirm -> immediate PATCH.
    setUploadingReceipt(true);
    try {
      await validateDocumentAssetSize(normalizedAsset, "RECEIPT");

      console.warn("DEBUG receiptDocument upload (edit mode)", {
        fileName: normalizedAsset.fileName,
        mimeType: normalizedAsset.mimeType,
        fileSize: normalizedAsset.fileSize,
        source,
        kind: "RECEIPT",
      });

      const doc = await uploadDocumentToExpense(normalizedAsset, {
        projectId,
        kind: "RECEIPT",
        source,
      });
      await expensesService.update(expense.id, { receiptDocumentId: doc.id });
      setPendingReceiptId(doc.id);
      setPendingReceiptName(normalizedAsset.fileName);
      onReceiptStateChange?.(expense.id, {
        receiptDocumentId: doc.id,
        documentCount: 1,
      });
    } catch (err) {
      showToast({
        title: "Erro",
        message:
          err instanceof Error
            ? err.message
            : "Falha ao enviar comprovante",
        tone: "error",
      });
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleDeleteReceipt = async () => {
    if (!pendingReceiptId || !expense) return;
    setDeletingReceipt(true);
    try {
      // 1. Delete the document from storage/backend
      try {
        await documentsService.remove(projectId, pendingReceiptId);
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 404) {
          throw err;
        }
      }
      // 2. Unlink from expense
      await expensesService.update(expense.id, { receiptDocumentId: null });
      setPendingReceiptId(null);
      setPendingReceiptName(null);
      onReceiptStateChange?.(expense.id, {
        receiptDocumentId: null,
        documentCount: 0,
      });
    } catch (err) {
      console.error("Erro ao remover comprovante:", err);
      showToast({
        title: "Erro",
        message: "Falha ao remover comprovante",
        tone: "error",
      });
    } finally {
      setDeletingReceipt(false);
      setDeleteReceiptConfirmVisible(false);
    }
  };

  const handleSave = (detachConfirmed = false) => {
    const trimmedDescricao = descricao.trim();
    const rawDate = dateText.trim();

    const descricaoVazia = !trimmedDescricao;
    const valorVazio = !valor.trim();
    const dataVazia = !rawDate;

    const descricaoLonga = trimmedDescricao.length > MAX_EXPENSE_DESCRIPTION;
    const valorInvalido = isNaN(parsedValor) || parsedValor <= 0;
    const valorLongo = valor.length > MAX_EXPENSE_VALUE_DIGITS;
    const dataInvalida = !rawDate || dateDigitsLen !== 8 || !parsedDate;

    // Marca TODOS os campos antes de qualquer return
    setDescricaoError(descricaoVazia || descricaoLonga);
    setValorError(valorInvalido || valorLongo);
    setDataError(dataInvalida);

    // Campo(s) obrigatório(s) vazio(s): notificação genérica
    if (descricaoVazia || valorVazio || dataVazia) {
      showToast({
        title: "Preencha os campos obrigatórios",
        tone: "error",
      });
      return;
    }

    // Erros de formato: mensagens específicas
    if (descricaoLonga) {
      showToast({
        title: "Descrição muito longa",
        message: `Use até ${MAX_EXPENSE_DESCRIPTION} caracteres.`,
        tone: "error",
      });
      return;
    }
    if (valorInvalido) {
      showToast({
        title: "Valor inválido",
        message: "Informe um valor maior que zero.",
        tone: "error",
      });
      return;
    }
    if (valorLongo) {
      showToast({
        title: "Valor acima do limite",
        message: "Reduza a quantidade de dígitos do valor informado.",
        tone: "error",
      });
      return;
    }
    if (dataInvalida || !parsedDate) {
      const msg = !parsedDate
        ? "Data inválida (dia/mês não existe)."
        : "Complete a data no formato DD/MM/AAAA.";
      showToast({ title: "Data inválida", message: msg, tone: "error" });
      return;
    }

    const newDateIso = `${parsedDate.getFullYear()}-${pad2(parsedDate.getMonth() + 1)}-${pad2(parsedDate.getDate())}`;

    // Despesa gerada por orçamento: editar conteúdo a desvincula. Confirma antes.
    // (Editar só o comprovante não conta — o comprovante salva por PATCH à parte.)
    if (isGenerated && expense && !detachConfirmed) {
      const contentChanged =
        trimmedDescricao !== (expense.descricao ?? "") ||
        Math.round(parsedValor * 100) !== Math.round(expense.valor * 100) ||
        newDateIso !== expense.data ||
        categoria !== expense.categoria ||
        (stageId ?? null) !== (expense.stageId ?? null);
      if (contentChanged) {
        setConfirmDetachVisible(true);
        return;
      }
    }

    onSave(
      {
        descricao: trimmedDescricao,
        valor: parsedValor,
        data: newDateIso,
        categoria,
        stageId,
        receiptDocumentId: pendingReceiptId,
      },
      pendingDocAsset
        ? {
            ...pendingDocAsset,
            asset: renameAssetForExpense(pendingDocAsset.asset, trimmedDescricao),
          }
        : undefined,
    );

    onClose();
  };

  const handleCancel = () => {
    if (uploadingReceipt) return;
    onClose();
  };

  const handleDelete = () => {
    if (uploadingReceipt) return;
    if (!expense?.id || !onDelete) return;
    setDeleteConfirmVisible(true);
  };

  const showDelete = !!expense?.id && !!onDelete;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        {/* -- Header (limpo + premium): fechar + título centralizado -- */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleCancel}
            disabled={uploadingReceipt}
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
          {uploadingReceipt && (
            <View style={styles.uploadNotice}>
              <ActivityIndicator size="small" color={PRIMARY} />
              <Text style={styles.uploadNoticeText}>
                Enviando comprovante. Aguarde para fechar ou excluir este gasto.
              </Text>
            </View>
          )}

          {isGenerated && (
            <View style={styles.generatedBanner}>
              <MaterialIcons name="link" size={16} color="#6D28D9" />
              <Text style={styles.generatedBannerText}>
                Gerada pelo orçamento
                {generatedFromTitle ? ` "${generatedFromTitle}"` : ""}. Editar o
                valor, a etapa ou outros dados vai{" "}
                <Text style={styles.generatedBannerStrong}>desvinculá-la</Text>{" "}
                do orçamento.
              </Text>
            </View>
          )}

          {/* -- Descrição -- */}
          <View style={styles.field}>
            <Text style={[styles.label, descricaoError && styles.labelError]}>
              Descrição <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, descricaoError && styles.inputError]}
              placeholder="Ex: Cimento Portland 50kg"
              placeholderTextColor="#9CA3AF"
              value={descricao}
              onChangeText={(text) => {
                setDescricao(text.slice(0, MAX_EXPENSE_DESCRIPTION));
                if (descricaoError) setDescricaoError(false);
              }}
              maxLength={MAX_EXPENSE_DESCRIPTION}
            />
            <CharacterLimitHint
              current={descricao.length}
              max={MAX_EXPENSE_DESCRIPTION}
            />
          </View>

          {/* -- Valor + Data (linha) -- */}
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.label, valorError && styles.labelError]}>
                Valor (R$) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, valorError && styles.inputError]}
                placeholder="0,00"
                placeholderTextColor="#9CA3AF"
                value={formatBRLInput(valor)}
                onChangeText={(t) => {
                  setValor(limitExpenseValueDigits(t));
                  if (valorError) setValorError(false);
                }}
                keyboardType="number-pad"
                returnKeyType="done"
              />
              {isAtValueLimit && (
                <View style={styles.valueLimitBanner}>
                  <MaterialIcons
                    name="warning-amber"
                    size={14}
                    color="#D97706"
                  />
                  <Text style={styles.valueLimitText}>
                    Limite máximo de valor atingido.
                  </Text>
                </View>
              )}
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.label, dataError && styles.labelError]}>
                Data <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.dateInputWrap,
                  dataError && styles.dateInputWrapError,
                ]}
              >
                <MaterialIcons
                  name="event"
                  size={16}
                  color={dataError ? "#EF4444" : "#9CA3AF"}
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
                      setDateText("");
                      if (dataError) setDataError(false);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="close" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.dateHelperText}>DD/MM/AAAA</Text>
            </View>
          </View>

          {/* -- Categoria - chips -- */}
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

          {/* Etapa vinculada */}
          <View style={styles.field}>
            <Text style={styles.label}>Etapa vinculada</Text>
            <Text style={styles.sublabel}>
              Opcional - associe este gasto a uma etapa da obra
            </Text>

            <View style={styles.taskList}>
              <TouchableOpacity
                style={[
                  styles.taskRow,
                  stageId === undefined && styles.taskRowActive,
                ]}
                onPress={() => setStageId(undefined)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.radio,
                    stageId === undefined && styles.radioActive,
                  ]}
                >
                  {stageId === undefined && <View style={styles.radioDot} />}
                </View>
                <MaterialIcons
                  name="block"
                  size={16}
                  color={stageId === undefined ? PRIMARY : "#9CA3AF"}
                />
                <Text
                  style={[
                    styles.taskName,
                    stageId === undefined && styles.taskNameActive,
                  ]}
                >
                  Sem vínculo
                </Text>
              </TouchableOpacity>

              {loadingStages && (
                <>
                  <View style={styles.taskDivider} />
                  <View style={styles.taskRow}>
                    <MaterialIcons
                      name="hourglass-empty"
                      size={16}
                      color="#9CA3AF"
                    />
                    <Text style={styles.taskName}>Carregando etapas...</Text>
                  </View>
                </>
              )}

              {!loadingStages && stages.length > 0 && (
                <View style={styles.taskDivider} />
              )}

              {!loadingStages && stages.map((stage, idx) => {
                const selected = stageId === stage.id;
                const status = STAGE_STATUS_CONFIG[stage.status];
                return (
                  <React.Fragment key={stage.id}>
                    <TouchableOpacity
                      style={[styles.taskRow, selected && styles.taskRowActive]}
                      onPress={() => setStageId(stage.id)}
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
                          {stage.nome}
                        </Text>
                        {stage.totalActivities > 0 && (
                          <Text style={styles.taskConcluida}>
                            {stage.completedActivities}/{stage.totalActivities} atividades
                          </Text>
                        )}
                      </View>

                      <View
                        style={[
                          styles.prioBadge,
                          { backgroundColor: status.bg },
                        ]}
                      >
                        <Text style={[styles.prioText, { color: status.color }]}>
                          {status.label}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {idx < stages.length - 1 && (
                      <View style={styles.taskDivider} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
          {/* -- Comprovante -- */}
          <View style={styles.field}>
            <Text style={styles.label}>Comprovante</Text>
            {pendingReceiptId || pendingDocAsset ? (
              <View style={styles.receiptRow}>
                <MaterialIcons name="attach-file" size={16} color={PRIMARY} />
                <Text style={styles.receiptName} numberOfLines={1}>
                  {pendingDocAsset
                    ? pendingDocAsset.asset.fileName
                    : (pendingReceiptName ?? "Comprovante anexado")}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (uploadingReceipt) return;
                    if (!expense) {
                      // Creation mode: doc not created yet, just clear.
                      setPendingDocAsset(null);
                    } else {
                      // Edit mode: confirm before unlinking.
                      setDeleteReceiptConfirmVisible(true);
                    }
                  }}
                  disabled={deletingReceipt || uploadingReceipt}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {deletingReceipt ? (
                    <ActivityIndicator size="small" color="#9CA3AF" />
                  ) : (
                    <MaterialIcons name="close" size={16} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.addReceiptBtn,
                  uploadingReceipt && { opacity: 0.7 },
                ]}
                onPress={() => setShowCaptureOptions(true)}
                disabled={uploadingReceipt}
                activeOpacity={0.8}
              >
                {uploadingReceipt ? (
                  <ActivityIndicator size="small" color={PRIMARY} />
                ) : (
                  <MaterialIcons
                    name="add-photo-alternate"
                    size={18}
                    color={PRIMARY}
                  />
                )}
                <Text style={styles.addReceiptText}>
                  {uploadingReceipt ? "Enviando..." : "Adicionar comprovante"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* -- Footer (onde faz mais sentido UX): Delete sempre visível quando editando -- */}
        <View style={styles.footer}>
          {showDelete && (
            <TouchableOpacity
              style={[styles.deleteBtn, uploadingReceipt && styles.actionDisabled]}
              onPress={handleDelete}
              disabled={uploadingReceipt}
              activeOpacity={0.85}
            >
              <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
              <Text style={styles.deleteText}>Excluir</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.cancelBtn,
              showDelete && styles.cancelBtnCompact,
              uploadingReceipt && styles.actionDisabled,
            ]}
            onPress={handleCancel}
            disabled={uploadingReceipt}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => handleSave()}
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
        visible={confirmDetachVisible}
        icon="link-off"
        iconColor={PRIMARY}
        confirmVariant="primary"
        title="Desvincular do orçamento?"
        message={`Esta despesa foi gerada por um orçamento. Ao alterá-la, ela será desvinculada e deixará de ser atualizada ou removida pelo orçamento${
          generatedFromTitle ? ` "${generatedFromTitle}"` : ""
        }.`}
        confirmLabel="Desvincular e salvar"
        onConfirm={() => {
          setConfirmDetachVisible(false);
          handleSave(true);
        }}
        onClose={() => setConfirmDetachVisible(false)}
      />

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

      <ConfirmSheet
        visible={deleteReceiptConfirmVisible}
        icon="delete-outline"
        iconColor="#EF4444"
        title="Remover comprovante?"
        message="O comprovante será removido permanentemente."
        confirmLabel="Remover"
        confirmVariant="destructive"
        onConfirm={handleDeleteReceipt}
        onClose={() => setDeleteReceiptConfirmVisible(false)}
      />

      <CaptureOptionsSheet
        visible={showCaptureOptions && !uploadingReceipt}
        onAssetSelected={(asset, source) => {
          setShowCaptureOptions(false);
          handleReceiptSelected(asset, source);
        }}
        onClose={() => setShowCaptureOptions(false)}
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
  uploadNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  uploadNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    color: PRIMARY,
  },
  generatedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#EDE9FE",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  generatedBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#5B21B6",
  },
  generatedBannerStrong: { fontWeight: "800" },

  field: { marginBottom: 20 },
  row: { flexDirection: "row", gap: 12 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  required: { color: "#EF4444" },
  labelError: { color: "#EF4444" },
  inputError: { borderColor: "#EF4444", backgroundColor: "#FFF1F2" },
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
  dateInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  dateInputWrapError: {
    borderColor: "#EF4444",
    backgroundColor: "#FFF1F2",
  },
  dateInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    paddingHorizontal: 6,
    paddingVertical: 0,
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

  receiptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  receiptName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY,
  },
  addReceiptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  addReceiptText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY,
  },

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
  actionDisabled: {
    opacity: 0.55,
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

