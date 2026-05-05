import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HomeEmptyState } from "@/components/home/home-empty-state";
import { ViewerWaitingCard } from "@/components/onboarding/viewer-waiting-card";
import { HomeFilterChips } from "@/components/home/home-filter-chips";
import { HomeHeader } from "@/components/home/home-header";
import { HomeSearchBar } from "@/components/home/home-search-bar";
import { ObraCard, StatusType } from "@/components/obra-card";
import { ObraCardSkeleton } from "@/components/obra/obra-card-skeleton";
import { CreateProjectModal } from "@/components/projeto/create-project-modal";
import { NoSubscriptionSheet, type NoSubscriptionSheetRef } from "@/components/subscription/no-subscription-sheet";
import { RoleQualificationSheet, type RoleQualificationSheetRef } from "@/components/subscription/role-qualification-sheet";
import { UpgradeModal } from "@/components/subscription/upgrade-modal";
import { FadeSlideIn } from "@/components/ui/fade-slide-in";
import { PressableScale } from "@/components/ui/pressable-scale";
import { useProjects } from "@/contexts/projects-context";
import { useSubscription } from "@/contexts/subscription-context";
import { useOnboarding } from "@/contexts/onboarding-context";
import type { ObraDetalhe } from "@/data/obras";
import { useAuth } from "@/hooks/use-auth";
import { shadow, spacing } from "@/theme";
import { colors } from "@/theme/colors";

const FILTROS: { label: string; value: StatusType | "todas" }[] = [
  { label: "Todas", value: "todas" },
  { label: "Em Andamento", value: "em_andamento" },
  { label: "Concluídas", value: "concluida" },
  { label: "Arquivadas", value: "pausada" },
];

export default function MinhasObrasScreen() {
  const { user, backendUserId, isLoading: authLoading } = useAuth();
  const { role, managerTourStep, managerTourCompleted, startManagerTour } = useOnboarding();
  const [busca, setBusca] = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState<StatusType | "todas">("todas");
  const [mode, setMode] = useState<"cliente" | "engenheiro">("cliente");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const roleQualificationSheetRef = useRef<RoleQualificationSheetRef>(null);
  const noSubscriptionSheetRef = useRef<NoSubscriptionSheetRef>(null);
  type ModalMode =
    | null
    | "plan_error"
    | "blocked_upgrade"
    | { type: "post_create"; obraId: string };
  const [modalMode, setModalMode] = useState<ModalMode>(null);

  const { obras, isLoading, isRefreshing, addObra, loadInitial, refresh } =
    useProjects();
  const {
    plan,
    isLoading: subscriptionLoading,
    refresh: refreshSubscription,
  } = useSubscription();
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
    const currentUserName = (user?.displayName ?? "").trim().toLowerCase();

    return obras.filter((obra) => {
      const matchMember =
        (obra.members ?? [])
          .filter((m) => {
            if (backendUserId && m.userId === backendUserId) return false;

            const memberName = (m.userName ?? "").trim().toLowerCase();
            const isCurrentUserByIdentity =
              !!currentUserName && memberName === currentUserName;

            return !isCurrentUserByIdentity;
          })
          .some((m) => (m.userName ?? "").toLowerCase().includes(query));

      const matchBusca =
        !query ||
        obra.nome.toLowerCase().includes(query) ||
        (obra.cliente || "").toLowerCase().includes(query) ||
        matchMember;

      const matchFiltro =
        filtroAtivo === "todas" || obra.status === filtroAtivo;

      return matchBusca && matchFiltro;
    });
  }, [obras, busca, filtroAtivo, backendUserId, user?.displayName]);

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

      // A tela da obra valida o papel real do usuário antes de mostrar o tour.
      if (!managerTourCompleted && managerTourStep === -1) {
        void startManagerTour();
      }

      router.push({ pathname: "/obra/[id]", params: { id: novaObra.id } });
    },
    [addObra, ownedCount, plan?.code, planLimit, refreshSubscription, managerTourCompleted, managerTourStep, startManagerTour],
  );

  const showBlockedCreateAlert = useCallback(() => {
    if (!isPlanKnown) {
      setModalMode("plan_error");
      return;
    }
    roleQualificationSheetRef.current?.open(
      () => setModalMode("blocked_upgrade"),
      () => noSubscriptionSheetRef.current?.open(),
    );
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
    modalMode !== null &&
    typeof modalMode === "object" &&
    modalMode.type === "post_create"
      ? modalMode.obraId
      : null;

  // Collapsing header
  const scrollY = useSharedValue(0);
  const compactHeaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [80, 150], [0, 1], Extrapolation.CLAMP),
    pointerEvents: scrollY.value > 80 ? "none" : "none",
  }));

  // FAB pulse — draws attention when manager has no obras and hasn't started the tour
  const fabScale = useSharedValue(1);
  const shouldPulseFab = role === "manager" && obras.length === 0 && managerTourStep === -1;
  useEffect(() => {
    if (shouldPulseFab) {
      fabScale.value = withRepeat(
        withSequence(
          withTiming(1.18, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        false,
      );
    } else {
      fabScale.value = withTiming(1, { duration: 200 });
    }
  }, [shouldPulseFab, fabScale]);
  const fabPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  return (
    <SafeAreaView style={styles.safeTop} edges={["top"]}>
      <StatusBar style="light" />

      <View style={styles.content}>
        <FlashList
          data={obrasFiltradas}
          keyExtractor={(item) => item.id}
          estimatedItemSize={185}
          renderItem={({ item, index }) => (
            <FadeSlideIn index={index}>
              <ObraCard
                obra={item}
                onPress={() =>
                  router.push({
                    pathname: "/obra/[id]",
                    params: { id: item.id },
                  })
                }
                onViewDiary={() =>
                  router.push({
                    pathname: "/diario/[id]",
                    params: { id: item.id },
                  })
                }
              />
            </FadeSlideIn>
          )}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          style={styles.flatList}
          contentContainerStyle={styles.listaContainer}
          onScroll={(e) => {
            scrollY.value = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
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
          ListEmptyComponent={
            !isLoading
              ? role === "viewer"
                ? <ViewerWaitingCard />
                : <HomeEmptyState />
              : null
          }
        />

        <Animated.View style={[styles.fabWrapper, fabPulseStyle]}>
          <PressableScale
            style={styles.fab}
            scaleTo={0.92}
            onPress={handlePressCreate}
          >
            <MaterialIcons name="add" size={28} color={colors.white} />
          </PressableScale>
        </Animated.View>

        <CreateProjectModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateProject}
          onRequireUpgrade={handleRequireUpgrade}
        />

        <RoleQualificationSheet ref={roleQualificationSheetRef} />
        <NoSubscriptionSheet ref={noSubscriptionSheetRef} />

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
                  router.push({
                    pathname: "/obra/[id]",
                    params: { id: postCreateObraId },
                  });
                  setModalMode(null);
                }
              : undefined
          }
        />
      </View>

      {/* Compact header que faz fade-in quando o HomeHeader sai do viewport */}
      <Animated.View
        style={[styles.compactHeader, compactHeaderStyle]}
        pointerEvents="none"
      >
        <Text style={styles.compactTitle}>Minhas Obras</Text>
      </Animated.View>
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
  fabWrapper: {
    position: "absolute",
    bottom: spacing[80],
    right: spacing[20],
  },
  fab: {
    width: spacing[56],
    height: spacing[56],
    borderRadius: spacing[28],
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow(2, colors.primary),
  },
  compactHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 52,
    backgroundColor: "#1D4ED8",
    alignItems: "center",
    justifyContent: "center",
  },
  compactTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    fontFamily: "Inter-Bold",
  },
});
