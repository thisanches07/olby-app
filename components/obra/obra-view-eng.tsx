import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { usePreventRemove } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  PanResponder,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Gasto, ObraDetalhe, Tarefa } from "@/data/obras";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import type { ProjectApiRole } from "@/utils/project-role";

import { BottomTabs, type TabDefinition } from "@/components/obra/bottom-tabs";
import { EngCTARow } from "@/components/obra/eng-cta-row";
import { EngExpensesList } from "@/components/obra/eng-expenses-list";
import { EngFinancialCompactCard } from "@/components/obra/eng-financial-compact-card";
import { EngFinancialSummary } from "@/components/obra/eng-financial-summary";
import { EngHeroSection } from "@/components/obra/eng-hero-section";
import { EngHoursCompactCard } from "@/components/obra/eng-hours-compact-card";
import { EngTasksList } from "@/components/obra/eng-tasks-list";
import { ObraHeader } from "@/components/obra/obra-header";

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type EngTabId = "projetos" | "tarefas" | "gastos" | "financeiro";

const ENG_TABS: TabDefinition[] = [
  { id: "projetos", label: "PROJETO", icon: "folder" },
  { id: "tarefas", label: "TAREFAS", icon: "check-circle-outline" },
  { id: "gastos", label: "GASTOS", icon: "receipt" },
  // { id: "financeiro", label: "FINANCEIRO", icon: "insights" },
];

// ─── Utils: parse robusto para timestamptz do Postgres ─────────────────────────
function parsePgTimestamptz(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof value !== "string") return null;

  const raw = value.trim();
  if (!raw) return null;

  // 0) "DD/MM/YYYY" (ex: 07/03/2100) => Date (local)
  // Observação: não confia no `new Date("07/03/2100")` porque é ambíguo (MM/DD vs DD/MM).
  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const dd = Number(brMatch[1]);
    const mm = Number(brMatch[2]);
    const yyyy = Number(brMatch[3]);

    // validações básicas
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

    // cria ao meio-dia pra evitar edge cases de DST/offset que podem “voltar” um dia em alguns fusos
    const d = new Date(yyyy, mm - 1, dd, 12, 0, 0, 0);

    // garante que não houve overflow (ex: 31/02 vira março)
    if (
      d.getFullYear() !== yyyy ||
      d.getMonth() !== mm - 1 ||
      d.getDate() !== dd ||
      Number.isNaN(d.getTime())
    ) {
      return null;
    }

    return d;
  }

  // 1) tentativa direta (ISO, RFC, etc)
  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;

  // 2) "YYYY-MM-DD HH:mm:ss-03" => "YYYY-MM-DDTHH:mm:ss-03:00"
  const withT = raw.replace(" ", "T");

  // garante offset com ":00" quando vier "-03" ou "+02"
  const offsetFixed = withT.replace(
    /([+-]\d{2})(?!:?\d{2})$/,
    (m) => `${m}:00`,
  );

  const d2 = new Date(offsetFixed);
  if (!Number.isNaN(d2.getTime())) return d2;

  // 3) fallback: se vier sem segundos
  const maybeNoSeconds = offsetFixed.replace(
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})([+-].+)$/,
    "$1:00$2",
  );
  const d3 = new Date(maybeNoSeconds);
  if (!Number.isNaN(d3.getTime())) return d3;

  return null;
}

function formatDatePtBrShort(d: Date) {
  // "06 mar 2001" (premium e curto)
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface ObraViewEngProps {
  obra: ObraDetalhe;
  onAddTask: () => void;
  onEditTask: (task: Tarefa) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteAllTasks: () => void;
  onReorderTasks?: (orderedIds: string[]) => void;
  onAddExpense: () => void;
  onEditExpense: (expense: Gasto) => void;
  onDeleteExpense: (expenseId: string) => void;
  onDeleteAllExpenses: () => void;
  onEditBudget: () => void;
  onEditHours: () => void;
  onEditProject?: () => void;
  onViewDiary: () => void;
  onEnableFinancial: () => void;
  onDisableFinancial: () => void;
  projectRole: ProjectApiRole;
  onTabChange?: (isPrimary: boolean) => void;
  onRefresh?: () => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ObraViewEng({
  obra,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleTask,
  onDeleteAllTasks,
  onReorderTasks,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onDeleteAllExpenses,
  onEditBudget,
  onEditHours,
  onEditProject,
  onViewDiary,
  onEnableFinancial,
  onDisableFinancial,
  projectRole,
  onTabChange,
  onRefresh,
}: ObraViewEngProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<EngTabId>("projetos");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  const changeTab = useCallback((tab: EngTabId) => {
    setActiveTab(tab);
    onTabChange?.(tab === "projetos");
  }, [onTabChange]);

  // ── Tab-aware back: secondary tabs → projetos; projetos → home ────────────
  const handleBack = useCallback(() => {
    if (activeTab !== "projetos") {
      changeTab("projetos");
    } else {
      navigation.goBack();
    }
  }, [activeTab, navigation, changeTab]);

  usePreventRemove(
    activeTab !== "projetos",
    useCallback(() => {
      changeTab("projetos");
    }, [changeTab]),
  );

  // ── Edge swipe (left-to-right) on secondary tabs → go to projetos ─────────
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const changeTabRef = useRef(changeTab);
  changeTabRef.current = changeTab;

  const edgeSwipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, gs) =>
        activeTabRef.current !== "projetos" &&
        gs.x0 < 30 &&
        gs.dx > 8 &&
        Math.abs(gs.dy) < Math.abs(gs.dx),
      onPanResponderRelease: (_e, gs) => {
        if (gs.dx > 60) changeTabRef.current("projetos");
      },
    }),
  ).current;

  const isReadOnly = obra.status === "concluida" || obra.status === "pausada";
  const readOnlyReason: "concluida" | "pausada" | undefined = isReadOnly
    ? (obra.status as "concluida" | "pausada")
    : undefined;

  // CTA "+" só aparece no gastos quando o acompanhamento está ativo
  const showCTA =
    (activeTab === "tarefas" && !isReadOnly) ||
    (activeTab === "gastos" && !isReadOnly && obra.trackFinancial);

  const scrollPadBottom = useMemo(() => {
    const TABS_H = 84;
    const CTA_H = showCTA ? 84 : 0;
    return TABS_H + CTA_H + insets.bottom + spacing[16];
  }, [showCTA, insets.bottom]);

  const entregaLabel = useMemo(() => {
    const raw =
      (obra as any)?.dataPrevisaoEntrega ??
      (obra as any)?.expectedDeliveryAt ??
      (obra as any)?.previsaoEntrega;

    const d = parsePgTimestamptz(raw);
    if (!raw) return undefined;
    // se veio string mas não parseou, mostra algo que denuncia o problema (melhor que sumir)
    if (!d) return "Entrega prevista: Data inválida";

    return `Entrega prevista: ${formatDatePtBrShort(d)}`;
  }, [obra]);

  return (
    <>
      <ObraHeader
        title={obra.nome}
        projectId={obra.id}
        projectRole={projectRole}
        onBack={handleBack}
      />

      {/* Tarefas tab rendered outside ScrollView — DraggableFlatList manages its own scroll */}
      {activeTab === "tarefas" && (
        <View style={styles.scroll}>
          <EngTasksList
            tarefas={obra.tarefas}
            onToggle={onToggleTask}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            onDeleteAll={isReadOnly ? undefined : onDeleteAllTasks}
            onReorder={isReadOnly ? undefined : onReorderTasks}
            showActions
            emptyMessage="Nenhuma tarefa"
            readOnly={isReadOnly}
            readOnlyReason={readOnlyReason}
            scrollPadBottom={scrollPadBottom}
          />
        </View>
      )}

      <ScrollView
        style={[styles.scroll, activeTab === "tarefas" && { display: "none" }]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollPadBottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
      >
          {activeTab === "projetos" && (
            <>
              <EngHeroSection
                progresso={obra.progresso}
                etapaAtual={obra.etapaAtual}
                endereco={obra.endereco}
                dataPrevisaoEntrega={entregaLabel}
                onEditPress={onEditProject}
              />

              <TouchableOpacity
                style={styles.diarioBtn}
                onPress={onViewDiary}
                activeOpacity={0.85}
              >
                <MaterialIcons
                  name="assignment"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.diarioBtnText}>Ver Diário de Obra</Text>
                <MaterialIcons
                  name="arrow-forward-ios"
                  size={13}
                  color={colors.primary}
                />
              </TouchableOpacity>

              <EngHoursCompactCard
                obra={obra}
                onPress={isReadOnly ? undefined : onEditHours}
              />

              {/* Financeiro: card normal ou CTA de ativação */}
              {obra.trackFinancial ? (
                <EngFinancialCompactCard
                  obra={obra}
                  onEditPress={isReadOnly ? undefined : onEditBudget}
                />
              ) : !isReadOnly ? (
                <TouchableOpacity
                  style={styles.financialOffCard}
                  onPress={onEnableFinancial}
                  activeOpacity={0.8}
                >
                  <View style={styles.financialOffIcon}>
                    <MaterialIcons name="show-chart" size={20} color="#9CA3AF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.financialOffTitle}>
                      Financeiro desativado
                    </Text>
                    <Text style={styles.financialOffSub}>
                      Toque para ativar orçamento e gastos
                    </Text>
                  </View>
                  <View style={styles.financialOffChip}>
                    <Text style={styles.financialOffChipText}>Ativar</Text>
                  </View>
                </TouchableOpacity>
              ) : null}

              <EngTasksList
                tarefas={obra.tarefas}
                onToggle={onToggleTask}
                onDelete={onDeleteTask}
                onAddTask={isReadOnly ? undefined : onAddTask}
                readOnly={isReadOnly}
                readOnlyReason={readOnlyReason}
              />
            </>
          )}

          {activeTab === "gastos" && (
            <EngExpensesList
              gastos={obra.gastos}
              tarefas={obra.tarefas}
              onEdit={onEditExpense}
              onDelete={onDeleteExpense}
              readOnly={isReadOnly}
              readOnlyReason={readOnlyReason}
              trackFinancial={obra.trackFinancial}
              onEnableFinancial={isReadOnly ? undefined : onEnableFinancial}
              onDeleteAll={isReadOnly ? undefined : onDeleteAllExpenses}
              onDisableTracking={isReadOnly ? undefined : onDisableFinancial}
            />
          )}

          {activeTab === "financeiro" && <EngFinancialSummary obra={obra} />}
        </ScrollView>

      <View
        style={[
          styles.bottomArea,
          { backgroundColor: colors.white },
        ]}
      >
        {showCTA && (
          <EngCTARow
            activeTab={activeTab}
            onAddTask={onAddTask}
            onAddExpense={onAddExpense}
            onDefault={onViewDiary}
          />
        )}

        <BottomTabs
          tabs={ENG_TABS}
          activeTab={activeTab}
          onTabChange={(tabId) => changeTab(tabId as EngTabId)}
        />
      </View>

      {/* Edge swipe zone — captures left-to-right swipe on secondary tabs */}
      {activeTab !== "projetos" && (
        <View {...edgeSwipe.panHandlers} style={styles.edgeSwipeZone} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#F5F5F5" },
  scrollContent: { paddingHorizontal: spacing[20] },
  edgeSwipeZone: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 30,
    zIndex: 999,
  },

  diarioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    backgroundColor: colors.tintBlue,
    marginTop: spacing[14],
    marginBottom: spacing[4],
    paddingVertical: spacing[14],
    paddingHorizontal: spacing[16],
    borderRadius: radius.md,
  },
  diarioBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },

  bottomArea: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: colors.dividerSoft,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },

  // ── Financial off CTA (PROJETO tab) ────────────────────────────────────────
  financialOffCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: spacing[16],
    marginBottom: spacing[20],
  },
  financialOffIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  financialOffTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 2,
  },
  financialOffSub: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  financialOffChip: {
    backgroundColor: colors.primary + "15",
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[6],
    borderRadius: 8,
  },
  financialOffChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
});
