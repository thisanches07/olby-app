import { useToast } from "@/components/obra/toast";
import { AppModal as Modal } from "@/components/ui/app-modal";
import { CharacterLimitHint } from "@/components/ui/character-limit-hint";
import {
  brDateDigitsLen,
  maskBRDate,
  validateBRDateWithYearRange,
} from "@/utils/br-date";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";

import { CREATE_PROJECT_TASK_LIMIT } from "@/constants/creation-limits";
import { ObraDetalhe } from "@/data/obras";
import { useCreateProjectForm } from "@/hooks/use-create-project-form";
import { TaskProposalModal } from "@/components/projeto/task-proposal-modal";
import { firebaseAuth } from "@/services/firebase";
import { formatBRLInput } from "@/utils/obra-utils";

const PRIMARY = "#2563EB";
const PROJECT_NAME_MAX = 30;
const PROJECT_ADDRESS_MAX = 50;
const MAX_BUDGET_VALUE_DIGITS = 9;

const PRIORITY_CONFIG = {
  ALTA: { color: "#DC2626", label: "Alta" },
  MEDIA: { color: "#F59E0B", label: "Média" },
  BAIXA: { color: "#6B7280", label: "Baixa" },
};

const EXPENSE_CATEGORIES = [
  { id: "MATERIAL", label: "Material", icon: "construction", color: "#F97316" },
  { id: "LABOR", label: "Mão de Obra", icon: "people", color: "#EF4444" },
  { id: "TOOLS", label: "Ferramentas", icon: "build", color: "#F59E0B" },
  {
    id: "SERVICES",
    label: "Serviços",
    icon: "miscellaneous-services",
    color: "#8B5CF6",
  },
  {
    id: "TRANSPORT",
    label: "Transporte",
    icon: "local-shipping",
    color: "#0EA5E9",
  },
  { id: "FEES", label: "Taxas", icon: "receipt", color: "#10B981" },
  {
    id: "CONTINGENCY",
    label: "Imprevistos",
    icon: "warning",
    color: "#F43F5E",
  },
  { id: "OTHER", label: "Outros", icon: "category", color: "#6B7280" },
];

interface CreateProjectModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (obra: ObraDetalhe) => void;

  /**
   * ✅ Quando a API bloquear a criação (ex: HTTP 403 por limite do plano),
   * chamamos isso pra você abrir seu modal de upgrade.
   */
  onRequireUpgrade?: () => void;
}

/** Mascara simples para data BR: DD/MM/AAAA */
function formatDateBRInput(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);

  if (digits.length <= 2) return dd;
  if (digits.length <= 4) return `${dd}/${mm}`;
  return `${dd}/${mm}/${yyyy}`;
}

function isValidBRDate(dateStr: string) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return false;

  const [dStr, mStr, yStr] = dateStr.split("/");
  const d = Number(dStr);
  const m = Number(mStr);
  const y = Number(yStr);

  if (y < 1900 || y > 2200) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;

  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
  );
}

function addDaysBR(days: number) {
  const dt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return dt.toLocaleDateString("pt-BR");
}

/** Converte DD/MM/AAAA -> YYYY-MM-DD (IsDateString friendly) */
function brDateToIsoDate(dateStr: string): string | null {
  if (!isValidBRDate(dateStr)) return null;
  const [dd, mm, yyyy] = dateStr.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

function getApiBaseUrl() {
  const url = process.env.EXPO_PUBLIC_API_URL;
  return typeof url === "string" ? url.replace(/\/+$/, "") : "";
}

async function getFirebaseIdTokenSafe(): Promise<string | null> {
  try {
    const user = firebaseAuth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null;
  }
}

function limitBudgetValueDigits(raw: string) {
  return raw.replace(/\D/g, "").slice(0, MAX_BUDGET_VALUE_DIGITS);
}

type CreateProjectTaskDto = {
  title: string;
  description?: string;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  position?: number;
};

const PRIORITY_MAP: Record<
  "ALTA" | "MEDIA" | "BAIXA",
  "HIGH" | "MEDIUM" | "LOW"
> = {
  ALTA: "HIGH",
  MEDIA: "MEDIUM",
  BAIXA: "LOW",
};

type CreateProjectDto = {
  name: string;
  address?: string;
  expectedDeliveryAt?: string; // ISO
  budgetCents?: number;
  hoursContracted?: number;
  trackActivities?: boolean;
  trackFinancial?: boolean;
  tasks?: CreateProjectTaskDto[];
};

// Ajuste aqui se o backend responder com outra shape
type CreateProjectResponse = {
  id: string;
  name: string;
  address?: string | null;
  expectedDeliveryAt?: string | null;
  budgetCents?: number | null;
  hoursContracted?: number | null;
  createdAt?: string | null;
};

async function createProject(
  dto: CreateProjectDto,
): Promise<CreateProjectResponse> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error(
      "EXPO_PUBLIC_API_URL não configurado. Ex: https://sua-api.com (sem barra no final).",
    );
  }

  const token = await getFirebaseIdTokenSafe();
  if (!token) {
    throw new Error("Você precisa estar logado para criar um projeto.");
  }

  const res = await fetch(`${baseUrl}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dto),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ok
  }

  if (!res.ok) {
    const msg =
      (json && (json.message || json.error)) ||
      `Erro ao criar projeto (HTTP ${res.status})`;

    // ✅ Importantíssimo: propagar status pra UI decidir (403 => upgrade)
    const err: any = new Error(
      Array.isArray(msg) ? msg.join("\n") : String(msg),
    );
    err.status = res.status;
    err.code = json?.code;
    throw err;
  }

  return (json ?? {}) as CreateProjectResponse;
}

function InlineBanner({
  title,
  message,
  ctaLabel,
  onCta,
  onClose,
}: {
  title: string;
  message?: string;
  ctaLabel?: string;
  onCta?: () => void;
  onClose: () => void;
}) {
  return (
    <View style={styles.bannerWrap}>
      <MaterialIcons name="workspace-premium" size={18} color="#C2410C" />
      <View style={{ flex: 1 }}>
        <Text style={styles.bannerTitle}>{title}</Text>
        {!!message && <Text style={styles.bannerMessage}>{message}</Text>}

        {!!ctaLabel && !!onCta && (
          <TouchableOpacity
            style={styles.bannerCta}
            onPress={onCta}
            activeOpacity={0.85}
          >
            <Text style={styles.bannerCtaText}>{ctaLabel}</Text>
            <MaterialIcons name="arrow-forward" size={16} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity onPress={onClose} hitSlop={12} activeOpacity={0.7}>
        <MaterialIcons name="close" size={18} color="#9A3412" />
      </TouchableOpacity>
    </View>
  );
}

export function CreateProjectModal({
  visible,
  onClose,
  onSave,
  onRequireUpgrade,
}: CreateProjectModalProps) {
  const { showToast } = useToast();
  const { height: windowHeight } = useWindowDimensions();
  const [formState, actions] = useCreateProjectForm();
  const [isSaving, setIsSaving] = useState(false);

  const [submitError, setSubmitError] = useState<{
    title: string;
    message?: string;
    ctaLabel?: string;
    onCta?: () => void;
  } | null>(null);

  const [taskInput, setTaskInput] = useState("");
  const [taskPriority, setTaskPriority] = useState<"ALTA" | "MEDIA" | "BAIXA">(
    "MEDIA",
  );

  const [expenseCategory, setExpenseCategory] = useState(
    "MATERIAL" as (typeof EXPENSE_CATEGORIES)[number]["id"],
  );
  const [expenseInput, setExpenseInput] = useState("");

  // Previsão de entrega
  const [deliveryForecast, setDeliveryForecast] = useState(""); // DD/MM/AAAA
  const [deliveryForecastTouched, setDeliveryForecastTouched] = useState(false);
  const [deliverySaveAttempted, setDeliverySaveAttempted] = useState(false);

  // Toggles de acompanhamento — desabilitados por padrão
  const [trackActivities, setTrackActivities] = useState(false);
  const [trackFinancial, setTrackFinancial] = useState(false);

  const [proposalModalVisible, setProposalModalVisible] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSubmitError(null);
      setIsSaving(false);
    }
  }, [visible]);

  const deliveryDigitsLen = useMemo(
    () => brDateDigitsLen(deliveryForecast),
    [deliveryForecast],
  );

  const shouldShowDeliveryValidation = useMemo(() => {
    const raw = deliveryForecast.trim();
    const emptyAfterTouch = deliveryForecastTouched && raw.length === 0;
    return deliveryDigitsLen === 8 || deliverySaveAttempted || emptyAfterTouch;
  }, [
    deliveryDigitsLen,
    deliverySaveAttempted,
    deliveryForecastTouched,
    deliveryForecast,
  ]);

  const deliveryForecastError = useMemo(() => {
    return validateBRDateWithYearRange({
      value: deliveryForecast,
      shouldShow: shouldShowDeliveryValidation,
      required: false,
      minYear: new Date().getFullYear(),
      maxYear: 2100,
    });
  }, [deliveryForecast, shouldShowDeliveryValidation]);

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Refs
  const nomeRef = useRef<TextInput | null>(null);
  const enderecoRef = useRef<TextInput | null>(null);
  const previsaoEntregaRef = useRef<TextInput | null>(null);
  const horasRef = useRef<TextInput | null>(null);
  const orcamentoRef = useRef<TextInput | null>(null);
  const taskRef = useRef<TextInput | null>(null);
  const expenseRef = useRef<TextInput | null>(null);

  const scrollRef = useRef<any>(null);

  const [focusedField, setFocusedField] = useState<
    "orcamento" | "horas" | "previsaoEntrega" | "expense" | null
  >(null);

  const isAtBudgetLimit =
    (formState.orcamento?.length ?? 0) >= MAX_BUDGET_VALUE_DIGITS;

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

  const nextFor = (field: typeof focusedField) => {
    if (field === "previsaoEntrega") {
      horasRef.current?.focus();
      scrollToKeyboard(horasRef, 260);
      return;
    }
    Keyboard.dismiss();
  };

  const handleBudgetChange = (text: string) => {
    actions.setOrcamento(limitBudgetValueDigits(text));
  };

  const createTaskLimitReached =
    formState.tarefas.length >= CREATE_PROJECT_TASK_LIMIT;

  const handleAddTask = () => {
    setSubmitError(null);

    if (!taskInput.trim()) {
      showToast({
        title: "Campo vazio",
        message: "Digite o título da tarefa.",
        tone: "error",
      });
      setSubmitError({
        title: "Campo vazio",
        message: "Digite o título da tarefa para adicionar.",
      });
      return;
    }
    if (createTaskLimitReached) {
      showToast({
        title: "Limite atingido",
        message: `Limite de ${CREATE_PROJECT_TASK_LIMIT} tarefas iniciais atingido.`,
        tone: "info",
      });
      setSubmitError({
        title: "Limite atingido",
        message: `Limite de ${CREATE_PROJECT_TASK_LIMIT} tarefas iniciais atingido.`,
      });
      return;
    }

    actions.addTarefa({
      titulo: taskInput,
      descricao: "",
      prioridade: taskPriority,
    });

    setTaskInput("");
    setTaskPriority("MEDIA");
    taskRef.current?.focus();
  };

  const handleClearTasks = () => {
    if (formState.tarefas.length === 0 || isSaving) return;

    Alert.alert(
      "Limpar tarefas?",
      "Isso vai remover todas as tarefas adicionadas nesta lista.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpar",
          style: "destructive",
          onPress: () => {
            actions.clearTarefas();
            showToast({
              title: "Lista limpa",
              message: "Todas as tarefas foram removidas.",
              tone: "neutral",
            });
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    setSubmitError(null);
    setDeliverySaveAttempted(true);

    if (!actions.validate()) return;
    if (deliveryForecastError) return;

    setIsSaving(true);

    try {
      const expectedDeliveryAt = deliveryForecast.trim()
        ? brDateToIsoDate(deliveryForecast.trim())
        : null;

      if (deliveryForecast.trim() && !expectedDeliveryAt) {
        setSubmitError({
          title: "Data inválida",
          message: "Use o formato DD/MM/AAAA.",
        });
        showToast({
          title: "Data inválida",
          message: "Use o formato DD/MM/AAAA.",
          tone: "error",
        });
        setIsSaving(false);
        return;
      }

      if (
        trackFinancial &&
        formState.orcamento &&
        formState.orcamento.length > MAX_BUDGET_VALUE_DIGITS
      ) {
        setSubmitError({
          title: "Valor acima do limite",
          message: "Reduza a quantidade de dígitos do valor informado.",
        });
        showToast({
          title: "Valor acima do limite",
          message: "Reduza a quantidade de dígitos do valor informado.",
          tone: "error",
        });
        setIsSaving(false);
        return;
      }

      const budgetCents =
        trackFinancial && formState.orcamento && formState.orcamento.trim()
          ? Number.parseInt(formState.orcamento, 10)
          : undefined;

      const hoursContracted =
        formState.horasContratadas && formState.horasContratadas.trim()
          ? Number.parseInt(formState.horasContratadas, 10)
          : undefined;

      const tasks: CreateProjectTaskDto[] =
        trackActivities && formState.tarefas.length > 0
          ? formState.tarefas.map((t, index) => ({
              title: t.titulo.slice(0, 30),
              description: t.descricao?.trim() || undefined,
              priority: PRIORITY_MAP[t.prioridade],
              position: index,
            }))
          : [];

      const dto: CreateProjectDto = {
        name: formState.nome,
        address: formState.endereco?.trim()
          ? formState.endereco.trim()
          : undefined,
        expectedDeliveryAt: expectedDeliveryAt ?? undefined,
        budgetCents: Number.isFinite(budgetCents) ? budgetCents : undefined,
        hoursContracted: Number.isFinite(hoursContracted)
          ? hoursContracted
          : undefined,
        trackActivities,
        trackFinancial,
        tasks: tasks.length > 0 ? tasks : undefined,
      };

      const created = await createProject(dto);

      const previsaoEntregaFinalBR = created.expectedDeliveryAt
        ? new Date(created.expectedDeliveryAt).toLocaleDateString("pt-BR")
        : deliveryForecast.trim() || addDaysBR(30);

      const newObra: ObraDetalhe = {
        id: created.id ?? `obra-${Date.now()}`,
        nome: created.name ?? formState.nome,
        endereco: (created.address ?? formState.endereco) || "",
        cliente: "Novo Cliente",
        status: "planejamento",
        progresso: 0,
        referencia: `#${Math.floor(Math.random() * 10000)}`,
        cidade: "",
        estado: "",
        dataInicio: new Date().toLocaleDateString("pt-BR"),
        dataPrevisao: addDaysBR(30),
        dataPrevisaoEntrega: previsaoEntregaFinalBR,
        totalInvestido: actions.getTotalGastos(),
        orcamento:
          typeof created.budgetCents === "number"
            ? created.budgetCents / 100
            : formState.orcamento
              ? Number.parseInt(formState.orcamento, 10) / 100
              : 0,
        proximoPagamento: { valor: 0, diasRestantes: 0 },
        etapaAtual: formState.tarefas[0]?.titulo || "—",
        proximaEtapa: formState.tarefas[1]?.titulo || "—",
        tarefas: trackActivities ? formState.tarefas : [],
        gastos: formState.gastos,
        horasContratadas:
          typeof created.hoursContracted === "number"
            ? created.hoursContracted
            : formState.horasContratadas
              ? Number.parseInt(formState.horasContratadas, 10)
              : 0,
        horasRealizadas: 0,
        trackActivities,
        trackFinancial,
        myRole: "OWNER",
      };

      onSave(newObra);

      actions.reset();
      setTaskInput("");
      setExpenseInput("");
      setDeliveryForecast("");
      setDeliveryForecastTouched(false);
      setDeliverySaveAttempted(false);
      setFocusedField(null);
      setTrackActivities(false);
      setTrackFinancial(false);

      setIsSaving(false);
    } catch (error: unknown) {
      const status =
        typeof error === "object" && error && "status" in error
          ? (error as { status?: number }).status
          : undefined;

      if (status === 403) {
        if (onRequireUpgrade) {
          setIsSaving(false);
          onClose();
          onRequireUpgrade();
          return;
        }

        setSubmitError({
          title: "Limite do plano atingido",
          message:
            "Para criar mais obras, você precisa fazer upgrade do seu plano.",
        });
        showToast({
          title: "Limite do plano atingido",
          message:
            "Para criar mais obras, você precisa fazer upgrade do seu plano.",
          tone: "info",
        });
        setIsSaving(false);
        return;
      }

      const genericMessage =
        "Não foi possível criar o projeto. Tente novamente.";
      setSubmitError({
        title: "Erro ao criar projeto",
        message: genericMessage,
      });

      showToast({
        title: "Erro ao criar projeto",
        message: genericMessage,
        tone: "error",
      });

      setIsSaving(false);
    }
  };

  const hasErrors = useMemo(() => {
    const base = Object.keys(formState.errors).length > 0;
    const delivery = !!deliveryForecastError;
    return base || delivery;
  }, [formState.errors, deliveryForecastError]);

  if (!visible) return null;

  const dynamicScrollPaddingBottom = 120 + keyboardHeight + 24;
  const tasksListMaxHeight = trackFinancial
    ? Math.max(260, Math.min(windowHeight * 0.38, 420))
    : Math.max(320, Math.min(windowHeight * 0.52, 560));

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Criar Novo Projeto</Text>
          <TouchableOpacity
            onPress={onClose}
            disabled={isSaving}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {submitError && (
          <InlineBanner
            title={submitError.title}
            message={submitError.message}
            ctaLabel={submitError.ctaLabel}
            onCta={submitError.onCta}
            onClose={() => setSubmitError(null)}
          />
        )}

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
            nestedScrollEnabled
          >
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="info" size={20} color={PRIMARY} />
                <Text style={styles.sectionTitle}>Informações Básicas</Text>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Nome do Projeto</Text>
                  <Text style={styles.required}>*</Text>
                </View>
                <TextInput
                  ref={nomeRef}
                  style={[
                    styles.input,
                    formState.errors.nome && styles.inputError,
                  ]}
                  placeholder="Ex: Residência Alto Pinheiros"
                  placeholderTextColor="#9CA3AF"
                  value={formState.nome}
                  onChangeText={actions.setNome}
                  editable={!isSaving}
                  maxLength={PROJECT_NAME_MAX}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => enderecoRef.current?.focus()}
                />
                <CharacterLimitHint
                  current={formState.nome.length}
                  max={PROJECT_NAME_MAX}
                />
                {formState.errors.nome && (
                  <View style={styles.errorBox}>
                    <MaterialIcons name="error" size={16} color="#DC2626" />
                    <Text style={styles.errorText}>
                      {formState.errors.nome}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Endereço</Text>
                  <Text style={styles.required}>*</Text>
                </View>
                <TextInput
                  ref={enderecoRef}
                  style={[
                    styles.input,
                    formState.errors.endereco && styles.inputError,
                  ]}
                  placeholder="Ex: Rua das Flores, 123, São Paulo - SP"
                  placeholderTextColor="#9CA3AF"
                  value={formState.endereco}
                  onChangeText={actions.setEndereco}
                  editable={!isSaving}
                  maxLength={PROJECT_ADDRESS_MAX}
                  multiline
                  returnKeyType="next"
                  blurOnSubmit
                  onSubmitEditing={() => previsaoEntregaRef.current?.focus()}
                />
                <CharacterLimitHint
                  current={formState.endereco.length}
                  max={PROJECT_ADDRESS_MAX}
                />
                {formState.errors.endereco && (
                  <View style={styles.errorBox}>
                    <MaterialIcons name="error" size={16} color="#DC2626" />
                    <Text style={styles.errorText}>
                      {formState.errors.endereco}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.deliveryHorasRow}>
                <View style={[styles.formGroup, { flex: 1, marginBottom: 0 }]}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Previsão de entrega</Text>
                    <Text style={styles.labelOptional}> (Opcional)</Text>
                  </View>

                  <View style={styles.inlineInputWrap}>
                    <View style={styles.dateInput}>
                      <MaterialIcons name="event" size={16} color="#9CA3AF" />
                      <TextInput
                        ref={previsaoEntregaRef}
                        style={styles.dateField}
                        placeholder="DD/MM/AAAA"
                        placeholderTextColor="#9CA3AF"
                        value={deliveryForecast}
                        onChangeText={(t) => {
                          setDeliveryForecastTouched(true);
                          setDeliveryForecast(maskBRDate(t));
                        }}
                        onBlur={() => {
                          setDeliveryForecastTouched(true);
                          setFocusedField(null);
                        }}
                        editable={!isSaving}
                        keyboardType={
                          Platform.OS === "ios" ? "number-pad" : "numeric"
                        }
                        maxLength={10}
                        onFocus={() => {
                          setFocusedField("previsaoEntrega");
                          scrollToKeyboard(previsaoEntregaRef, 280);
                        }}
                      />
                    </View>

                    {!!deliveryForecastError && (
                      <View style={styles.errorBox}>
                        <MaterialIcons name="error" size={16} color="#DC2626" />
                        <Text style={styles.errorText}>
                          {deliveryForecastError}
                        </Text>
                      </View>
                    )}

                    {focusedField === "previsaoEntrega" && (
                      <View style={styles.inlineActions}>
                        <TouchableOpacity
                          style={styles.inlinePrimary}
                          onPress={() => nextFor("previsaoEntrega")}
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

                <View
                  style={[styles.formGroup, { width: 110, marginBottom: 0 }]}
                >
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Horas</Text>
                    <Text style={styles.labelOptional}> (Opt.)</Text>
                  </View>

                  <View style={styles.inlineInputWrap}>
                    <View style={styles.horasInput}>
                      <MaterialIcons
                        name="schedule"
                        size={14}
                        color="#9CA3AF"
                      />
                      <TextInput
                        ref={horasRef}
                        style={styles.horasField}
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                        value={formState.horasContratadas}
                        onChangeText={actions.setHorasContratadas}
                        keyboardType="number-pad"
                        editable={!isSaving}
                        maxLength={5}
                        onFocus={() => {
                          setFocusedField("horas");
                          scrollToKeyboard(horasRef, 300);
                        }}
                        onBlur={() => setFocusedField(null)}
                        onSubmitEditing={() => nextFor("horas")}
                      />
                      <Text style={styles.horasSuffix}>h</Text>
                    </View>

                    {focusedField === "horas" && (
                      <View style={styles.inlineActions}>
                        <TouchableOpacity
                          style={styles.inlinePrimary}
                          onPress={() => nextFor("horas")}
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
              </View>
            </View>

            <View style={styles.section}>
              <TouchableOpacity
                style={styles.trackingToggleRow}
                onPress={() => setTrackActivities((v) => !v)}
                activeOpacity={0.7}
                disabled={isSaving}
              >
                <View style={styles.trackingToggleLeft}>
                  <MaterialIcons
                    name="check-circle-outline"
                    size={22}
                    color={trackActivities ? PRIMARY : "#9CA3AF"}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.trackingLabel,
                        trackActivities && styles.trackingLabelOn,
                      ]}
                    >
                      Acompanhar Tarefas
                    </Text>
                    <Text style={styles.trackingHint}>
                      Crie tarefas iniciais para organizar a obra
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.togglePill,
                    trackActivities && styles.togglePillOn,
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      trackActivities && styles.toggleThumbOn,
                    ]}
                  />
                </View>
              </TouchableOpacity>

              {trackActivities && (
                <View style={styles.trackingContent}>
                  <View style={styles.taskInputContainer}>
                    <TextInput
                      ref={taskRef}
                      style={styles.taskInput}
                      placeholder="Nova tarefa..."
                      placeholderTextColor="#9CA3AF"
                      value={taskInput}
                      onChangeText={setTaskInput}
                      editable={!isSaving}
                      maxLength={30}
                      returnKeyType="done"
                      onSubmitEditing={handleAddTask}
                      onFocus={() => scrollToKeyboard(taskRef, 360)}
                    />
                    <View style={styles.priorityChip}>
                      <TouchableOpacity
                        style={styles.prioritySelector}
                        onPress={() => {
                          const priorities: ("ALTA" | "MEDIA" | "BAIXA")[] = [
                            "ALTA",
                            "MEDIA",
                            "BAIXA",
                          ];
                          const current = priorities.indexOf(taskPriority);
                          const next =
                            priorities[(current + 1) % priorities.length];
                          setTaskPriority(next);
                        }}
                        disabled={isSaving}
                      >
                        <View
                          style={[
                            styles.priorityDot,
                            {
                              backgroundColor:
                                PRIORITY_CONFIG[taskPriority].color,
                            },
                          ]}
                        />
                        <Text style={styles.priorityLabel}>
                          {PRIORITY_CONFIG[taskPriority].label}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.addBtn,
                        (isSaving || createTaskLimitReached) &&
                          styles.addBtnDisabled,
                      ]}
                      onPress={handleAddTask}
                      disabled={isSaving || createTaskLimitReached}
                    >
                      <MaterialIcons name="add" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>

                  {!createTaskLimitReached && (
                    <TouchableOpacity
                      style={styles.proposeBtn}
                      onPress={() => setProposalModalVisible(true)}
                      disabled={isSaving}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.proposeBtnIcon}>✨</Text>
                      <Text style={styles.proposeBtnText}>
                        Propor tarefas com base no projeto
                      </Text>
                    </TouchableOpacity>
                  )}

                  {createTaskLimitReached && (
                    <View style={styles.taskLimitBanner}>
                      <MaterialIcons
                        name="info-outline"
                        size={15}
                        color="#9A3412"
                      />
                      <Text style={styles.taskLimitBannerText}>
                        Limite de {CREATE_PROJECT_TASK_LIMIT} tarefas iniciais
                        atingido. Remova uma tarefa para adicionar outra.
                      </Text>
                    </View>
                  )}

                  {formState.tarefas.length > 0 && (
                    <View
                      style={[styles.tasksList, { maxHeight: tasksListMaxHeight }]}
                    >
                      <View style={styles.tasksListHeader}>
                        <Text style={styles.tasksListTitle}>
                          {formState.tarefas.length} tarefa
                          {formState.tarefas.length !== 1 ? "s" : ""} adicionada
                          {formState.tarefas.length !== 1 ? "s" : ""}
                          {` (${formState.tarefas.length}/${CREATE_PROJECT_TASK_LIMIT})`}
                        </Text>
                        <TouchableOpacity
                          style={styles.clearTasksButton}
                          onPress={handleClearTasks}
                          disabled={isSaving}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.clearTasksButtonText}>
                            Limpar tudo
                          </Text>
                        </TouchableOpacity>
                      </View>
                      {formState.tarefas.length >= 2 && (
                        <Text style={styles.tasksReorderHint}>
                          Segure ≡ para reordenar
                        </Text>
                      )}

                      <DraggableFlatList
                        data={formState.tarefas}
                        keyExtractor={(item) => item.id}
                        onDragEnd={({ data }) => actions.reorderTarefas(data)}
                        scrollEnabled
                        nestedScrollEnabled
                        activationDistance={10}
                        style={styles.tasksListScroll}
                        contentContainerStyle={styles.tasksListContent}
                        showsVerticalScrollIndicator={formState.tarefas.length > 5}
                        renderItem={({ item: tarefa, drag, isActive }) => (
                          <ScaleDecorator activeScale={1.02}>
                            <View
                              style={[
                                styles.taskItem,
                                isActive && styles.taskItemDragging,
                              ]}
                            >
                              <TouchableOpacity
                                onLongPress={drag}
                                disabled={isActive || isSaving}
                                style={styles.taskDragHandle}
                                activeOpacity={0.6}
                              >
                                <MaterialIcons
                                  name="drag-indicator"
                                  size={20}
                                  color="#D1D5DB"
                                />
                              </TouchableOpacity>

                              <View style={styles.taskContent}>
                                <MaterialIcons
                                  name="check-circle-outline"
                                  size={18}
                                  color="#9CA3AF"
                                />
                                <Text
                                  style={styles.taskTitle}
                                  numberOfLines={1}
                                >
                                  {tarefa.titulo}
                                </Text>
                              </View>

                              <View style={styles.taskMeta}>
                                <View
                                  style={[
                                    styles.taskPriorityBadge,
                                    {
                                      borderLeftColor:
                                        PRIORITY_CONFIG[tarefa.prioridade]
                                          .color,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.taskPriorityText,
                                      {
                                        color:
                                          PRIORITY_CONFIG[tarefa.prioridade]
                                            .color,
                                      },
                                    ]}
                                  >
                                    {PRIORITY_CONFIG[tarefa.prioridade].label}
                                  </Text>
                                </View>

                                <TouchableOpacity
                                  onPress={() =>
                                    actions.removeTarefa(tarefa.id)
                                  }
                                  disabled={isSaving || isActive}
                                >
                                  <MaterialIcons
                                    name="close"
                                    size={18}
                                    color="#9CA3AF"
                                  />
                                </TouchableOpacity>
                              </View>
                            </View>
                          </ScaleDecorator>
                        )}
                      />
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <TouchableOpacity
                style={styles.trackingToggleRow}
                onPress={() => setTrackFinancial((v) => !v)}
                activeOpacity={0.7}
                disabled={isSaving}
              >
                <View style={styles.trackingToggleLeft}>
                  <MaterialIcons
                    name="account-balance-wallet"
                    size={22}
                    color={trackFinancial ? PRIMARY : "#9CA3AF"}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.trackingLabel,
                        trackFinancial && styles.trackingLabelOn,
                      ]}
                    >
                      Acompanhar Financeiro
                    </Text>
                    <Text style={styles.trackingHint}>
                      Defina o orçamento e controle os gastos
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.togglePill,
                    trackFinancial && styles.togglePillOn,
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      trackFinancial && styles.toggleThumbOn,
                    ]}
                  />
                </View>
              </TouchableOpacity>

              {trackFinancial && (
                <View style={styles.trackingContent}>
                  <View style={styles.formGroup}>
                    <View style={styles.labelRow}>
                      <Text style={styles.label}>Orçamento Total</Text>
                      <Text style={styles.labelOptional}> (Opcional)</Text>
                    </View>

                    <View style={styles.inlineInputWrap}>
                      <View style={styles.budgetInput}>
                        <Text style={styles.currencyLabel}>R$</Text>
                        <TextInput
                          ref={orcamentoRef}
                          style={styles.budgetField}
                          placeholder="0,00"
                          placeholderTextColor="#9CA3AF"
                          value={formatBRLInput(formState.orcamento)}
                          onChangeText={handleBudgetChange}
                          keyboardType="number-pad"
                          editable={!isSaving}
                          onFocus={() => {
                            setFocusedField("orcamento");
                            scrollToKeyboard(orcamentoRef, 300);
                          }}
                          onBlur={() => setFocusedField(null)}
                          onSubmitEditing={() => nextFor("orcamento")}
                        />
                      </View>

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
                            onPress={() => nextFor("orcamento")}
                          >
                            <Text style={styles.inlinePrimaryText}>OK</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.inlineSecondary}
                            onPress={() => Keyboard.dismiss()}
                          >
                            <Text style={styles.inlineSecondaryText}>
                              Fechar
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    <Text style={styles.labelHint}>
                      Teto de gastos para o projeto
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={{ height: 8 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            disabled={isSaving}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.saveBtn,
              (isSaving || hasErrors) && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={isSaving || hasErrors}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.saveBtnText}>Salvar Projeto</Text>
                <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <TaskProposalModal
        visible={proposalModalVisible}
        onClose={() => setProposalModalVisible(false)}
        onConfirm={(tasks) => actions.addTarefasEmBulk(tasks, CREATE_PROJECT_TASK_LIMIT)}
        existingCount={formState.tarefas.length}
        taskLimit={CREATE_PROJECT_TASK_LIMIT}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },

  bannerWrap: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  bannerTitle: {
    fontWeight: "900",
    color: "#7C2D12",
    fontSize: 13,
  },
  bannerMessage: {
    color: "#9A3412",
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  bannerCta: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#EA580C",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  bannerCtaText: { color: "#FFF", fontWeight: "900", fontSize: 12 },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },

  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1 },
  sectionSubtitle: { fontSize: 12, fontWeight: "500", color: "#9CA3AF" },

  helperText: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 18,
  },

  formGroup: { marginBottom: 16 },
  labelRow: { flexDirection: "row", marginBottom: 8, alignItems: "center" },
  label: { fontSize: 14, fontWeight: "600", color: "#374151" },
  required: { color: "#DC2626", marginLeft: 2 },
  labelOptional: { fontSize: 12, fontWeight: "400", color: "#9CA3AF" },
  labelHint: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 5,
    fontWeight: "400",
  },

  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    maxHeight: 100,
  },
  inputError: { borderColor: "#DC2626", backgroundColor: "#FEF2F2" },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  errorText: { fontSize: 12, color: "#DC2626", fontWeight: "500" },

  inlineInputWrap: { gap: 8 },
  inlineActions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
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

  deliveryHorasRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
    minHeight: 44,
  },
  dateField: { flex: 1, paddingVertical: 10, fontSize: 14, color: "#111827" },

  horasInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 10,
    gap: 6,
    minHeight: 44,
  },
  horasField: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
    minWidth: 24,
  },
  horasSuffix: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
  },

  trackingToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  trackingToggleLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trackingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  trackingLabelOn: {
    color: "#111827",
  },
  trackingHint: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
    marginTop: 2,
  },
  trackingContent: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },

  togglePill: {
    width: 46,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#D1D5DB",
    padding: 3,
    justifyContent: "center",
    flexShrink: 0,
  },
  togglePillOn: {
    backgroundColor: PRIMARY,
  },
  toggleThumb: {
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
    alignSelf: "flex-start",
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },

  proposeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.2)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  proposeBtnIcon: {
    fontSize: 16,
  },
  proposeBtnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },

  taskInputContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  taskInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },

  priorityChip: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    overflow: "hidden",
  },
  prioritySelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  priorityLabel: { fontSize: 13, fontWeight: "600", color: "#374151" },

  addBtn: {
    width: 40,
    height: 38,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnDisabled: { opacity: 0.5 },
  taskLimitBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF7ED",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  taskLimitBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#9A3412",
  },

  tasksList: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingTop: 12,
    paddingHorizontal: 10,
    paddingBottom: 14,
    marginTop: 4,
    marginBottom: 14,
    overflow: "hidden",
  },
  tasksListScroll: {
    flexGrow: 0,
  },
  tasksListContent: {
    paddingBottom: 28,
  },
  tasksListHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  tasksListTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  clearTasksButton: {
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(17, 24, 39, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(17, 24, 39, 0.06)",
  },
  clearTasksButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  tasksReorderHint: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "400",
    marginBottom: 8,
  },

  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 6,
  },
  taskItemDragging: {
    borderColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  taskDragHandle: {
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  taskContent: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  taskTitle: { fontSize: 13, fontWeight: "500", color: "#111827" },
  taskMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  taskPriorityBadge: {
    borderLeftWidth: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  taskPriorityText: { fontSize: 12, fontWeight: "600" },

  budgetInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
    minHeight: 44,
  },
  currencyLabel: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  budgetField: { flex: 1, paddingVertical: 10, fontSize: 14, color: "#111827" },

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

  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#374151" },

  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
});
