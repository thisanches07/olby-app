import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { router, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

import { PressableScale } from "@/components/ui/pressable-scale";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscription } from "@/contexts/subscription-context";
import { useObraData } from "@/hooks/use-obra-data";
import { track } from "@/services/analytics";
import { ApiError } from "@/services/api";
import { buildReportData, type ReportPeriod } from "@/services/report.service";
import { colors } from "@/theme/colors";
import { AnalyticsEvents } from "@/types/analytics-events";
import { generateReportHtml } from "@/utils/report-html";
import {
  checkReportAccess,
  getCachedReportUsage,
  periodToDays,
  recordReportGeneration,
  type ReportUsage,
} from "@/utils/report-usage";

type ScreenState =
  | { kind: "select" }
  | { kind: "loading" }
  | { kind: "preview"; html: string; fileName: string }
  | { kind: "error"; message: string };

const PERIOD_OPTIONS: { value: ReportPeriod; label: string; sub: string }[] = [
  { value: 7, label: "7 dias", sub: "Última semana" },
  { value: 15, label: "15 dias", sub: "Últimas duas semanas" },
  { value: 30, label: "30 dias", sub: "Último mês" },
  { value: "all", label: "Obra toda", sub: "Todo o histórico da obra" },
];

function slugifyFilePart(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "obra"
  );
}

function reportPeriodFileSuffix(period: ReportPeriod): string {
  if (period === 7) return "ultimos-7-dias";
  if (period === 15) return "ultimos-15-dias";
  if (period === "all") return "obra-toda";
  return "esse-mes";
}

function buildReportFileName(
  projectName: string,
  period: ReportPeriod,
): string {
  return `${slugifyFilePart(projectName)}-${reportPeriodFileSuffix(period)}.pdf`;
}

function ReportLoadingScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <PressableScale
          style={styles.iconBtn}
          onPress={() => router.back()}
          scaleTo={0.88}
        >
          <MaterialIcons name="arrow-back-ios" size={20} color="#111827" />
        </PressableScale>
        <Text style={styles.headerTitle}>Relatório</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Selecione o período</Text>

        <View style={styles.loadingSection}>
          {[0, 1, 2, 3].map((item) => (
            <View key={item} style={styles.loadingCard}>
              <View style={styles.loadingCardRow}>
                <Skeleton width={20} height={20} borderRadius={10} />
                <View style={styles.flex1}>
                  <Skeleton
                    width={`${38 + item * 2}%`}
                    height={15}
                    borderRadius={6}
                  />
                  <Skeleton
                    width={`${56 - item * 4}%`}
                    height={11}
                    borderRadius={5}
                    style={styles.mt8}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.loadingButton}>
          <Skeleton width={18} height={18} borderRadius={5} />
          <Skeleton width={128} height={16} borderRadius={7} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type BuiltReportData = Awaited<ReturnType<typeof buildReportData>>;

function hasReportContent(data: BuiltReportData): boolean {
  return data.diaryEntries.length > 0 || data.expensesInPeriod.length > 0;
}

export default function ReportScreen() {
  const { id, fromOnboarding } = useLocalSearchParams<{
    id: string;
    fromOnboarding?: string;
  }>();
  const { plan, isLoading: subscriptionLoading } = useSubscription();
  const { obra, loading: obraLoading } = useObraData(id!);

  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>(7);
  const [state, setState] = useState<ScreenState>({ kind: "select" });
  const [isExporting, setIsExporting] = useState(false);
  const [usage, setUsage] = useState<ReportUsage | null>(null);
  const [emptyReportResolver, setEmptyReportResolver] = useState<
    ((shouldContinue: boolean) => void) | null
  >(null);

  // Uma idempotencyKey por preview gerado: retry do mesmo preview reusa a key
  // (não reconsome); um novo preview gera outra.
  const idempotencyKeyRef = useRef<string | null>(null);

  const planCode = plan?.code ?? "FREE";
  const isOnboardingPreview = fromOnboarding === "1";

  // Carrega o uso/limite mensal: cache local primeiro (visual imediato), depois
  // o valor autoritativo do backend.
  useEffect(() => {
    if (!id) return;
    let active = true;
    getCachedReportUsage(id).then((cached) => {
      if (active && cached) setUsage((prev) => prev ?? cached);
    });
    checkReportAccess(id).then((fresh) => {
      if (active) setUsage(fresh);
    });
    return () => {
      active = false;
    };
  }, [id]);

  const confirmEmptyReport = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        setEmptyReportResolver(() => resolve);
      }),
    [],
  );

  const resolveEmptyReportModal = useCallback(
    (shouldContinue: boolean) => {
      emptyReportResolver?.(shouldContinue);
      setEmptyReportResolver(null);
    },
    [emptyReportResolver],
  );

  const handleGenerate = useCallback(async () => {
    if (!obra) return;
    if (subscriptionLoading && !plan) {
      Alert.alert(
        "Aguarde um momento",
        "Estamos carregando as informações do seu plano. Tente novamente em alguns segundos.",
      );
      return;
    }
    if (isOnboardingPreview) {
      Alert.alert(
        "Prévia do tour",
        "Durante o onboarding, a geração de relatório fica desativada para não consumir seu limite mensal sem querer.",
      );
      return;
    }

    if (planCode === "FREE") {
      Alert.alert(
        "Recurso BASIC",
        "Relatórios estão disponíveis a partir do plano BASIC. Quer conhecer os planos?",
        [
          { text: "Agora não", style: "cancel" },
          {
            text: "Ver planos",
            onPress: () => router.push("/subscription/plans"),
          },
        ],
      );
      return;
    }

    try {
      setState({ kind: "loading" });
      const data = await buildReportData(id!, obra, selectedPeriod);
      if (!hasReportContent(data)) {
        setState({ kind: "select" });
        const shouldContinue = await confirmEmptyReport();
        if (!shouldContinue) return;
        setState({ kind: "loading" });
      }
      const html = generateReportHtml(data, selectedPeriod);
      const fileName = buildReportFileName(obra.nome, selectedPeriod);
      // Nova geração → nova idempotencyKey (consumida no export).
      idempotencyKeyRef.current = Crypto.randomUUID();
      setState({ kind: "preview", html, fileName });
      track(AnalyticsEvents.REPORT_GENERATED, {
        project_id: id!,
        period: selectedPeriod,
      });
    } catch {
      setState({
        kind: "error",
        message:
          "Não foi possível gerar o relatório. Verifique sua conexão e tente novamente.",
      });
    }
  }, [
    confirmEmptyReport,
    obra,
    id,
    isOnboardingPreview,
    plan,
    planCode,
    selectedPeriod,
    subscriptionLoading,
  ]);
  const emptyReportModal = (
    <EmptyReportModal
      visible={!!emptyReportResolver}
      onCancel={() => resolveEmptyReportModal(false)}
      onContinue={() => resolveEmptyReportModal(true)}
    />
  );

  const handleExport = useCallback(async () => {
    if (state.kind !== "preview") return;
    if (isExporting) return; // evita duplo clique
    if (subscriptionLoading && !plan) {
      Alert.alert(
        "Aguarde um momento",
        "Estamos carregando as informações do seu plano. Tente novamente em alguns segundos.",
      );
      return;
    }

    // FREE não gera relatório — curto-circuito com UX melhor (o backend também
    // bloquearia com 403 REPORT_LIMIT_REACHED).
    if (planCode === "FREE") {
      Alert.alert(
        "Recurso BASIC",
        "Relatórios estão disponíveis a partir do plano BASIC. Quer conhecer os planos?",
        [
          { text: "Agora não", style: "cancel" },
          {
            text: "Ver planos",
            onPress: () => router.push("/subscription/plans"),
          },
        ],
      );
      return;
    }

    try {
      setIsExporting(true);

      const { uri } = await Print.printToFileAsync({ html: state.html });

      // Consome o limite no backend (idempotente). PRO não consome. Um 403
      // REPORT_LIMIT_REACHED é lançado como ApiError e tratado no catch.
      const idempotencyKey =
        idempotencyKeyRef.current ?? Crypto.randomUUID();
      idempotencyKeyRef.current = idempotencyKey;
      const { usage: nextUsage } = await recordReportGeneration(
        id!,
        periodToDays(selectedPeriod),
        idempotencyKey,
      );
      setUsage(nextUsage);

      const namedUri = `${FileSystem.cacheDirectory}${state.fileName}`;
      await FileSystem.deleteAsync(namedUri, { idempotent: true });
      await FileSystem.copyAsync({ from: uri, to: namedUri });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(namedUri, {
          mimeType: "application/pdf",
          dialogTitle: "Compartilhar relatório",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Arquivo salvo", `PDF salvo em: ${namedUri}`);
      }
      track(AnalyticsEvents.REPORT_EXPORTED, {
        project_id: id!,
        period: selectedPeriod,
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === "REPORT_LIMIT_REACHED") {
        // Limite atingido: refletir used/limit/resetsAt na UI. O
        // PlanErrorInterceptor global já redireciona ao paywall (a mensagem
        // contém "Limite"); fallback de alerta só se o handler não agir.
        const details = err.details ?? {};
        setUsage((prev) => ({
          used: typeof details.used === "number" ? details.used : prev?.used ?? 0,
          limit:
            typeof details.limit === "number" || details.limit === null
              ? (details.limit as number | null)
              : prev?.limit ?? null,
          remaining: 0,
          allowed: false,
          resetsAt:
            typeof details.resetsAt === "string"
              ? details.resetsAt
              : prev?.resetsAt ?? null,
          planCode: prev?.planCode,
        }));
      } else {
        Alert.alert("Erro", "Não foi possível exportar o PDF.");
      }
    } finally {
      setIsExporting(false);
    }
  }, [id, isExporting, plan, planCode, selectedPeriod, state, subscriptionLoading]);
  if (obraLoading && !obra) {
    return (
      <>
        <ReportLoadingScreen />
        {emptyReportModal}
      </>
    );
  }

  // â”€â”€ Preview mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (state.kind === "preview") {
    return (
      <>
        <SafeAreaView style={styles.safe}>
          <View style={styles.previewHeader}>
            <PressableScale
              style={styles.iconBtn}
              onPress={() => setState({ kind: "select" })}
              scaleTo={0.88}
            >
              <MaterialIcons name="arrow-back-ios" size={20} color="#111827" />
            </PressableScale>
            <Text style={styles.previewTitle}>Pré-visualização</Text>
            <PressableScale
              style={[
                styles.exportBtn,
                isExporting && styles.exportBtnDisabled,
              ]}
              onPress={handleExport}
              scaleTo={0.93}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="ios-share" size={16} color="#fff" />
                  <Text style={styles.exportBtnText}>Exportar PDF</Text>
                </>
              )}
            </PressableScale>
          </View>
          <WebView
            source={{ html: state.html }}
            style={styles.webview}
            originWhitelist={["*"]}
            scalesPageToFit={false}
          />
        </SafeAreaView>
        {emptyReportModal}
      </>
    );
  }

  // â”€â”€ Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (state.kind === "loading") {
    return (
      <>
        <ReportLoadingScreen />
        {emptyReportModal}
      </>
    );
  }

  // â”€â”€ Error â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (state.kind === "error") {
    return (
      <>
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <PressableScale
              style={styles.iconBtn}
              onPress={() => router.back()}
              scaleTo={0.88}
            >
              <MaterialIcons name="arrow-back-ios" size={20} color="#111827" />
            </PressableScale>
            <Text style={styles.headerTitle}>Relatório</Text>
            <View style={styles.iconBtn} />
          </View>
          <View style={styles.center}>
            <MaterialIcons name="error-outline" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{state.message}</Text>
            <Pressable
              style={styles.retryBtn}
              onPress={() => setState({ kind: "select" })}
            >
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          </View>
        </SafeAreaView>
        {emptyReportModal}
      </>
    );
  }

  // â”€â”€ Select period â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <PressableScale
            style={styles.iconBtn}
            onPress={() => router.back()}
            scaleTo={0.88}
          >
            <MaterialIcons name="arrow-back-ios" size={20} color="#111827" />
          </PressableScale>
          <Text style={styles.headerTitle}>Relatório</Text>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>Selecione o período</Text>

          {PERIOD_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.periodCard,
                selectedPeriod === opt.value && styles.periodCardSelected,
              ]}
              onPress={() => setSelectedPeriod(opt.value)}
              android_ripple={{ color: "rgba(37,99,235,0.07)" }}
            >
              <View style={styles.periodCardLeft}>
                <View
                  style={[
                    styles.radio,
                    selectedPeriod === opt.value && styles.radioSelected,
                  ]}
                >
                  {selectedPeriod === opt.value && (
                    <View style={styles.radioDot} />
                  )}
                </View>
                <View>
                  <Text
                    style={[
                      styles.periodLabel,
                      selectedPeriod === opt.value &&
                        styles.periodLabelSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text style={styles.periodSub}>{opt.sub}</Text>
                </View>
              </View>
            </Pressable>
          ))}

          {isOnboardingPreview && (
            <View style={styles.onboardingNote}>
              <MaterialIcons name="lock-outline" size={16} color="#64748B" />
              <Text style={styles.onboardingNoteText}>
                Geração desativada durante o tour para preservar seu limite
                mensal.
              </Text>
            </View>
          )}

          {usage && usage.limit !== null && <UsageNote usage={usage} />}

          <Pressable
            style={({ pressed }) => [
              styles.generateBtn,
              isOnboardingPreview && styles.generateBtnDisabled,
              pressed && !isOnboardingPreview && styles.generateBtnPressed,
            ]}
            onPress={handleGenerate}
            disabled={isOnboardingPreview}
          >
            <MaterialIcons
              name={isOnboardingPreview ? "lock-outline" : "description"}
              size={18}
              color="#fff"
            />
            <Text style={styles.generateBtnText}>
              {isOnboardingPreview ? "Indisponível no tour" : "Gerar relatório"}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
      {emptyReportModal}
    </>
  );
}

function EmptyReportModal({
  visible,
  onCancel,
  onContinue,
}: {
  visible: boolean;
  onCancel: () => void;
  onContinue: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.emptyModalOverlay}>
        <View style={styles.emptyModalCard}>
          <View style={styles.emptyModalIcon}>
            <MaterialIcons
              name="description"
              size={28}
              color={colors.primary}
            />
          </View>
          <Text style={styles.emptyModalTitle}>Relatório sem registros</Text>
          <Text style={styles.emptyModalText}>
            Não encontramos nenhuma visita ou gasto registrado para o período
            selecionado. O PDF pode ficar incompleto.
          </Text>
          <View style={styles.emptyModalActions}>
            <Pressable
              style={({ pressed }) => [
                styles.emptyModalSecondary,
                pressed && styles.emptyModalPressed,
              ]}
              onPress={onCancel}
            >
              <Text style={styles.emptyModalSecondaryText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.emptyModalPrimary,
                pressed && styles.emptyModalPressed,
              ]}
              onPress={onContinue}
            >
              <Text style={styles.emptyModalPrimaryText}>
                Gerar mesmo assim
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// â”€â”€â”€ Usage note for BASIC users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function formatResetDate(resetsAt: string | null): string | null {
  if (!resetsAt) return null;
  const d = new Date(resetsAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

function UsageNote({ usage }: { usage: ReportUsage }) {
  const resetLabel = formatResetDate(usage.resetsAt);
  const limitReached = usage.limit !== null && !usage.allowed;

  return (
    <View style={styles.usageNote}>
      <MaterialIcons name="info-outline" size={14} color="#94A3B8" />
      <Text style={styles.usageNoteText}>
        {usage.used}/{usage.limit} relatório usado este mês nesta obra
        {limitReached && resetLabel ? ` · renova em ${resetLabel}` : ""}
      </Text>
    </View>
  );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  // Body
  body: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#94A3B8",
    marginBottom: 12,
  },
  // Period cards
  periodCard: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  periodCardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  periodCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: "#2563EB",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563EB",
  },
  periodLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
  },
  periodLabelSelected: {
    color: "#1D4ED8",
  },
  periodSub: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 1,
  },
  // Usage note
  usageNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  usageNoteText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  // Generate button
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 20,
  },
  generateBtnPressed: {
    backgroundColor: "#1D4ED8",
  },
  generateBtnDisabled: {
    backgroundColor: "#94A3B8",
  },
  generateBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.2,
  },
  onboardingNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  onboardingNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#64748B",
    fontWeight: "600",
  },
  // Loading
  loadingSection: {
    gap: 10,
    marginBottom: 24,
  },
  loadingCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  loadingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.tintBlue,
    borderRadius: 12,
    paddingVertical: 16,
  },
  flex1: {
    flex: 1,
  },
  mt8: {
    marginTop: 8,
  },
  mt10: {
    marginTop: 10,
  },
  mt16: {
    marginTop: 16,
  },
  // Error
  errorText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: "#2563EB",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  // Preview
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  previewTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  exportBtnDisabled: {
    opacity: 0.6,
  },
  exportBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  webview: {
    flex: 1,
  },
  emptyModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyModalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  emptyModalIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.tintBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyModalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  emptyModalText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: "center",
  },
  emptyModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    width: "100%",
  },
  emptyModalSecondary: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 13,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyModalPrimary: {
    flex: 1.2,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 13,
    backgroundColor: colors.primary,
  },
  emptyModalPressed: {
    opacity: 0.86,
  },
  emptyModalSecondaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  emptyModalPrimaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.white,
  },
});
