import { useSubscription } from "@/contexts/subscription-context";
import { ApiError, getErrorMessage } from "@/services/api";
import {
  isMsProjectImportRequiresProError,
  previewMsProjectImport,
  type MsProjectImportPreview,
  type MsProjectImportPreviewActivity,
  type MsProjectImportPreviewStage,
} from "@/services/ms-project-imports.service";
import type { CreateStageBatchItemDto } from "@/services/stages.service";
import { getManagedElsewhereCopy } from "@/utils/subscription-cross-platform";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppModal } from "@/components/ui/app-modal";

const PRIMARY = "#2563EB";
const DANGER = "#EF4444";
const WARN = "#B45309";
const SUCCESS = "#16A34A";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

type Step = "idle" | "loading" | "preview" | "applying";
type ImportError = { kind: "plan"; message: string } | { kind: "generic"; message: string };

interface EditableActivity extends MsProjectImportPreviewActivity {
  included: boolean;
  editedName: string;
}

interface EditableStage extends Omit<MsProjectImportPreviewStage, "activities"> {
  included: boolean;
  editedName: string;
  activities: EditableActivity[];
}

interface Props {
  visible: boolean;
  projectId: string;
  onClose: () => void;
  onApply: (stages: CreateStageBatchItemDto[]) => Promise<void>;
}

function toEditable(preview: MsProjectImportPreview): EditableStage[] {
  return preview.stages.map((stage) => ({
    ...stage,
    included: true,
    editedName: stage.name,
    activities: stage.activities.map((activity) => ({
      ...activity,
      included: true,
      editedName: activity.name,
    })),
  }));
}

function buildPayload(stages: EditableStage[]): CreateStageBatchItemDto[] {
  return stages
    .filter((stage) => stage.included && stage.editedName.trim().length > 0)
    .map((stage) => {
      const activities = stage.activities
        .filter((activity) => activity.included && activity.editedName.trim().length > 0)
        .map((activity) => ({
          name: activity.editedName.trim().slice(0, 120),
          description: activity.description,
          status: activity.inferredStatus,
          startDate: activity.startDate,
          dueDate: activity.dueDate,
        }));

      return {
        name: stage.editedName.trim().slice(0, 120),
        description: stage.description ?? undefined,
        activities: activities.length > 0 ? { activities } : undefined,
      };
    });
}

function formatDate(iso: string | null): string {
  if (!iso) return "sem data";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "sem data";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function statusLabel(status: EditableActivity["inferredStatus"]) {
  if (status === "DONE") return "Concluida";
  if (status === "IN_PROGRESS") return "Em andamento";
  return "Pendente";
}

export function MsProjectImportModal({
  visible,
  projectId,
  onClose,
  onApply,
}: Props) {
  const { plan } = useSubscription();
  const [step, setStep] = useState<Step>("idle");
  const [preview, setPreview] = useState<MsProjectImportPreview | null>(null);
  const [stages, setStages] = useState<EditableStage[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<ImportError | null>(null);

  const reset = () => {
    setStep("idle");
    setPreview(null);
    setStages([]);
    setFileName("");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const goToPlans = () => {
    handleClose();
    router.push("/subscription/plans");
  };

  const totals = useMemo(() => {
    let stagesCount = 0;
    let activitiesCount = 0;
    for (const stage of stages) {
      if (!stage.included || stage.editedName.trim().length === 0) continue;
      stagesCount++;
      for (const activity of stage.activities) {
        if (activity.included && activity.editedName.trim().length > 0) {
          activitiesCount++;
        }
      }
    }
    return { stagesCount, activitiesCount };
  }, [stages]);

  const pickAndPreview = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/xml", "text/xml"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.[0]) return;

      const file = res.assets[0];
      if (!file.name.toLowerCase().endsWith(".xml")) {
        setError({
          kind: "generic",
          message:
            "Apenas arquivos .xml exportados do MS Project sao aceitos. Para .mpp, use Arquivo > Salvar como > XML (*.xml) no MS Project.",
        });
        return;
      }
      if (typeof file.size === "number" && file.size > MAX_FILE_BYTES) {
        setError({ kind: "generic", message: "O arquivo excede o limite de 10 MB." });
        return;
      }

      setFileName(file.name);
      setError(null);
      setStep("loading");
      const data = await previewMsProjectImport(projectId, {
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
      });
      setPreview(data);
      setStages(toEditable(data));
      setStep("preview");
    } catch (e) {
      setStep("idle");
      if (isMsProjectImportRequiresProError(e) || (e instanceof ApiError && e.status === 403)) {
        setError({
          kind: "plan",
          message: getErrorMessage(
            e,
            "A importacao de arquivos do Microsoft Project esta disponivel apenas no plano Profissional.",
          ),
        });
        return;
      }
      setError({
        kind: "generic",
        message: getErrorMessage(e, "Nao foi possivel ler o arquivo do MS Project."),
      });
    }
  };

  const handleApply = async () => {
    if (totals.stagesCount === 0) {
      setError({ kind: "generic", message: "Selecione pelo menos uma etapa com nome para importar." });
      return;
    }

    setStep("applying");
    setError(null);
    try {
      await onApply(buildPayload(stages));
      handleClose();
    } catch (e) {
      setStep("preview");
      if (e instanceof ApiError && (e.status === 403 || e.status === 409)) {
        setError({ kind: "plan", message: getErrorMessage(e, "Sua assinatura nao cobre esta acao.") });
        return;
      }
      setError({
        kind: "generic",
        message: getErrorMessage(e, "Nao foi possivel importar o planejamento."),
      });
    }
  };

  const toggleStage = (uid: number | null, included: boolean) => {
    setStages((prev) =>
      prev.map((stage) =>
        stage.uid === uid
          ? {
              ...stage,
              included,
              activities: stage.activities.map((activity) => ({
                ...activity,
                included: included ? activity.included : false,
              })),
            }
          : stage,
      ),
    );
  };

  const updateStageName = (uid: number | null, name: string) => {
    setStages((prev) =>
      prev.map((stage) => (stage.uid === uid ? { ...stage, editedName: name } : stage)),
    );
  };

  const toggleActivity = (stageUid: number | null, activityUid: number, included: boolean) => {
    setStages((prev) =>
      prev.map((stage) =>
        stage.uid === stageUid
          ? {
              ...stage,
              activities: stage.activities.map((activity) =>
                activity.uid === activityUid ? { ...activity, included } : activity,
              ),
            }
          : stage,
      ),
    );
  };

  const updateActivityName = (stageUid: number | null, activityUid: number, name: string) => {
    setStages((prev) =>
      prev.map((stage) =>
        stage.uid === stageUid
          ? {
              ...stage,
              activities: stage.activities.map((activity) =>
                activity.uid === activityUid
                  ? { ...activity, editedName: name }
                  : activity,
              ),
            }
          : stage,
      ),
    );
  };

  const renderPlanError = (message: string) => {
    const managed = getManagedElsewhereCopy(plan?.provider ?? null);
    if (managed) {
      return (
        <ErrorPanel
          icon="devices"
          iconColor={PRIMARY}
          title={managed.title}
          body={managed.body}
          actions={[{ label: "Fechar", variant: "ghost", onPress: handleClose }]}
        />
      );
    }

    return (
      <ErrorPanel
        icon="workspace-premium"
        iconColor={PRIMARY}
        title="Sua assinatura nao cobre esta acao"
        body={message}
        actions={[
          { label: "Ver planos", variant: "primary", icon: "workspace-premium", onPress: goToPlans },
          { label: "Fechar", variant: "ghost", onPress: handleClose },
        ]}
      />
    );
  };

  const busy = step === "loading" || step === "applying";

  return (
    <AppModal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose} disabled={busy}>
            <MaterialIcons name="close" size={22} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Importar MS Project</Text>
          <View style={{ width: 36 }} />
        </View>

        {busy ? (
          <View style={styles.center}>
            <ActivityIndicator color={PRIMARY} size="large" />
            <Text style={styles.loadingText}>
              {step === "loading" ? "Lendo arquivo do MS Project..." : "Criando etapas..."}
            </Text>
          </View>
        ) : error?.kind === "plan" ? (
          renderPlanError(error.message)
        ) : error?.kind === "generic" ? (
          <ErrorPanel
            icon="error-outline"
            iconColor={DANGER}
            title="Erro na importacao"
            body={error.message}
            actions={[
              { label: "Escolher outro XML", variant: "primary", icon: "refresh", onPress: pickAndPreview },
              { label: "Fechar", variant: "ghost", onPress: handleClose },
            ]}
          />
        ) : step === "preview" && preview ? (
          <>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
              <View style={styles.fileChip}>
                <MaterialIcons name="description" size={16} color={PRIMARY} />
                <Text style={styles.fileName} numberOfLines={1}>
                  {fileName}
                </Text>
              </View>

              {preview.projectMeta.stageLevel !== null && (
                <View style={styles.infoBox}>
                  <MaterialIcons name="info-outline" size={16} color={PRIMARY} />
                  <Text style={styles.infoText}>
                    Distribuido pelo nivel {preview.projectMeta.stageLevel} do MS Project.
                  </Text>
                </View>
              )}

              {preview.warnings.filter((w) => w.code !== "STAGE_LEVEL_AUTO_DETECTED").length > 0 && (
                <View style={styles.warnBox}>
                  {preview.warnings
                    .filter((w) => w.code !== "STAGE_LEVEL_AUTO_DETECTED")
                    .slice(0, 6)
                    .map((warning, index) => (
                      <View key={`${warning.code}-${index}`} style={styles.warnRow}>
                        <MaterialIcons name="warning-amber" size={14} color={WARN} />
                        <Text style={styles.warnText}>
                          {warning.message}
                          {warning.affectedCount ? ` (${warning.affectedCount})` : ""}
                        </Text>
                      </View>
                    ))}
                </View>
              )}

              <Text style={styles.sectionLabel}>
                {totals.stagesCount} etapa(s) e {totals.activitiesCount} atividade(s)
              </Text>

              {stages.map((stage) => (
                <StagePreviewCard
                  key={stage.uid ?? "default"}
                  stage={stage}
                  onToggle={(value) => toggleStage(stage.uid, value)}
                  onRename={(value) => updateStageName(stage.uid, value)}
                  onToggleActivity={(uid, value) => toggleActivity(stage.uid, uid, value)}
                  onRenameActivity={(uid, value) => updateActivityName(stage.uid, uid, value)}
                />
              ))}
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={pickAndPreview}>
                <Text style={styles.secondaryText}>Trocar arquivo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, totals.stagesCount === 0 && styles.primaryBtnDisabled]}
                onPress={handleApply}
                disabled={totals.stagesCount === 0}
                activeOpacity={0.88}
              >
                <MaterialIcons name="check" size={18} color="#FFFFFF" />
                <Text style={styles.primaryText}>Importar</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.center}>
            <View style={styles.idleIcon}>
              <MaterialIcons name="upload-file" size={34} color={PRIMARY} />
            </View>
            <Text style={styles.idleTitle}>Importe o cronograma</Text>
            <Text style={styles.idleText}>
              Envie um arquivo .xml exportado do Microsoft Project. O app cria etapas e atividades depois da sua revisao.
            </Text>
            <TouchableOpacity style={styles.primaryBtnWide} onPress={pickAndPreview} activeOpacity={0.88}>
              <MaterialIcons name="folder-open" size={18} color="#FFFFFF" />
              <Text style={styles.primaryText}>Escolher XML</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </AppModal>
  );
}

function StagePreviewCard({
  stage,
  onToggle,
  onRename,
  onToggleActivity,
  onRenameActivity,
}: {
  stage: EditableStage;
  onToggle: (value: boolean) => void;
  onRename: (value: string) => void;
  onToggleActivity: (uid: number, value: boolean) => void;
  onRenameActivity: (uid: number, value: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <View style={[styles.stageCard, !stage.included && styles.disabledCard]}>
      <View style={styles.stageHeader}>
        <Switch value={stage.included} onValueChange={onToggle} trackColor={{ true: "#BFDBFE" }} thumbColor={stage.included ? PRIMARY : "#F4F4F5"} />
        <TouchableOpacity style={styles.expandBtn} onPress={() => setExpanded((prev) => !prev)}>
          <MaterialIcons name={expanded ? "expand-more" : "chevron-right"} size={22} color="#6B7280" />
        </TouchableOpacity>
        <TextInput
          value={stage.editedName}
          onChangeText={onRename}
          editable={stage.included}
          placeholder="Nome da etapa"
          maxLength={120}
          style={styles.stageInput}
        />
        <Text style={styles.countText}>
          {stage.activities.filter((activity) => activity.included).length}/{stage.activities.length}
        </Text>
      </View>

      {expanded && stage.activities.length > 0 && (
        <View style={styles.activities}>
          {stage.activities.map((activity) => (
            <ActivityRow
              key={activity.uid}
              activity={activity}
              disabled={!stage.included}
              onToggle={(value) => onToggleActivity(activity.uid, value)}
              onRename={(value) => onRenameActivity(activity.uid, value)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function ActivityRow({
  activity,
  disabled,
  onToggle,
  onRename,
}: {
  activity: EditableActivity;
  disabled: boolean;
  onToggle: (value: boolean) => void;
  onRename: (value: string) => void;
}) {
  const inactive = disabled || !activity.included;
  return (
    <View style={[styles.activityRow, inactive && styles.disabledCard]}>
      <View style={styles.activityTop}>
        <Switch
          value={activity.included}
          onValueChange={onToggle}
          disabled={disabled}
          trackColor={{ true: "#BBF7D0" }}
          thumbColor={activity.included ? SUCCESS : "#F4F4F5"}
        />
        <TextInput
          value={activity.editedName}
          onChangeText={onRename}
          editable={!inactive}
          placeholder="Nome da atividade"
          maxLength={120}
          style={styles.activityInput}
        />
      </View>
      <View style={styles.activityMeta}>
        <Text style={styles.statusChip}>{statusLabel(activity.inferredStatus)}</Text>
        <Text style={styles.dateText}>
          {formatDate(activity.startDate)} - {formatDate(activity.dueDate)}
        </Text>
        {activity.nameWasTruncated && <Text style={styles.truncatedChip}>nome truncado</Text>}
      </View>
    </View>
  );
}

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
        {actions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={action.variant === "primary" ? styles.primaryBtnWide : styles.ghostBtn}
            onPress={action.onPress}
            activeOpacity={0.85}
          >
            {action.icon && <MaterialIcons name={action.icon} size={18} color="#FFFFFF" />}
            <Text style={action.variant === "primary" ? styles.primaryText : styles.ghostText}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
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
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
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
  idleTitle: { fontSize: 17, fontWeight: "800", color: "#111827", textAlign: "center" },
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
    marginBottom: 12,
    maxWidth: "100%",
  },
  fileName: { fontSize: 12.5, fontWeight: "700", color: PRIMARY, maxWidth: 260 },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  infoText: { flex: 1, fontSize: 12, color: "#1D4ED8", lineHeight: 17 },
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
    fontWeight: "800",
    color: "#6B7280",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  stageCard: {
    borderWidth: 1,
    borderColor: "#EEF1F5",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  disabledCard: { opacity: 0.58 },
  stageHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  expandBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  stageInput: {
    flex: 1,
    minHeight: 38,
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  countText: { fontSize: 11, fontWeight: "800", color: "#9CA3AF" },
  activities: { marginTop: 10, gap: 8, paddingLeft: 8 },
  activityRow: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 10 },
  activityTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  activityInput: {
    flex: 1,
    minHeight: 36,
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  activityMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    marginLeft: 56,
  },
  statusChip: {
    fontSize: 10,
    fontWeight: "800",
    color: "#374151",
    backgroundColor: "#E5E7EB",
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 3,
    textTransform: "uppercase",
  },
  dateText: { fontSize: 11, color: "#6B7280", fontWeight: "600" },
  truncatedChip: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E",
    backgroundColor: "#FEF3C7",
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
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
  secondaryText: { fontSize: 14, fontWeight: "800", color: "#6B7280" },
  primaryBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: PRIMARY,
  },
  primaryBtnDisabled: { backgroundColor: "#94A3B8" },
  primaryText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
});
