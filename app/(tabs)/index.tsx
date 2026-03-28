import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { FlashList } from "@shopify/flash-list";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useMemo, useState } from "react";
import {
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PressableScale } from "@/components/ui/pressable-scale";
import { HomeEmptyState } from "@/components/home/home-empty-state";
import { HomeFilterChips } from "@/components/home/home-filter-chips";
import { HomeHeader } from "@/components/home/home-header";
import { HomeSearchBar } from "@/components/home/home-search-bar";
import { ObraCard, StatusType } from "@/components/obra-card";
import { ObraCardSkeleton } from "@/components/obra/obra-card-skeleton";
import { CreateProjectModal } from "@/components/projeto/create-project-modal";
import { UpgradeModal } from "@/components/subscription/upgrade-modal";
import { useProjects } from "@/contexts/projects-context";
import { useSubscription } from "@/contexts/subscription-context";
import type { ObraDetalhe } from "@/data/obras";
import { useAuth } from "@/hooks/use-auth";
import { shadow, spacing } from "@/theme";
import { colors } from "@/theme/colors";

const FILTROS: { label: string; value: StatusType | "todas" }[] = [
  { label: "Todas", value: "todas" },
  { label: "Em Andamento", value: "em_andamento" },
  { label: "Concluidas", value: "concluida" },
  { label: "Pausadas", value: "pausada" },
];

export default function MinhasObrasScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const [busca, setBusca] = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState<StatusType | "todas">("todas");
  const [mode, setMode] = useState<"cliente" | "engenheiro">("cliente");
  const [showCreateModal, setShowCreateModal] = useState(false);
  type ModalMode =
    | null
    | "plan_error"
    | "blocked_upgrade"
    | { type: "post_create"; obraId: string };
  const [modalMode, setModalMode] = useState<ModalMode>(null);

  const { obras, isLoading, isRefreshing, addObra, loadInitial, refresh } =
    useProjects();
  const { plan, isLoading: subscriptionLoading, refresh: refreshSubscription } = useSubscription();
  const isPlanKnown = !!plan?.code;
  const isFreePlan = plan?.code === "FREE";
  const isBasicPlan = plan?.code === "BASIC";
  const planLimit =
    typeof plan?.projectLimit === "number" ? plan.projectLimit : null;
  const ownedCount =
    typeof plan?.ownedProjectCount === "number" ? plan.ownedProjectCount : null;
  const isBasicAtLimit =
    isBasicPlan &&
    typeof planLimit === "number" &&
    typeof ownedCount === "number" &&
    ownedCount >= planLimit;
  const canCreate =
    !!plan && !isFreePlan && !isBasicAtLimit && plan.canCreateProject === true;
  const isCreateBlocked =
    !!plan && (isFreePlan || isBasicAtLimit || plan.canCreateProject === false);

  // Só busca da API na primeira vez que a tela entra em foco
  useFocusEffect(
    useCallback(() => {
      if (!authLoading && user) {
        void loadInitial();
        void refreshSubscription();
      }
    }, [authLoading, user, loadInitial, refreshSubscription]),
  );

  const obrasFiltradas = useMemo(() => {
    const query = busca.trim().toLowerCase();

    return obras.filter((obra) => {
      const matchBusca =
        obra.nome.toLowerCase().includes(query) ||
        (obra.cliente || "").toLowerCase().includes(query);

      const matchFiltro =
        filtroAtivo === "todas" || obra.status === filtroAtivo;

      return matchBusca && matchFiltro;
    });
  }, [obras, busca, filtroAtivo]);

  const openPlansForBlockedCreation = useCallback(() => {
    router.push({
      pathname: "/subscription/plans",
      params: {
        reason: isFreePlan ? "free_required" : "project_limit_reached",
      },
    });
  }, [isFreePlan]);

  const handleCreateProject = useCallback(
    (novaObra: ObraDetalhe) => {
      setShowCreateModal(false);
      addObra(novaObra);

      // Mantém o gate de criação sincronizado (principalmente no plano BASIC).
      void refreshSubscription();

      const willReachLimitNow =
        plan?.code === "BASIC" &&
        typeof planLimit === "number" &&
        typeof ownedCount === "number" &&
        ownedCount + 1 >= planLimit;

      if (willReachLimitNow) {
        setModalMode({ type: "post_create", obraId: novaObra.id });
        return;
      }

      router.push({ pathname: "/obra/[id]", params: { id: novaObra.id } });
    },
    [addObra, ownedCount, plan?.code, planLimit, refreshSubscription],
  );

  const showBlockedCreateAlert = useCallback(() => {
    if (!isPlanKnown) {
      setModalMode("plan_error");
      return;
    }
    setModalMode("blocked_upgrade");
  }, [isPlanKnown]);

  const handlePressCreate = useCallback(() => {
    // Aguarda o plano carregar antes de qualquer decisão
    if (subscriptionLoading) return;

    if (Platform.OS === "ios") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (canCreate) {
      setShowCreateModal(true);
      return;
    }

    showBlockedCreateAlert();
  }, [canCreate, showBlockedCreateAlert, subscriptionLoading]);

  const handleRequireUpgrade = useCallback(() => {
    setShowCreateModal(false);
    showBlockedCreateAlert();
  }, [showBlockedCreateAlert]);

  const postCreateObraId =
    modalMode !== null && typeof modalMode === "object" && modalMode.type === "post_create"
      ? modalMode.obraId
      : null;

  return (
    <SafeAreaView style={styles.safeTop} edges={["top"]}>
      <StatusBar style="light" />

      <View style={styles.content}>
        <FlashList
          data={obrasFiltradas}
          keyExtractor={(item) => item.id}
          estimatedItemSize={185}
          renderItem={({ item }) => (
            <ObraCard
              obra={item}
              onPress={() =>
                router.push({ pathname: "/obra/[id]", params: { id: item.id } })
              }
            />
          )}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          style={styles.flatList}
          contentContainerStyle={styles.listaContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                if (Platform.OS === "ios") {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                refresh();
              }}
              tintColor="#FFFFFF"
              colors={["#FFFFFF"]}
              progressBackgroundColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <>
              <HomeHeader mode={mode} onModeChange={setMode} obras={obras} />

              <HomeSearchBar
                value={busca}
                onChangeText={setBusca}
                onClear={() => setBusca("")}
              />

              <View style={styles.filterWrapper}>
                <HomeFilterChips
                  filters={FILTROS}
                  activeFilter={filtroAtivo}
                  onFilterChange={(value) =>
                    setFiltroAtivo(value as StatusType | "todas")
                  }
                />
              </View>

              {isCreateBlocked && (
                <TouchableOpacity
                  style={styles.limitBanner}
                  activeOpacity={0.85}
                  onPress={openPlansForBlockedCreation}
                >
                  <MaterialIcons
                    name="lock-outline"
                    size={16}
                    color={colors.warning}
                  />
                  <View>
                    <Text style={styles.limitBannerTitle}>
                      {isFreePlan
                        ? "Assinatura necessaria"
                        : "Limite do plano atingido"}
                    </Text>
                    <Text style={styles.limitBannerText}>
                      {isFreePlan
                        ? "Assine um plano para criar e acompanhar suas obras."
                        : "Faça upgrade para criar novas obras."}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {isLoading && (
                <>
                  <ObraCardSkeleton />
                  <ObraCardSkeleton />
                  <ObraCardSkeleton />
                  <ObraCardSkeleton />
                </>
              )}
            </>
          }
          ListEmptyComponent={!isLoading ? <HomeEmptyState /> : null}
        />

        <PressableScale
          style={styles.fab}
          scaleTo={0.92}
          onPress={handlePressCreate}
        >
          <MaterialIcons name="add" size={28} color={colors.white} />
        </PressableScale>

        <CreateProjectModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateProject}
          onRequireUpgrade={handleRequireUpgrade}
        />

        <UpgradeModal
          visible={modalMode !== null}
          onClose={() => setModalMode(null)}
          onRetry={
            modalMode === "plan_error"
              ? () => void refreshSubscription()
              : undefined
          }
          onViewObra={
            postCreateObraId
              ? () => {
                  router.push({ pathname: "/obra/[id]", params: { id: postCreateObraId } });
                  setModalMode(null);
                }
              : undefined
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeTop: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flatList: {
    backgroundColor: colors.primary,
  },
  listaContainer: {
    flexGrow: 1,
    paddingTop: 0,
    paddingBottom: spacing[100],
    backgroundColor: colors.bg,
  },
  filterWrapper: {
    marginBottom: spacing[4],
  },
  limitBanner: {
    marginHorizontal: spacing[16],
    marginBottom: spacing[10],
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: spacing[12],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[10],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
  },
  limitBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400E",
  },
  limitBannerText: {
    fontSize: 12,
    color: "#B45309",
  },
  loadingWrap: {
    paddingVertical: spacing[12],
  },
  fab: {
    position: "absolute",
    bottom: spacing[80],
    right: spacing[20],
    width: spacing[56],
    height: spacing[56],
    borderRadius: spacing[28],
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow(2, colors.primary),
  },
});
