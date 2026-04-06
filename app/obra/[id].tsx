import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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

import type { Gasto, Tarefa } from "@/data/obras";
import { useProjects } from "@/contexts/projects-context";
import { useSubscription } from "@/contexts/subscription-context";
import { useObraData } from "@/hooks/use-obra-data";
import { api } from "@/services/api";
import {
  canEditProject,
  isClientView,
  type ProjectApiRole,
} from "@/utils/project-role";

import { BudgetAdjustmentModal } from "@/components/projeto/budget-adjustment-modal";
import { ExpenseDocumentSheet } from "@/components/projeto/expense-document-sheet";
import { ExpenseFormModal } from "@/components/projeto/expense-form-modal";
import { HoursAdjustmentModal } from "@/components/projeto/hours-adjustment-modal";
import {
  ProjectSettingsModal,
} from "@/components/projeto/project-settings-modal";
import { TaskFormModal } from "@/components/projeto/task-form-modal";

import { ObraViewCliente } from "@/components/obra/obra-view-cliente";
import { ObraViewEng } from "@/components/obra/obra-view-eng";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";

// ─── Loading screen ───────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando obra...</Text>
      </View>
    </SafeAreaView>
  );
}

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

  const handleDocumentsPress = useCallback((expense: Gasto) => {
    setDocSheetExpense(expense);
  }, []);

  const handleDocumentCountChange = useCallback((expenseId: string, count: number) => {
    setDocCounts((prev) => ({ ...prev, [expenseId]: count }));
  }, []);

  const { updateObra, deleteObra } = useProjects();
  const { refresh: refreshSubscription } = useSubscription();

  const {
    obra,
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
    deleteExpense,
    deleteAllExpenses,
    updateBudget,
    updateTrackFinancial,
  } = useObraData(id!);

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

  // Sincroniza qualquer mudança do detalhe (tarefas, gastos, settings)
  // de volta ao contexto global — a lista reflete sem precisar de GET
  useEffect(() => {
    if (!obra) return;
    updateObra(obra.id, obra);
  }, [obra, updateObra]);

  const obraView = (obraOverride ?? obra) as any;

  // Guards
  if (loading && !obra) return <LoadingScreen />;
  if (error && !obra) return <ErrorScreen message={error} onRetry={refresh} />;
  if (!obra) return null;

  const projectRole = (obraView?.myRole ?? obra?.myRole ?? null) as ProjectApiRole;

  const isCliente = isClientView(projectRole);
  const isEng = !isCliente;
  const canEdit = canEditProject(projectRole);

  const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;

  // Navegação
  const handleViewDiary = () =>
    router.push({ pathname: "/diario/[id]", params: { id: obraView.id } });

  // Tasks
  const handleAddTask = () => {
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
      else await addTask(task);

      setShowTaskModal(false);
      setEditingTask(undefined);
    } catch (e: unknown) {
      Alert.alert(
        "Erro",
        "Não foi possível salvar a tarefa.",
      );
      throw e;
    }
  };

  const handleToggleTask = (taskId: string) => {
    toggleTask(taskId).catch(() => {
      Alert.alert(
        "Erro",
        "Não foi possível atualizar a tarefa.",
      );
    });
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId).catch(() => {
      Alert.alert(
        "Erro",
        "Não foi possível remover a tarefa.",
      );
    });
  };

  // Expenses
  const handleAddExpense = () => {
    setEditingExpense(undefined);
    setShowExpenseModal(true);
  };

  const handleEditExpense = (expense: Gasto) => {
    setEditingExpense(expense);
    setShowExpenseModal(true);
  };

  const handleSaveExpense = async (expense: Omit<Gasto, "id">) => {
    try {
      if (editingExpense) await updateExpense(editingExpense.id, expense);
      else await addExpense(expense);

      setShowExpenseModal(false);
      setEditingExpense(undefined);
    } catch {
      Alert.alert(
        "Erro",
        "Não foi possível salvar o gasto.",
      );
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    deleteExpense(expenseId).catch(() => {
      Alert.alert(
        "Erro",
        "Não foi possível remover o gasto.",
      );
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
              Alert.alert(
                "Erro",
                "Não foi possível excluir as tarefas.",
              );
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
              Alert.alert(
                "Erro",
                "Não foi possível excluir os gastos.",
              );
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
              await api.patch(`/projects/${obraView.id}`, { status: "COMPLETED" });
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
          onViewDiary={handleViewDiary}
          projectRole={projectRole}
          onTabChange={(isPrimary) => setIsOnPrimaryTab(isPrimary)}
          onRefresh={refresh}
        />
      )}

      {isEng && (
        <ObraViewEng
          obra={obraView}
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
          onEnableFinancial={handleEnableFinancial}
          onDisableFinancial={handleDisableFinancial}
          docCounts={docCounts}
          onDocumentsPress={handleDocumentsPress}
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
          members={[]}
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
