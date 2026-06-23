import { useToast } from "@/components/obra/toast";
import { AppModal } from "@/components/ui/app-modal";
import { formatCentsBRL } from "@/constants/quote-status";
import { useSubscription } from "@/contexts/subscription-context";
import { ApiError, getErrorMessage } from "@/services/api";
import {
  applyBudgetImport,
  getBudgetAiImportLimit,
  previewBudgetImport,
  type BudgetAiImportLimit,
  type BudgetImportApplyItemInput,
  type BudgetImportPreview,
} from "@/services/budget-imports.service";
import { getManagedElsewhereCopy } from "@/utils/subscription-cross-platform";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIMARY = "#2563EB";
const DANGER = "#EF4444";
const WARN = "#B45309";
const SUCCESS_GREEN = "#16A34A";

type Step = "idle" | "loading" | "preview" | "applying";

/** Erro exibido como painel dentro do modal (nunca como toast no topo). */
type ImportError =
  | { kind: "plan"; limit: BudgetAiImportLimit | null }
  | { kind: "generic"; message: string };

interface Props {
  visible: boolean;
  projectId: string;
  onClose: () => void;
  onApplied?: () => void;
}

/** Fluxo de import de orçamento por IA: escolhe .xlsx → preview → aplica.
 *  Camada de serviço em `budget-imports.service.ts`. */
export function BudgetImportModal({
  visible,
  projectId,
  onClose,
  onApplied,
}: Props) {
  const { showToast } = useToast();
  const { plan } = useSubscription();
  const [step, setStep] = useState<Step>("idle");
  const [preview, setPreview] = useState<BudgetImportPreview | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<ImportError | null>(null);

  const reset = () => {
    setStep("idle");
    setPreview(null);
    setFileName("");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  /** Vai para a tela de planos (só chamado quando NÃO é assinatura de outra
   *  plataforma — esse caso é decidido no painel e nem mostra este botão). */
  const goToPlans = () => {
    handleClose();
    router.push("/subscription/plans");
  };

  const pickAndPreview = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const file = res.assets[0];
      setFileName(file.name);
      setError(null);
      setStep("loading");
      const data = await previewBudgetImport(projectId, {
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
      });
      setPreview(data);
      setStep("preview");
    } catch (e) {
      setStep("idle");
      // 1) Erro específico de limite de IA (tem used/limit/resetsAt).
      const lim = getBudgetAiImportLimit(e);
      if (lim) {
        setError({ kind: "plan", limit: lim });
        return;
      }
      // 2) Qualquer 403 = bloqueio de assinatura/plano (guard de assinatura,
      //    plano insuficiente). Trata como "plano não cobre".
      if (e instanceof ApiError && e.status === 403) {
        setError({ kind: "plan", limit: null });
        return;
      }
      // 3) Erro real de leitura (parse, formato, rede). Permite re-escolher.
      setError({
        kind: "generic",
        message: getErrorMessage(e, "Não foi possível interpretar o arquivo."),
      });
    }
  };

  const handleApply = async () => {
    if (!preview) return;
    const items: BudgetImportApplyItemInput[] = preview.proposedItems.map(
      (p) => ({
        stageId: p.suggestedStageId ?? undefined,
        newStageName: p.suggestedStageId
          ? undefined
          : (p.suggestedNewStageName ?? p.groupName),
        totalCents: p.totalCents,
        details:
          p.details.length > 0
            ? p.details.map((d) => ({
                description: d.description,
                unit: d.unit,
                quantity: d.quantity,
                unitPriceCents: d.unitPriceCents,
                amountCents: d.amountCents,
              }))
            : undefined,
      }),
    );
    setStep("applying");
    try {
      const result = await applyBudgetImport(projectId, items);
      showToast({
        title: "Orçamento importado",
        message: `${result.budgetsUpserted} etapa(s) orçada(s)${result.stagesCreated > 0 ? ` · ${result.stagesCreated} criada(s)` : ""}.`,
        tone: "success",
      });
      onApplied?.();
      handleClose();
    } catch (e) {
      setStep("preview");
      setError({
        kind: "generic",
        message: getErrorMessage(e, "Não foi possível aplicar o orçamento."),
      });
    }
  };

  const proposedTotal =
    preview?.proposedItems.reduce((acc, p) => acc + p.totalCents, 0) ?? 0;

  // ---- Painéis de erro (dentro do modal) ----------------------------------

  const renderPlanError = (lim: BudgetAiImportLimit | null) => {
    // Limite mensal estourado num plano que PERMITE (ex.: PRO 3/mês): ver
    // planos não ajuda — só fechar.
    if (lim && lim.limit > 0) {
      const resets = formatResetDate(lim.resetsAt);
      return (
        <ErrorPanel
          icon="hourglass-bottom"
          iconColor={WARN}
          title="Limite mensal atingido"
          body={`Você já usou ${lim.used} de ${lim.limit} importações por IA neste projeto este mês.${resets ? ` O limite renova em ${resets}.` : ""}`}
          actions={[
            { label: "Fechar", variant: "ghost", onPress: handleClose },
          ]}
        />
      );
    }

    // Plano não cobre. Se a assinatura é gerenciada em OUTRA plataforma
    // (ex.: assinou no PC/site, ou em outra loja), não dá pra gerenciar aqui:
    // mostra só "Fechar" + a orientação de onde gerenciar.
    const managed = getManagedElsewhereCopy(plan?.provider ?? null);
    if (managed) {
      return (
        <ErrorPanel
          icon="devices"
          iconColor={PRIMARY}
          title={managed.title}
          body={managed.body}
          actions={[
            { label: "Fechar", variant: "ghost", onPress: handleClose },
          ]}
        />
      );
    }

    // Sem assinatura, ou assinatura gerenciável neste dispositivo: ver planos.
    return (
      <ErrorPanel
        icon="workspace-premium"
        iconColor={PRIMARY}
        title="Sua assinatura não cobre importação de orçamento por IA"
        body="A importação de orçamento por IA está disponível no plano PRO. Veja os planos para liberar."
        actions={[
          {
            label: "Ver planos",
            variant: "primary",
            icon: "workspace-premium",
            onPress: goToPlans,
          },
          { label: "Fechar", variant: "ghost", onPress: handleClose },
        ]}
      />
    );
  };

  return (
    <AppModal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            disabled={step === "loading" || step === "applying"}
          >
            <MaterialIcons name="close" size={22} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Importar orçamento</Text>
          <View style={{ width: 36 }} />
        </View>

        {step === "loading" || step === "applying" ? (
          <View style={styles.center}>
            <ActivityIndicator color={PRIMARY} size="large" />
            <Text style={styles.loadingText}>
              {step === "loading"
                ? "A IA está lendo sua planilha…"
                : "Aplicando o orçamento…"}
            </Text>
          </View>
        ) : error?.kind === "plan" ? (
          renderPlanError(error.limit)
        ) : error?.kind === "generic" ? (
          <ErrorPanel
            icon="error-outline"
            iconColor={DANGER}
            title="Erro ao ler a planilha"
            body={error.message}
            actions={[
              {
                label: "Escolher outra planilha",
                variant: "primary",
                icon: "refresh",
                onPress: pickAndPreview,
              },
              { label: "Fechar", variant: "ghost", onPress: handleClose },
            ]}
          />
        ) : step === "preview" && preview ? (
          <>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.fileChip}>
                <MaterialIcons name="description" size={16} color={PRIMARY} />
                <Text style={styles.fileName} numberOfLines={1}>
                  {fileName}
                </Text>
              </View>

              {preview.warnings.length > 0 && (
                <View style={styles.warnBox}>
                  {preview.warnings.slice(0, 6).map((w, i) => (
                    <View key={i} style={styles.warnRow}>
                      <MaterialIcons
                        name="warning-amber"
                        size={14}
                        color={WARN}
                      />
                      <Text style={styles.warnText}>{w.message}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.sectionLabel}>
                {preview.proposedItems.length} grupo(s) · total{" "}
                {formatCentsBRL(proposedTotal)}
              </Text>

              {preview.proposedItems.map((p, i) => (
                <View key={i} style={styles.itemCard}>
                  <View style={styles.itemTop}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {p.groupName}
                    </Text>
                    <Text style={styles.itemValue}>
                      {formatCentsBRL(p.totalCents)}
                    </Text>
                  </View>
                  <View style={styles.itemTargetRow}>
                    <MaterialIcons
                      name={p.suggestedStageId ? "link" : "add-circle-outline"}
                      size={14}
                      color={p.suggestedStageId ? SUCCESS_GREEN : PRIMARY}
                    />
                    <Text style={styles.itemTarget} numberOfLines={1}>
                      {p.suggestedStageId
                        ? "Etapa existente"
                        : `Nova etapa: ${p.suggestedNewStageName ?? p.groupName}`}
                    </Text>
                    {p.details.length > 0 && (
                      <Text style={styles.itemDetailsCount}>
                        · {p.details.length} itens
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={pickAndPreview}
              >
                <Text style={styles.secondaryText}>Trocar arquivo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleApply}
                activeOpacity={0.88}
              >
                <MaterialIcons name="check" size={18} color="#FFFFFF" />
                <Text style={styles.primaryText}>Aplicar orçamento</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* idle */
          <View style={styles.center}>
            <View style={styles.idleIcon}>
              <MaterialIcons name="upload-file" size={34} color={PRIMARY} />
            </View>
            <Text style={styles.idleTitle}>
              Importe sua planilha de orçamento
            </Text>
            <Text style={styles.idleText}>
              Suba um arquivo .xlsx. A IA identifica os grupos e encaixa cada um
              na etapa correta — você confere antes de aplicar.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtnWide}
              onPress={pickAndPreview}
              activeOpacity={0.88}
            >
              <MaterialIcons name="folder-open" size={18} color="#FFFFFF" />
              <Text style={styles.primaryText}>Escolher planilha</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </AppModal>
  );
}

// ---- Painel de erro reutilizável ------------------------------------------

interface PanelAction {
  label: string;
  onPress: () => void;
  variant: "primary" | "ghost";
  icon?: keyof typeof MaterialIcons.glyphMap;
}

function ErrorPanel({
  icon,
  iconColor,
  title,
  body,
  actions,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor: string;
  title: string;
  body: string;
  actions: PanelAction[];
}) {
  return (
    <View style={styles.center}>
      <View style={[styles.idleIcon, { backgroundColor: "#F4F6FB" }]}>
        <MaterialIcons name={icon} size={34} color={iconColor} />
      </View>
      <Text style={styles.idleTitle}>{title}</Text>
      <Text style={styles.idleText}>{body}</Text>
      <View style={styles.panelActions}>
        {actions.map((a) => (
          <TouchableOpacity
            key={a.label}
            style={
              a.variant === "primary" ? styles.primaryBtnWide : styles.ghostBtn
            }
            onPress={a.onPress}
            activeOpacity={0.85}
          >
            {a.icon && (
              <MaterialIcons name={a.icon} size={18} color="#FFFFFF" />
            )}
            <Text
              style={
                a.variant === "primary" ? styles.primaryText : styles.ghostText
              }
            >
              {a.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function formatResetDate(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 14,
  },
  loadingText: { fontSize: 14, color: "#6B7280", fontWeight: "600" },
  idleIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#EFF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  idleTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  idleText: {
    fontSize: 13.5,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  panelActions: { alignSelf: "stretch", gap: 10, marginTop: 4 },
  primaryBtnWide: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 28,
  },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
  },
  ghostText: { fontSize: 14, fontWeight: "700", color: "#6B7280" },
  scroll: { padding: 16, paddingBottom: 24 },
  fileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "#EFF4FF",
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 14,
    maxWidth: "100%",
  },
  fileName: {
    fontSize: 12.5,
    fontWeight: "600",
    color: PRIMARY,
    maxWidth: 240,
  },
  warnBox: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    padding: 12,
    gap: 7,
    marginBottom: 14,
  },
  warnRow: { flexDirection: "row", gap: 7, alignItems: "flex-start" },
  warnText: { flex: 1, fontSize: 12, color: "#92400E", lineHeight: 17 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: "#EEF1F5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  itemName: { flex: 1, fontSize: 14, fontWeight: "700", color: "#111827" },
  itemValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    fontVariant: ["tabular-nums"],
  },
  itemTargetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 7,
  },
  itemTarget: { fontSize: 12, color: "#6B7280", flexShrink: 1 },
  itemDetailsCount: { fontSize: 12, color: "#9CA3AF" },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  secondaryBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  secondaryText: { fontSize: 14, fontWeight: "700", color: "#6B7280" },
  primaryBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: PRIMARY,
  },
  primaryText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
});
