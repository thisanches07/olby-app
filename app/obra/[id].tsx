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
import { useOnboarding } from "@/contexts/onboarding-context";
import {
  getProjectItemLimitMessage,
  PROJECT_ITEM_LIMIT,
} from "@/constants/creation-limits";
import type { DocumentSource, Gasto, Tarefa } from "@/data/obras";
import { useAuth } from "@/hooks/use-auth";
import { useObraData } from "@/hooks/use-obra-data";
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
import { TaskFormModal } from "@/components/projeto/task-form-modal";

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

// ─── Error screen ─────────────────────────────────────────────────────────────
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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ObraDetalheScreen() {
  const insets = useSafeAreaInsets();
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

  // Tour refs — created here so ManagerTour and ObraViewEng share the same instances
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

  // Programmatic share modal control (tour opens/closes it during step 5→6)
  const shareControlRef = useRef<{ open: () => void; close: () => void } | null>(null);

  // Tour-driven tab override: ManagerTour calls onSwitchTab → sets this → ObraViewEng reacts
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
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showHoursModal, setShowHoursModal] = useState(false);

  const [editingTask, setEditingTask] = useState<Tarefa | undefined>(undefined);
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

  const {
    obra,
    expenseReceiptDocuments,
    loading,
    error,
    refresh,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    deleteAllTasks,
    reorderTasks,
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
  // de volta ao contexto global — a lista reflete sem precisar de GET
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
  const canEdit = canEditProject(projectRole);
  const taskLimitReached = (obraView?.tarefas?.length ?? 0) >= PROJECT_ITEM_LIMIT;
  const expenseLimitReached =
    (obraView?.gastos?.length ?? 0) >= PROJECT_ITEM_LIMIT;

  const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;

  // Navegação
  const handleViewDiary = () =>
    router.push({ pathname: "/diario/[id]", params: { id: obraView.id } });

  // Tasks
  const handleAddTask = () => {
    if (taskLimitReached) {
      Alert.alert("Limite atingido", getProjectItemLimitMessage("tarefas"));
      return;
    }

    setEditingTask(undefined);
    setShowTaskModal(true);
  };

  const handleEditTask = (task: Tarefa) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleSaveTask = async (task: Omit<Tarefa, "id">) => {
    try {
      if (editingTask) await updateTask(editingTask.id, task);
      else {
        if (taskLimitReached) {
          Alert.alert("Limite atingido", getProjectItemLimitMessage("tarefas"));
          return;
        }
        await addTask(task);
      }

      setShowTaskModal(false);
      setEditingTask(undefined);
    } catch (e: unknown) {
      Alert.alert("Erro", getErrorMessage(e, "Não foi possível salvar a tarefa."));
      throw e;
    }
  };

  const handleToggleTask = (taskId: string) => {
    toggleTask(taskId).catch(() => {
      Alert.alert("Erro", "Não foi possível atualizar a tarefa.");
    });
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId).catch(() => {
      Alert.alert("Erro", "Não foi possível remover a tarefa.");
    });
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

  // Track financial — ativa flag via PATCH e abre modal de orçamento
  const handleEnableFinancial = async () => {
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

  // Deleta todas as tarefas
  const handleDeleteAllTasks = () => {
    const count = obraView.tarefas?.length ?? 0;
    Alert.alert(
      "Excluir todas as tarefas",
      `Isso irá excluir ${count} tarefa${count !== 1 ? "s" : ""}. Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir todas",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAllTasks();
            } catch {
              Alert.alert("Erro", "Não foi possível excluir as tarefas.");
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
    <SafeAreaView style={styles.safe} edges={["top"]}>
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
          onAddTask={handleAddTask}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onToggleTask={handleToggleTask}
          onDeleteAllTasks={handleDeleteAllTasks}
          onReorderTasks={reorderTasks}
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
          taskLimitReached={taskLimitReached}
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

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}

      <TaskFormModal
        visible={showTaskModal}
        task={editingTask}
        onSave={handleSaveTask}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(undefined);
        }}
      />

      <ExpenseFormModal
        visible={showExpenseModal}
        expense={editingExpense}
        tarefas={obraView.tarefas}
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

  // ── Loading / Error ──
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
