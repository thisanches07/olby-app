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

import { ProjectDocumentsHub } from "@/components/documents/project-documents-hub";
import { ClienteCTAButton } from "@/components/obra/cliente-cta-button";
import { ClienteExpensesSummary } from "@/components/obra/cliente-expenses-summary";
import { ClienteFinancialSummary } from "@/components/obra/cliente-financial-summary";
import { ClienteGallery } from "@/components/obra/cliente-gallery";
import { ClienteHorasCard } from "@/components/obra/cliente-horas-card";
import { ClienteStatusCard } from "@/components/obra/cliente-status-card";
import { ClienteTasksView } from "@/components/obra/cliente-tasks-view";
import { ClienteTitleSection } from "@/components/obra/cliente-title-section";
import { ObraHeader } from "@/components/obra/obra-header";
import type { DocumentAttachment, ObraDetalhe } from "@/data/obras";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import type { ProjectAccessMember } from "@/utils/project-members";
import type { ProjectApiRole } from "@/utils/project-role";

type ClienteTabId =
  | "visao_geral"
  | "documentos"
  | "galeria"
  | "gastos"
  | "tarefas";

const BOTTOM_H = 84;

interface ObraViewClienteProps {
  obra: ObraDetalhe;
  expenseReceiptDocuments?: DocumentAttachment[];
  projectMembers?: ProjectAccessMember[];
  onProjectDocumentsChanged?: (documents: Array<{
    id: string;
    expenseId: string | null;
    status: string;
    viewUrl?: string;
  }>) => void;
  onProjectDocumentRemoved?: (document: DocumentAttachment) => void;
  onViewDiary: () => void;
  projectRole: ProjectApiRole;
  onTabChange?: (isPrimary: boolean) => void;
  onRefresh?: () => Promise<void>;
}

export function ObraViewCliente({
  obra,
  expenseReceiptDocuments = [],
  projectMembers = [],
  onProjectDocumentsChanged,
  onProjectDocumentRemoved,
  onViewDiary,
  projectRole,
  onTabChange,
  onRefresh,
}: ObraViewClienteProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<ClienteTabId>("visao_geral");
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

  const changeTab = useCallback(
    (tab: ClienteTabId) => {
      setActiveTab(tab);
      onTabChange?.(tab === "visao_geral");
    },
    [onTabChange],
  );

  usePreventRemove(
    activeTab !== "visao_geral",
    useCallback(() => {
      changeTab("visao_geral");
    }, [changeTab]),
  );

  const handleBack = useCallback(() => {
    if (activeTab !== "visao_geral") {
      changeTab("visao_geral");
    } else {
      navigation.goBack();
    }
  }, [activeTab, navigation, changeTab]);

  const scrollPadBottom = useMemo(
    () => BOTTOM_H + insets.bottom + spacing[16],
    [insets.bottom],
  );

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const changeTabRef = useRef(changeTab);
  changeTabRef.current = changeTab;

  const edgeSwipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, gs) =>
        activeTabRef.current !== "visao_geral" &&
        gs.x0 < 30 &&
        gs.dx > 8 &&
        Math.abs(gs.dy) < Math.abs(gs.dx),
      onPanResponderRelease: (_e, gs) => {
        if (gs.dx > 60) changeTabRef.current("visao_geral");
      },
    }),
  ).current;

  return (
    <>
      <ObraHeader
        title={obra.nome}
        projectId={obra.id}
        projectRole={projectRole}
        members={projectMembers}
        onBack={handleBack}
      />

      {activeTab === "visao_geral" && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: scrollPadBottom }}
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
          <View style={styles.topBlock}>
            <ClienteTitleSection obra={obra} />
          </View>

          <TouchableOpacity
            style={styles.diarioBtn}
            onPress={onViewDiary}
            activeOpacity={0.85}
          >
            <View style={styles.diarioIconCircle}>
              <MaterialIcons name="assignment" size={20} color={colors.primary} />
            </View>
            <View style={styles.diarioTextBlock}>
              <Text style={styles.diarioBtnText}>Ver Diario de Obra</Text>
              <Text style={styles.diarioBtnSub}>Registro diario da obra</Text>
            </View>
            <View style={styles.diarioArrowCircle}>
              <MaterialIcons
                name="arrow-forward-ios"
                size={12}
                color={colors.primary}
              />
            </View>
          </TouchableOpacity>

          {obra.horasContratadas > 0 && <ClienteHorasCard obra={obra} />}
          <ClienteStatusCard obra={obra} />
          <ClienteFinancialSummary
            obra={obra}
            onVerGastos={() => changeTab("gastos")}
          />
          <ClienteGallery
            projectId={obra.id}
            onViewAll={() => changeTab("galeria")}
            onViewDiary={onViewDiary}
          />
        </ScrollView>
      )}

      {activeTab === "galeria" && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingBottom: scrollPadBottom,
            paddingTop: spacing[12],
          }}
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
          <ClienteGallery projectId={obra.id} fullView onViewDiary={onViewDiary} />
        </ScrollView>
      )}

      {activeTab === "gastos" && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingBottom: scrollPadBottom,
            paddingTop: spacing[12],
          }}
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
          <ClienteExpensesSummary
            gastos={obra.gastos}
            tarefas={obra.tarefas}
            projectId={obra.id}
          />
        </ScrollView>
      )}

      {activeTab === "tarefas" && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingBottom: scrollPadBottom,
            paddingTop: spacing[12],
          }}
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
          <ClienteTasksView tarefas={obra.tarefas} />
        </ScrollView>
      )}

      <View style={[styles.scroll, activeTab !== "documentos" && { display: "none" }]}>
        <ProjectDocumentsHub
          projectId={obra.id}
          projectRole={projectRole}
          onDocumentsChanged={onProjectDocumentsChanged}
          onDocumentRemoved={onProjectDocumentRemoved}
          supplementalDocuments={expenseReceiptDocuments}
          isActive={activeTab === "documentos"}
        />
      </View>

      <View style={[styles.bottomArea, { backgroundColor: colors.white }]}>
        <ClienteCTAButton
          onInicio={() => changeTab("visao_geral")}
          onGaleria={() => changeTab("galeria")}
          onGastos={() => changeTab("gastos")}
          onDocumentos={() => changeTab("documentos")}
          onTarefas={() => changeTab("tarefas")}
          activeKey={activeTab}
        />
      </View>

      {activeTab !== "visao_geral" && (
        <View {...edgeSwipe.panHandlers} style={styles.edgeSwipeZone} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#F1F4F9" },
  edgeSwipeZone: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 30,
    zIndex: 999,
  },
  topBlock: {
    backgroundColor: colors.white,
  },
  diarioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    backgroundColor: colors.white,
    marginHorizontal: spacing[16],
    marginTop: spacing[14],
    marginBottom: spacing[4],
    paddingVertical: spacing[14],
    paddingHorizontal: spacing[16],
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  diarioIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.tintBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  diarioTextBlock: {
    flex: 1,
  },
  diarioBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 2,
  },
  diarioBtnSub: {
    fontSize: 12,
    fontWeight: "400",
    color: "#9CA3AF",
  },
  diarioArrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
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
});
