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

import type { ObraDetalhe } from "@/data/obras";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import type { ProjectApiRole } from "@/utils/project-role";

import { ClienteCTAButton } from "@/components/obra/cliente-cta-button";
import { ClienteExpensesSummary } from "@/components/obra/cliente-expenses-summary";
import { ClienteFinancialSummary } from "@/components/obra/cliente-financial-summary";
import { ClienteGallery } from "@/components/obra/cliente-gallery";
import { ClienteHorasCard } from "@/components/obra/cliente-horas-card";
import { ClienteStatusCard } from "@/components/obra/cliente-status-card";
import { ClienteTitleSection } from "@/components/obra/cliente-title-section";
import { ObraHeader } from "@/components/obra/obra-header";

// ─── Types ────────────────────────────────────────────────────────────────────
type ClienteTabId = "visao_geral" | "documentos" | "galeria" | "gastos";

const BOTTOM_H = 84;

// ─── Props ────────────────────────────────────────────────────────────────────
interface ObraViewClienteProps {
  obra: ObraDetalhe;
  onViewDiary: () => void;
  projectRole: ProjectApiRole;
  onTabChange?: (isPrimary: boolean) => void;
  onRefresh?: () => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ObraViewCliente({
  obra,
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

  const changeTab = useCallback((tab: ClienteTabId) => {
    setActiveTab(tab);
    onTabChange?.(tab === "visao_geral");
  }, [onTabChange]);

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

  // ── Edge swipe (left-to-right) on secondary tabs → go to visao_geral ───────
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
      {/* Header sempre visível independente da aba */}
      <ObraHeader
        title={obra.nome}
        projectId={obra.id}
        projectRole={projectRole}
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
          />
        </ScrollView>
      )}

      {activeTab === "documentos" && (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <MaterialIcons
              name="folder-open"
              size={40}
              color={colors.iconMuted}
            />
          </View>
          <Text style={styles.emptyTitle}>Nenhum documento</Text>
          <Text style={styles.emptyText}>
            Os documentos do projeto aparecerão aqui assim que forem
            disponibilizados.
          </Text>
        </View>
      )}

      <View
        style={[
          styles.bottomArea,
          { backgroundColor: colors.white },
        ]}
      >
        <ClienteCTAButton
          onInicio={() => changeTab("visao_geral")}
          onGaleria={() => changeTab("galeria")}
          onGastos={() => changeTab("gastos")}
          onDocumentos={() => changeTab("documentos")}
          activeKey={activeTab}
        />
      </View>

      {/* Edge swipe zone — captures left-to-right swipe on secondary tabs */}
      {activeTab !== "visao_geral" && (
        <View {...edgeSwipe.panHandlers} style={styles.edgeSwipeZone} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#F5F5F5" },
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
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerSoft,
    paddingBottom: spacing[10],
  },

  diarioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    backgroundColor: colors.tintBlue,
    marginHorizontal: spacing[16],
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

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[40],
    gap: spacing[10],
  },
  emptyIconWrap: {
    width: spacing[80],
    height: spacing[80],
    borderRadius: radius["2xl"],
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.title,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: "center",
    lineHeight: 20,
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
