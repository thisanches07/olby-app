import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HomeEmptyState } from "@/components/home/home-empty-state";
import { HomeFilterChips } from "@/components/home/home-filter-chips";
import { HomeHeader } from "@/components/home/home-header";
import { HomeSearchBar } from "@/components/home/home-search-bar";
import { ObraCard, StatusType } from "@/components/obra-card";
import { CreateProjectModal } from "@/components/projeto/create-project-modal";
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

  const { obras, isLoading, isRefreshing, addObra, loadInitial, refresh } =
    useProjects();
  const { plan, refresh: refreshSubscription } = useSubscription();
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
        Alert.alert(
          "Você atingiu o limite do plano Básico",
          `Agora você tem ${planLimit} obra(s) ativa(s). Para criar mais obras, faça upgrade para o plano Premium (Profissional).`,
          [
            {
              text: "Ver obra",
              onPress: () => {
                router.push({
                  pathname: "/obra/[id]",
                  params: { id: novaObra.id },
                });
              },
            },
            {
              text: "Fazer upgrade",
              onPress: openPlansForBlockedCreation,
            },
          ],
        );
        return;
      }

      router.push({ pathname: "/obra/[id]", params: { id: novaObra.id } });
    },
    [
      addObra,
      openPlansForBlockedCreation,
      ownedCount,
      plan?.code,
      planLimit,
      refreshSubscription,
    ],
  );

  const showBlockedCreateAlert = useCallback(() => {
    if (!isPlanKnown) {
      Alert.alert(
        "Assinatura indisponível",
        "Não foi possível validar seu plano agora. Verifique sua conexão e tente novamente.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Tentar novamente",
            onPress: () => {
              void refreshSubscription();
            },
          },
        ],
      );
      return;
    }

    if (isFreePlan) {
      Alert.alert(
        "Plano Gratuito",
        "No plano atual você pode acompanhar obras, mas não pode criar novas. Assine um plano para criar suas obras.",
        [
          { text: "Agora não", style: "cancel" },
          { text: "Ver planos", onPress: openPlansForBlockedCreation },
        ],
      );
      return;
    }

    const limitText =
      typeof planLimit === "number" && typeof ownedCount === "number"
        ? `Seu plano atual permite até ${planLimit} obra(s) ativa(s). Você já tem ${ownedCount}.`
        : "Você atingiu o limite do seu plano atual para obras ativas.";

    Alert.alert(
      "Limite de obras atingido",
      `${limitText}\n\nFaça upgrade para o plano Premium (Profissional) para criar mais obras.`,
      [
        { text: "Entendi", style: "cancel" },
        { text: "Fazer upgrade", onPress: openPlansForBlockedCreation },
      ],
    );
  }, [
    isFreePlan,
    isPlanKnown,
    openPlansForBlockedCreation,
    ownedCount,
    planLimit,
    refreshSubscription,
  ]);

  const handlePressCreate = useCallback(() => {
    if (canCreate) {
      setShowCreateModal(true);
      return;
    }

    // Free: botão aparece, mas ao acessar mostramos aviso e direcionamos para planos
    // Basic (limite): aviso profissional + direcionamento para upgrade
    showBlockedCreateAlert();
  }, [canCreate, showBlockedCreateAlert]);

  const handleRequireUpgrade = useCallback(() => {
    setShowCreateModal(false);
    showBlockedCreateAlert();
  }, [showBlockedCreateAlert]);

  return (
    <SafeAreaView style={styles.safeTop} edges={["top"]}>
      <StatusBar style="light" />

      <View style={styles.content}>
        <FlatList
          data={obrasFiltradas}
          keyExtractor={(item) => item.id}
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
          style={styles.flatList}
          contentContainerStyle={styles.listaContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
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
                <View style={styles.loadingWrap}>
                  <ActivityIndicator />
                </View>
              )}
            </>
          }
          ListEmptyComponent={!isLoading ? <HomeEmptyState /> : null}
        />

        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={handlePressCreate}
        >
          <MaterialIcons name="add" size={28} color={colors.white} />
        </TouchableOpacity>

        <CreateProjectModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateProject}
          onRequireUpgrade={handleRequireUpgrade}
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
