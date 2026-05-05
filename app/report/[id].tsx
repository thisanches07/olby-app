import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { router, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

import { PressableScale } from "@/components/ui/pressable-scale";
import { useSubscription } from "@/contexts/subscription-context";
import { useObraData } from "@/hooks/use-obra-data";
import { buildReportData, type ReportPeriod } from "@/services/report.service";
import { colors } from "@/theme/colors";
import { generateReportHtml } from "@/utils/report-html";
import {
  checkReportAccess,
  recordReportGeneration,
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
  return "esse-mes";
}

function buildReportFileName(
  projectName: string,
  period: ReportPeriod,
): string {
  return `${slugifyFilePart(projectName)}-${reportPeriodFileSuffix(period)}.pdf`;
}

export default function ReportScreen() {
  const { id, fromOnboarding } = useLocalSearchParams<{
    id: string;
    fromOnboarding?: string;
  }>();
  const { plan } = useSubscription();
  const { obra, loading: obraLoading } = useObraData(id!);

  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>(7);
  const [state, setState] = useState<ScreenState>({ kind: "select" });
  const [isExporting, setIsExporting] = useState(false);

  const planCode = plan?.code ?? "FREE";
  const isOnboardingPreview = fromOnboarding === "1";

  const handleGenerate = useCallback(async () => {
    if (!obra) return;
    if (isOnboardingPreview) {
      Alert.alert(
        "Prévia do tour",
        "Durante o onboarding, a geração de relatório fica desativada para não consumir seu limite mensal sem querer.",
      );
      return;
    }

    const access = await checkReportAccess(id!, planCode);
    if (!access.allowed) {
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
      Alert.alert(
        "Limite mensal atingido",
        `Você usou ${access.used} de ${access.limit} relatórios este mês (plano BASIC). Faça upgrade para PRO e gere relatórios ilimitados.`,
        [
          { text: "Fechar", style: "cancel" },
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
      const html = generateReportHtml(data, selectedPeriod);
      const fileName = buildReportFileName(obra.nome, selectedPeriod);
      await recordReportGeneration(id!);
      setState({ kind: "preview", html, fileName });
    } catch {
      setState({
        kind: "error",
        message:
          "Não foi possível gerar o relatório. Verifique sua conexão e tente novamente.",
      });
    }
  }, [obra, id, isOnboardingPreview, planCode, selectedPeriod]);

  const handleExport = useCallback(async () => {
    if (state.kind !== "preview") return;
    try {
      setIsExporting(true);
      const { uri } = await Print.printToFileAsync({ html: state.html });
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
    } catch {
      Alert.alert("Erro", "Não foi possível exportar o PDF.");
    } finally {
      setIsExporting(false);
    }
  }, [state]);

  if (obraLoading && !obra) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Preview mode ────────────────────────────────────────────────────────────
  if (state.kind === "preview") {
    return (
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
            style={[styles.exportBtn, isExporting && styles.exportBtnDisabled]}
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
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (state.kind === "loading") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Gerando relatório…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (state.kind === "error") {
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
    );
  }

  // ── Select period ────────────────────────────────────────────────────────────
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
        <Text style={styles.obraName} numberOfLines={2}>
          {obra?.nome ?? ""}
        </Text>
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
                    selectedPeriod === opt.value && styles.periodLabelSelected,
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
              Geração desativada durante o tour para preservar seu limite mensal.
            </Text>
          </View>
        )}

        {planCode === "BASIC" && <UsageNote projectId={id!} />}

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
  );
}

// ─── Usage note for BASIC users ───────────────────────────────────────────────

function UsageNote({ projectId }: { projectId: string }) {
  const [used, setUsed] = useState<number | null>(null);

  useEffect(() => {
    import("@/utils/report-usage").then(({ getMonthlyUsage }) =>
      getMonthlyUsage(projectId).then(setUsed),
    );
  }, [projectId]);

  if (used === null) return null;

  return (
    <View style={styles.usageNote}>
      <MaterialIcons name="info-outline" size={14} color="#94A3B8" />
      <Text style={styles.usageNoteText}>
        {used}/2 relatórios usados este mês nesta obra
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  obraName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
    marginBottom: 24,
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
  loadingText: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
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
});
