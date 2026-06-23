import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  Stack,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useProjects } from "@/contexts/projects-context";
import { useSubscription } from "@/contexts/subscription-context";
import { useSubscriptionGate } from "@/contexts/subscription-gate";
import { useOnboarding } from "@/contexts/onboarding-context";
import {
  getProjectItemLimitMessage,
  PROJECT_ITEM_LIMIT,
} from "@/constants/creation-limits";
import type {
  DocumentSource,
  Etapa,
  Gasto,
  StageStatus,
} from "@/data/obras";
import type { StageFormValues } from "@/components/projeto/stage-form-modal";
import { useAuth } from "@/hooks/use-auth";
import { useObraData } from "@/hooks/use-obra-data";
import { useResponsive } from "@/hooks/use-responsive";
import { api, getErrorMessage } from "@/services/api";
import type { LocalDocumentAsset } from "@/utils/document-upload";
import {
  isActiveProjectMember,
  mapObraMemberToAccessMember,
} from "@/utils/project-members";
import {
  canEditProject,
  isClientView,
  type ProjectApiRole,
} from "@/utils/project-role";

import { BudgetAdjustmentModal } from "@/components/projeto/budget-adjustment-modal";
import { ExpenseDocumentSheet } from "@/components/projeto/expense-document-sheet";
import { ExpenseFormModal } from "@/components/projeto/expense-form-modal";
import { HoursAdjustmentModal } from "@/components/projeto/hours-adjustment-modal";
import { ProjectSettingsModal } from "@/components/projeto/project-settings-modal";
import { CreateStagesChooserSheet } from "@/components/projeto/create-stages-chooser-sheet";
import { MsProjectImportModal } from "@/components/projeto/ms-project-import-modal";
import { StageActivitiesBatchModal } from "@/components/projeto/stage-activities-batch-modal";
import { StageFlowBatchModal } from "@/components/projeto/stage-flow-batch-modal";
import { StageFormModal } from "@/components/projeto/stage-form-modal";

import {
  ObraViewCliente,
  type ViewerTourRefs,
} from "@/components/obra/obra-view-cliente";
import { ObraViewEng, type EngTourRefs } from "@/components/obra/obra-view-eng";
import { ProjectDetailLoadingScreen } from "@/components/obra/project-detail-loading-screen";
import { ManagerTour } from "@/components/onboarding/manager-tour";
import {
  ViewerTour,
  VIEWER_TOUR_TOTAL_STEPS,
} from "@/components/onboarding/viewer-tour";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import {
  activitiesService,
  type BatchCreateActivityItemDto,
} from "@/services/activities.service";
import type { CreateStageBatchItemDto } from "@/services/stages.service";
import { useToast } from "@/components/obra/toast";

// --- Error screen -------------------------------------------------------------
function ErrorScreen({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.centerContainer}>
        <MaterialIcons
          name="error-outline"
          size={48}
          color={colors.iconMuted}
        />
        <Text style={styles.errorTitle}>Erro ao carregar</Text>
        <Text style={styles.errorText}>{message}</Text>

        <TouchableOpacity
          style={styles.retryBtn}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <MaterialIcons name="refresh" size={18} color={colors.white} />
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// --- Main ---------------------------------------------------------------------
export default function ObraDetalheScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { isTablet } = useResponsive();
  const bottomPad = useMemo(() => insets.bottom + spacing[16], [insets.bottom]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { backendUserId } = useAuth();
  const {
    managerTourStep,
    managerTourCompleted,
    startManagerTour,
    advanceManagerTour,
    skipManagerTour,
    isViewerTourDone,
    completeViewerTour,
  } = useOnboarding();

  // Tour refs - created here so ManagerTour and ObraViewEng share the same instances
  const heroRef = useRef<View>(null);
  const diaryButtonRef = useRef<View>(null);
  const tasksTabRef = useRef<View>(null);
  const gastosTabRef = useRef<View>(null);
  const documentosTabRef = useRef<View>(null);
  const shareButtonRef = useRef<View>(null);
  const reportButtonRef = useRef<View>(null);
  const engTourRefs: EngTourRefs = {
    heroRef, diaryButtonRef,
    tasksTabRef, gastosTabRef, documentosTabRef,
    shareButtonRef, reportButtonRef,
  };
  const viewerOverviewRef = useRef<View>(null);
  const viewerDiaryButtonRef = useRef<View>(null);
  const viewerGalleryTabRef = useRef<View>(null);
  const viewerDocumentsTabRef = useRef<View>(null);
  const viewerExpensesTabRef = useRef<View>(null);
  const viewerTasksTabRef = useRef<View>(null);
  const viewerBottomTabsRef = useRef<View>(null);
  const viewerTourRefs: ViewerTourRefs = {
    overviewRef: viewerOverviewRef,
    diaryButtonRef: viewerDiaryButtonRef,
    galleryTabRef: viewerGalleryTabRef,
    documentsTabRef: viewerDocumentsTabRef,
    expensesTabRef: viewerExpensesTabRef,
    tasksTabRef: viewerTasksTabRef,
    bottomTabsRef: viewerBottomTabsRef,
  };

  // Programmatic share modal control (tour opens/closes it during step 5->6)
  const shareControlRef = useRef<{ open: () => void; close: () => void } | null>(null);

  // Tour-driven tab override: ManagerTour calls onSwitchTab -> sets this -> ObraViewEng reacts
  const [tourTabOverride, setTourTabOverride] = useState<string | null>(null);
  const [viewerTourTabOverride, setViewerTourTabOverride] = useState<string | null>(null);
  const [viewerTourStep, setViewerTourStep] = useState(-1);
  const [shouldOpenShareAfterTour, setShouldOpenShareAfterTour] =
    useState(false);
  const [isTourSharePreviewOpen, setIsTourSharePreviewOpen] = useState(false);

  const handleTourSkip = useCallback(() => {
    shareControlRef.current?.close();
    setShouldOpenShareAfterTour(false);
    setIsTourSharePreviewOpen(false);
    void skipManagerTour();
  }, [skipManagerTour]);

  const handleViewerTourSkip = useCallback(() => {
    setViewerTourStep(-1);
    void completeViewerTour();
  }, [completeViewerTour]);

  const handleViewerTourAdvance = useCallback(() => {
    setViewerTourStep((prev) => {
      const next = prev + 1;
      if (next >= VIEWER_TOUR_TOTAL_STEPS) {
        void completeViewerTour();
        return -1;
      }
      return next;
    });
  }, [completeViewerTour]);

  useEffect(() => {
    if (!shouldOpenShareAfterTour) return;
    if (managerTourStep !== 6) return;

    const timer = setTimeout(() => {
      setIsTourSharePreviewOpen(true);
      shareControlRef.current?.open();
      setShouldOpenShareAfterTour(false);
    }, 120);

    return () => clearTimeout(timer);
  }, [managerTourStep, shouldOpenShareAfterTour]);

  // Hide tour while navigating to sub-screens (e.g. report) so the Modal doesn't float on top
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  useFocusEffect(useCallback(() => {
    setIsScreenFocused(true);
    return () => setIsScreenFocused(false);
  }, []));

  // Controls iOS swipe-back gesture: disabled on secondary tabs
  const [isOnPrimaryTab, setIsOnPrimaryTab] = useState(true);

  // Modals state
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showStageChooser, setShowStageChooser] = useState(false);
  const [showStageFlow, setShowStageFlow] = useState(false);
  const [showMsProjectImport, setShowMsProjectImport] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showHoursModal, setShowHoursModal] = useState(false);

  const [editingStage, setEditingStage] = useState<Etapa | undefined>(undefined);
  const [stageForInitialActivities, setStageForInitialActivities] =
    useState<Etapa | null>(null);
  const [editingExpense, setEditingExpense] = useState<Gasto | undefined>(
    undefined,
  );

  // Document sheet state
  const [docSheetExpense, setDocSheetExpense] = useState<Gasto | null>(null);
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  const [projectDocumentsRefreshSignal, setProjectDocumentsRefreshSignal] =
    useState(0);

  const handleDocumentsPress = useCallback((expense: Gasto) => {
    setDocSheetExpense(expense);
  }, []);

  const handleDocumentCountChange = useCallback(
    (expenseId: string, count: number) => {
      setDocCounts((prev) => ({ ...prev, [expenseId]: count }));
    },
    [],
  );

  const { obras, updateObra, deleteObra } = useProjects();
  const { refresh: refreshSubscription } = useSubscription();
  const { requireSubscription } = useSubscriptionGate();

  const {
    obra,
    expenseReceiptDocuments,
    loading,
    error,
    refresh,
    addStage,
    addStagesBatch,
    updateStage,
    completeStageActivities,
    deleteStage,
    reorderStages,
    addExpense,
    updateExpense,
    setExpenseReceiptState,
    syncExpenseReceiptsFromDocuments,
    deleteExpense,
    deleteAllExpenses,
    updateBudget,
    updateTrackFinancial,
    isExpenseLoading,
    creatingExpenseId,
  } = useObraData(id!);

  const handleExpenseDocumentsSync = useCallback(
    (
      expenseId: string,
      documents: { id: string; status: string; viewUrl?: string }[],
    ) => {
      const primaryReadyDocument =
        documents.find((document) => document.status === "READY") ??
        documents[0] ??
        null;

      setExpenseReceiptState(expenseId, {
        receiptDocumentId: primaryReadyDocument?.id ?? null,
        receiptUrl: primaryReadyDocument?.viewUrl ?? null,
        documentCount: documents.length,
      });
      setProjectDocumentsRefreshSignal((prev) => prev + 1);
    },
    [setExpenseReceiptState],
  );

  const handleExpenseReceiptStateChange = useCallback(
    (
      expenseId: string,
      receipt: { receiptDocumentId: string | null; documentCount?: number },
    ) => {
      setExpenseReceiptState(expenseId, {
        receiptDocumentId: receipt.receiptDocumentId,
        documentCount: receipt.documentCount,
      });

      if (typeof receipt.documentCount === "number") {
        setDocCounts((prev) => ({
          ...prev,
          [expenseId]: receipt.documentCount ?? 0,
        }));
      }
      setProjectDocumentsRefreshSignal((prev) => prev + 1);
    },
    [setExpenseReceiptState],
  );

  const handleProjectDocumentsChanged = useCallback(
    (
      documents: {
        id: string;
        expenseId: string | null;
        status: string;
        viewUrl?: string;
      }[],
    ) => {
      syncExpenseReceiptsFromDocuments(documents);
    },
    [syncExpenseReceiptsFromDocuments],
  );

  const handleProjectDocumentRemoved = useCallback(
    (document: { id: string; expenseId: string | null }) => {
      if (!document.expenseId) return;

      const currentExpense = obraView?.gastos?.find(
        (expense: Gasto) => expense.id === document.expenseId,
      );
      const currentCount =
        docCounts[document.expenseId] ??
        currentExpense?.documentCount ??
        1;
      const nextCount = Math.max(currentCount - 1, 0);

      setExpenseReceiptState(document.expenseId, {
        receiptDocumentId:
          currentExpense?.receiptDocumentId === document.id
            ? null
            : currentExpense?.receiptDocumentId ?? null,
        receiptUrl:
          currentExpense?.receiptDocumentId === document.id
            ? null
            : currentExpense?.receiptUrl ?? null,
        documentCount: nextCount,
      });

      setDocCounts((prev) => ({
        ...prev,
        [document.expenseId!]: nextCount,
      }));
      setProjectDocumentsRefreshSignal((prev) => prev + 1);
    },
    [docCounts, obraView?.gastos, setExpenseReceiptState],
  );

  const [obraOverride, setObraOverride] = useState<any | null>(null);
  const [isConcluding, setIsConcluding] = useState(false);

  // Refresh ao voltar de outra tela (ex: diário de obra) para atualizar horas realizadas
  const initialFocusDone = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (initialFocusDone.current) {
        refresh();
      }
      initialFocusDone.current = true;
    }, [refresh]),
  );

  useEffect(() => {
    // sempre que mudar de obra, limpa override
    setObraOverride(null);
  }, [obra?.id, id]);

  const obraView = (obraOverride ?? obra) as any;

  useEffect(() => {
    if (!obraView?.gastos?.length) {
      if (docSheetExpense) setDocSheetExpense(null);
      if (editingExpense) setEditingExpense(undefined);
      return;
    }

    if (docSheetExpense) {
      const nextExpense = obraView.gastos.find(
        (expense: Gasto) => expense.id === docSheetExpense.id,
      );
      if (!nextExpense) {
        setDocSheetExpense(null);
      } else if (nextExpense !== docSheetExpense) {
        setDocSheetExpense(nextExpense);
      }
    }

    if (editingExpense) {
      const nextExpense = obraView.gastos.find(
        (expense: Gasto) => expense.id === editingExpense.id,
      );
      if (!nextExpense) {
        setEditingExpense(undefined);
        setShowExpenseModal(false);
      } else if (nextExpense !== editingExpense) {
        setEditingExpense(nextExpense);
      }
    }
  }, [docSheetExpense, editingExpense, obraView?.gastos]);

  // Sincroniza qualquer mudança do detalhe (tarefas, gastos, settings)
  // de volta ao contexto global - a lista reflete sem precisar de GET
  useEffect(() => {
    if (!obra) return;
    updateObra(obra.id, obra);
  }, [obra, updateObra]);
  const cachedObra = useMemo(
    () => obras.find((item) => item.id === id),
    [id, obras],
  );
  const projectMembersSource = useMemo(
    () =>
      obraView?.members?.length
        ? obraView.members
        : obra?.members?.length
          ? obra.members
          : cachedObra?.members ?? [],
    [cachedObra?.members, obra?.members, obraView?.members],
  );
  const projectMembers = useMemo(
    () =>
      projectMembersSource
        .filter((member: any) => isActiveProjectMember(member))
        .map((member: any) => mapObraMemberToAccessMember(member, backendUserId)),
    [projectMembersSource, backendUserId],
  );
  const loadingRole = (cachedObra?.myRole ?? null) as ProjectApiRole;
  const loadingVariant =
    loadingRole == null
      ? "generic"
      : isClientView(loadingRole)
        ? "cliente"
        : "responsavel";
  const currentProjectRole = (obraView?.myRole ??
    obra?.myRole ??
    null) as ProjectApiRole;
  const currentIsCliente = isClientView(currentProjectRole);
  const hasProjectRole = currentProjectRole != null;
  const shouldShowManagerTour = hasProjectRole && !currentIsCliente;
  const shouldShowViewerTour = currentIsCliente;

  useEffect(() => {
    if (
      shouldShowManagerTour &&
      !managerTourCompleted &&
      managerTourStep === -1 &&
      !loading &&
      !!obra
    ) {
      void startManagerTour();
    }
  }, [
    loading,
    managerTourCompleted,
    managerTourStep,
    obra,
    shouldShowManagerTour,
    startManagerTour,
  ]);

  useEffect(() => {
    if (
      shouldShowViewerTour &&
      !isViewerTourDone &&
      viewerTourStep === -1 &&
      !loading &&
      !!obra
    ) {
      setViewerTourStep(0);
    }
  }, [
    isViewerTourDone,
    loading,
    obra,
    shouldShowViewerTour,
    viewerTourStep,
  ]);

  // Guards
  if (loading && !obra) return <ProjectDetailLoadingScreen variant={loadingVariant} />;
  if (error && !obra) return <ErrorScreen message={error} onRetry={refresh} />;
  if (!obra) return null;

  const projectRole = currentProjectRole;

  const isCliente = currentIsCliente;
  const isEng = !isCliente;
  const canEdit = canEditProject(projectRole, obra.status);
  const stageLimitReached =
    (obraView?.etapas?.length ?? 0) >= PROJECT_ITEM_LIMIT;
  const expenseLimitReached =
    (obraView?.gastos?.length ?? 0) >= PROJECT_ITEM_LIMIT;

  const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;

  // Navegação
  const handleViewDiary = () =>
    router.push({ pathname: "/diario/[id]", params: { id: obraView.id } });

  // Etapas
  const handleAddStage = () => {
    if (!requireSubscription("criar etapas")) return;
    if (stageLimitReached) {
      Alert.alert("Limite atingido", getProjectItemLimitMessage("etapas"));
      return;
    }
    setShowStageChooser(true);
  };

  const handlePickSingleStage = () => {
    setShowStageChooser(false);
    setEditingStage(undefined);
    setShowStageModal(true);
  };

  const handlePickStageFlow = () => {
    setShowStageChooser(false);
    setShowStageFlow(true);
  };

  const handlePickMsProjectImport = () => {
    setShowStageChooser(false);
    setShowMsProjectImport(true);
  };

  const handleSaveStageFlow = async (stages: CreateStageBatchItemDto[]) => {
    try {
      const created = await addStagesBatch(stages);
      setShowStageFlow(false);
      await refresh();
      showToast({
        title: `${created.length} etapa${created.length !== 1 ? "s" : ""} criada${created.length !== 1 ? "s" : ""}`,
        tone: "success",
      });
    } catch (e: unknown) {
      Alert.alert(
        "Erro",
        getErrorMessage(e, "Não foi possível criar as etapas."),
      );
      throw e;
    }
  };

  const handleApplyMsProjectImport = async (stages: CreateStageBatchItemDto[]) => {
    const stageCount = stages.length;
    await addStagesBatch(stages);
    await refresh();
    showToast({
      title: `${stageCount} etapa${stageCount !== 1 ? "s" : ""} importada${stageCount !== 1 ? "s" : ""}`,
      tone: "success",
    });
  };

  const handleEditStage = (etapa: Etapa) => {
    setEditingStage(etapa);
    setShowStageModal(true);
  };

  const handleSaveStage = async (values: StageFormValues) => {
    try {
      if (editingStage) {
        await updateStage(editingStage.id, {
          nome: values.nome,
          descricao: values.descricao,
          prioridade: values.prioridade,
          budgetCents: values.budgetCents,
        });
      } else {
        if (stageLimitReached) {
          Alert.alert("Limite atingido", getProjectItemLimitMessage("etapas"));
          return;
        }
        await addStage({
          nome: values.nome,
          descricao: values.descricao,
          prioridade: values.prioridade,
          budgetCents: values.budgetCents,
        });
      }
      setShowStageModal(false);
      setEditingStage(undefined);
    } catch (e: unknown) {
      Alert.alert("Erro", getErrorMessage(e, "Não foi possível salvar a etapa."));
      throw e;
    }
  };

  const handleSaveStageAndAddActivities = async (values: StageFormValues) => {
    try {
      if (stageLimitReached) {
        Alert.alert("Limite atingido", getProjectItemLimitMessage("etapas"));
        return;
      }
      const created = await addStage({
        nome: values.nome,
        descricao: values.descricao,
        prioridade: values.prioridade,
        budgetCents: values.budgetCents,
      });
      setShowStageModal(false);
      setEditingStage(undefined);
      setStageForInitialActivities(created);
    } catch (e: unknown) {
      Alert.alert(
        "Erro",
        getErrorMessage(e, "Não foi possível salvar a etapa."),
      );
      throw e;
    }
  };

  const handleSaveInitialActivities = async (
    activities: BatchCreateActivityItemDto[],
  ) => {
    if (!stageForInitialActivities) return;
    try {
      const created = await activitiesService.batchCreate(
        stageForInitialActivities.id,
        { activities },
      );
      setStageForInitialActivities(null);
      await refresh();
      showToast({
        title: `${created.length} atividade${created.length !== 1 ? "s" : ""} criada${created.length !== 1 ? "s" : ""}`,
        tone: "success",
      });
    } catch (e: unknown) {
      Alert.alert(
        "Erro",
        getErrorMessage(e, "Não foi possível criar as atividades."),
      );
      throw e;
    }
  };

  const handleCloseInitialActivities = () => {
    setStageForInitialActivities(null);
    void refresh();
  };

  const handleDeleteStage = (stageId: string) => {
    deleteStage(stageId).catch(() => {
      Alert.alert("Erro", "Não foi possível remover a etapa.");
    });
  };

  const handleOpenStage = (etapa: Etapa) => {
    router.push({
      pathname: "/etapa/[stageId]" as any,
      params: {
        stageId: etapa.id,
        projectId: obraView.id,
        name: etapa.nome,
        canEdit: canEdit ? "1" : "0",
      },
    });
  };

  const handleSetStageStatus = (etapa: Etapa, status: StageStatus) => {
    const wasCompleted = etapa.status === "COMPLETED";
    updateStage(etapa.id, { status })
      .then(() => {
        if (status === "COMPLETED" && !wasCompleted) {
          showToast({ title: "Etapa concluída", tone: "success" });
        }
      })
      .catch((e: unknown) => {
        Alert.alert(
          "Erro",
          getErrorMessage(e, "Não foi possível alterar o status da etapa."),
        );
      });
  };

  const handleCompleteStageActivities = async (etapa: Etapa) => {
    try {
      await completeStageActivities(etapa.id);
      showToast({ title: "Etapa concluída", tone: "success" });
    } catch (e: unknown) {
      Alert.alert(
        "Erro",
        getErrorMessage(e, "Não foi possível concluir as atividades."),
      );
    }
  };

  // Expenses
  const handleAddExpense = () => {
    if (expenseLimitReached) {
      Alert.alert("Limite atingido", getProjectItemLimitMessage("gastos"));
      return;
    }

    setEditingExpense(undefined);
    setShowExpenseModal(true);
  };

  const handleEditExpense = (expense: Gasto) => {
    setEditingExpense(expense);
    setShowExpenseModal(true);
  };

  const handleSaveExpense = async (
    expense: Omit<Gasto, "id">,
    pendingDoc?: { asset: LocalDocumentAsset; source: DocumentSource },
  ) => {
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, expense);
      } else {
        if (expenseLimitReached) {
          Alert.alert("Limite atingido", getProjectItemLimitMessage("gastos"));
          return;
        }

        try {
          await addExpense(expense, pendingDoc);
        } catch (e: any) {
          if (e?.message === "UPLOAD_FAILED") {
            Alert.alert(
              "Gasto criado",
              "O comprovante não foi enviado. Tente novamente pela tela de documentos.",
            );
            setShowExpenseModal(false);
            setEditingExpense(undefined);
            return;
          }
          throw e;
        }
      }

      setShowExpenseModal(false);
      setEditingExpense(undefined);
    } catch (e: unknown) {
      Alert.alert("Erro", getErrorMessage(e, "Não foi possível salvar o gasto."));
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    deleteExpense(expenseId).catch(() => {
      Alert.alert("Erro", "Não foi possível remover o gasto.");
    });
  };

  // Budget
  const handleEditBudget = () => setShowBudgetModal(true);
  const handleEditHours = () => setShowHoursModal(true);

  // Track financial - ativa flag via PATCH e abre modal de orçamento
  const handleEnableFinancial = async () => {
    if (!requireSubscription("ativar o acompanhamento financeiro")) return;
    try {
      await updateTrackFinancial(true);
      setShowBudgetModal(true);
    } catch {
      Alert.alert(
        "Erro",
        "Não foi possível ativar o acompanhamento financeiro.",
      );
    }
  };

  // Desativa flag + deleta todos os gastos
  const handleDisableFinancial = () => {
    const expenseCount = obraView.gastos?.length ?? 0;
    const extra =
      expenseCount > 0
        ? ` e excluir ${expenseCount} gasto${expenseCount > 1 ? "s" : ""} registrado${expenseCount > 1 ? "s" : ""}`
        : "";
    Alert.alert(
      "Desativar acompanhamento financeiro",
      `Isso irá desativar o acompanhamento financeiro${extra}. Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desativar",
          style: "destructive",
          onPress: async () => {
            try {
              await Promise.all([
                deleteAllExpenses(),
                updateTrackFinancial(false),
              ]);
            } catch {
              Alert.alert(
                "Erro",
                "Não foi possível desativar o acompanhamento.",
              );
              await refresh();
            }
          },
        },
      ],
    );
  };

  // Deleta todos os gastos (sem desativar o tracking)
  const handleDeleteAllExpenses = () => {
    const count = obraView.gastos?.length ?? 0;
    Alert.alert(
      "Excluir todos os gastos",
      `Isso irá excluir ${count} gasto${count !== 1 ? "s" : ""} registrado${count !== 1 ? "s" : ""}. Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir todos",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAllExpenses();
            } catch {
              Alert.alert("Erro", "Não foi possível excluir os gastos.");
            }
          },
        },
      ],
    );
  };

  // Conclude project directly from 100% banner
  const handleConcludeProject = () => {
    Alert.alert(
      "Concluir obra",
      "Marcar como concluída. Você ainda pode ver o histórico depois.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            setIsConcluding(true);
            try {
              await api.patch(`/projects/${obraView.id}`, {
                status: "COMPLETED",
              });
              await refresh();
              setObraOverride(null);
            } catch {
              Alert.alert("Erro", "Não foi possível concluir o projeto.");
            } finally {
              setIsConcluding(false);
            }
          },
        },
      ],
    );
  };

  // Project (settings)
  const handleEditProject = () => {
    if (!apiBaseUrl) {
      Alert.alert(
        "Config faltando",
        "Defina EXPO_PUBLIC_API_URL no .env para usar PATCH/DELETE.",
      );
      return;
    }
    setShowProjectSettings(true);
  };

  // helper: fecha modal + busca dados frescos + limpa override
  const applyStatusAndClose = async (_p: { status: any }) => {
    setShowProjectSettings(false);
    await refresh(); // busca dados atualizados do backend
    setObraOverride(null); // agora obra tem o status correto mapeado
  };

  return (
    <SafeAreaView
      style={[styles.safe, isTablet && styles.safeTablet]}
      edges={["top"]}
    >
      <Stack.Screen
        options={{
          headerShown: false,
          headerBackButtonMenuEnabled: false,
          gestureEnabled: isOnPrimaryTab,
        }}
      />
      <StatusBar style="dark" />

      {/* Render da view por role */}
      {isCliente && (
        <ObraViewCliente
          obra={obraView}
          expenseReceiptDocuments={expenseReceiptDocuments}
          projectMembers={projectMembers}
          onProjectDocumentsChanged={handleProjectDocumentsChanged}
          onProjectDocumentRemoved={handleProjectDocumentRemoved}
          onViewDiary={handleViewDiary}
          projectRole={projectRole}
          onTabChange={(isPrimary) => setIsOnPrimaryTab(isPrimary)}
          onRefresh={refresh}
          tourRefs={viewerTourRefs}
          activeTabOverride={viewerTourTabOverride}
        />
      )}

      {isEng && (
        <ObraViewEng
          obra={obraView}
          expenseReceiptDocuments={expenseReceiptDocuments}
          projectMembers={projectMembers}
          onProjectDocumentsChanged={handleProjectDocumentsChanged}
          onProjectDocumentRemoved={handleProjectDocumentRemoved}
          projectRole={projectRole}
          onTabChange={(isPrimary) => setIsOnPrimaryTab(isPrimary)}
          onRefresh={refresh}
          onOpenStage={handleOpenStage}
          onAddStage={handleAddStage}
          onEditStage={handleEditStage}
          onDeleteStage={handleDeleteStage}
          onSetStageStatus={handleSetStageStatus}
          onCompleteStageActivities={handleCompleteStageActivities}
          onReorderStages={reorderStages}
          onAddExpense={handleAddExpense}
          onEditExpense={handleEditExpense}
          onDeleteExpense={handleDeleteExpense}
          onDeleteAllExpenses={handleDeleteAllExpenses}
          onEditBudget={handleEditBudget}
          onEditHours={handleEditHours}
          onEditProject={canEdit ? handleEditProject : undefined}
          onConcludeProject={canEdit ? handleConcludeProject : undefined}
          isConcluding={isConcluding}
          onViewDiary={handleViewDiary}
          stageLimitReached={stageLimitReached}
          expenseLimitReached={expenseLimitReached}
          onEnableFinancial={handleEnableFinancial}
          onDisableFinancial={handleDisableFinancial}
          docCounts={docCounts}
          projectDocumentsRefreshSignal={projectDocumentsRefreshSignal}
          onDocumentsPress={handleDocumentsPress}
          isExpenseLoading={isExpenseLoading}
          creatingExpenseId={creatingExpenseId}
          tourRefs={engTourRefs}
          activeTabOverride={tourTabOverride}
          shareControlRef={shareControlRef}
          onShareModalVisibilityChange={(visible) => {
            if (!visible) setIsTourSharePreviewOpen(false);
          }}
        />
      )}

      {/* Fallback defensivo */}
      {!isCliente && !isEng && (
        <View style={[styles.centerContainer, { paddingBottom: bottomPad }]}>
          <MaterialIcons
            name="lock-outline"
            size={44}
            color={colors.iconMuted}
          />
          <Text style={styles.errorTitle}>Acesso não permitido</Text>
          <Text style={styles.errorText}>
            Sua sessão não possui permissão para visualizar esta obra.
          </Text>
        </View>
      )}

      {/* --- Modals ----------------------------------------------------------- */}

      <StageFormModal
        visible={showStageModal}
        stage={editingStage}
        onSave={handleSaveStage}
        onSaveAndAddActivities={handleSaveStageAndAddActivities}
        onClose={() => {
          setShowStageModal(false);
          setEditingStage(undefined);
        }}
      />

      <StageActivitiesBatchModal
        visible={stageForInitialActivities !== null}
        stageName={stageForInitialActivities?.nome ?? ""}
        onSave={handleSaveInitialActivities}
        onSkip={handleCloseInitialActivities}
        onClose={handleCloseInitialActivities}
      />

      <CreateStagesChooserSheet
        visible={showStageChooser}
        onPickSingle={handlePickSingleStage}
        onPickFlow={handlePickStageFlow}
        onPickMsProject={handlePickMsProjectImport}
        onClose={() => setShowStageChooser(false)}
      />

      <StageFlowBatchModal
        visible={showStageFlow}
        onSave={handleSaveStageFlow}
        onClose={() => setShowStageFlow(false)}
      />

      <MsProjectImportModal
        visible={showMsProjectImport}
        projectId={obraView.id}
        onApply={handleApplyMsProjectImport}
        onClose={() => setShowMsProjectImport(false)}
      />

      <ExpenseFormModal
        visible={showExpenseModal}
        expense={editingExpense}
        projectId={obraView.id}
        onReceiptStateChange={handleExpenseReceiptStateChange}
        onSave={handleSaveExpense}
        onDelete={handleDeleteExpense}
        onClose={() => {
          setShowExpenseModal(false);
          setEditingExpense(undefined);
        }}
      />

      <ExpenseDocumentSheet
        visible={!!docSheetExpense}
        projectId={obraView.id}
        expense={docSheetExpense}
        projectRole={projectRole}
        onClose={() => setDocSheetExpense(null)}
        onDocumentCountChange={handleDocumentCountChange}
        onDocumentsSync={handleExpenseDocumentsSync}
      />

      <BudgetAdjustmentModal
        visible={showBudgetModal}
        currentBudget={obraView.orcamento}
        totalInvestido={obraView.totalInvestido}
        onSave={(newBudget) =>
          updateBudget(newBudget, obraView.horasContratadas ?? 0)
        }
        onClose={() => setShowBudgetModal(false)}
      />

      <HoursAdjustmentModal
        visible={showHoursModal}
        currentHorasContratadas={obraView.horasContratadas ?? 0}
        horasRealizadas={obraView.horasRealizadas ?? 0}
        onSave={(newHoras) => updateBudget(obraView.orcamento ?? 0, newHoras)}
        onClose={() => setShowHoursModal(false)}
      />

      {!!apiBaseUrl && (
        <ProjectSettingsModal
          visible={showProjectSettings}
          projectId={obraView.id}
          projectRole={projectRole}
          currentName={obraView.nome}
          currentAddress={obraView.endereco ?? null}
          currentExpectedDeliveryAt={obraView.dataPrevisaoEntrega ?? null}
          currentStatus={
            obraView.status === "concluida"
              ? "COMPLETED"
              : obraView.status === "pausada"
                ? "ARCHIVED"
                : "ACTIVE"
          }
          members={projectMembers}
          apiBaseUrl={apiBaseUrl}
          onConclude={applyStatusAndClose}
          onArchive={applyStatusAndClose}
          onReactivate={applyStatusAndClose}
          onProjectUpdated={async (_p) => {
            setShowProjectSettings(false);
            await refresh();
            setObraOverride(null);
          }}
          onProjectDeleted={() => {
            setShowProjectSettings(false);
            deleteObra(id!);
            void refreshSubscription();
            router.back();
          }}
          onClose={() => setShowProjectSettings(false)}
        />
      )}

      {isEng &&
        managerTourStep >= 0 &&
        !managerTourCompleted &&
        isScreenFocused &&
        !(managerTourStep === 6 && isTourSharePreviewOpen) && (
        <ManagerTour
          currentStep={managerTourStep}
          refs={engTourRefs}
          onAdvance={advanceManagerTour}
          onSkip={handleTourSkip}
          onSwitchTab={setTourTabOverride}
          stepSideEffects={{
            5: () => setShouldOpenShareAfterTour(true),
            6: () =>
              router.push({
                pathname: "/report/[id]" as any,
                params: { id: obraView.id, fromOnboarding: "1" },
              }),
          }}
        />
      )}

      {isCliente &&
        viewerTourStep >= 0 &&
        !isViewerTourDone &&
        isScreenFocused && (
          <ViewerTour
            currentStep={viewerTourStep}
            refs={viewerTourRefs}
            onAdvance={handleViewerTourAdvance}
            onSkip={handleViewerTourSkip}
            onSwitchTab={setViewerTourTabOverride}
          />
        )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  // No tablet a área lateral acompanha o fundo do conteúdo (coluna central).
  safeTablet: {
    backgroundColor: "#F5F5F5",
  },

  // -- Loading / Error --
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[40],
    gap: spacing[12],
  },
  loadingText: {
    fontSize: 14,
    color: colors.subtext,
    fontWeight: "500",
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.title,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[12],
    borderRadius: radius.md,
    marginTop: spacing[4],
  },
  retryText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
});

