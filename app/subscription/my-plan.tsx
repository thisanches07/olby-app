import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ToastRenderer } from "@/components/obra/toast";
import { CanceledAccessCard } from "@/components/subscription/canceled-access-card";
import { NoSubscriptionSheet, type NoSubscriptionSheetRef } from "@/components/subscription/no-subscription-sheet";
import { RoleQualificationSheet, type RoleQualificationSheetRef } from "@/components/subscription/role-qualification-sheet";
import { useSubscription } from "@/contexts/subscription-context";
import {
  formatPrice,
  formatSubscriptionDate,
  getStatusBadge,
  getSubscriptionStatusMessage,
  hasCanceledAccess,
  hasSubscriptionEntitlement,
  type PlanCode,
  type SubscriptionStatus,
} from "@/services/subscription.service";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { shadow } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";

const PLAN_FEATURES: Record<PlanCode, { ok: boolean; text: string }[]> = {
  FREE: [
    { ok: true, text: "Visualizar obras como convidado (ilimitado)" },
    { ok: false, text: "Criar suas proprias obras" },
  ],
  BASIC: [
    { ok: true, text: "Criar ate 3 obras ativas" },
    { ok: true, text: "Convidar clientes (ilimitado)" },
    { ok: true, text: "Diario de obra" },
    { ok: true, text: "Controle de despesas" },
    { ok: true, text: "Gestao de tarefas" },
  ],
  PRO: [
    { ok: true, text: "Obras ilimitadas" },
    { ok: true, text: "Convidar clientes (ilimitado)" },
    { ok: true, text: "Diario de obra" },
    { ok: true, text: "Controle de despesas" },
    { ok: true, text: "Gestao de tarefas" },
    { ok: true, text: "Suporte prioritario" },
  ],
};

const PLAN_LABELS: Record<PlanCode, string> = {
  FREE: "Gratuito",
  BASIC: "Basico",
  PRO: "Profissional",
};

function getAlertTone(status: SubscriptionStatus) {
  switch (status) {
    case "GRACE":
    case "CANCELED":
    case "TRIAL":
      return {
        container: styles.alertBannerInfo,
        text: styles.alertTextInfo,
        icon: "info",
        iconColor: "#1D4ED8",
      } as const;
    case "PAST_DUE":
      return {
        container: styles.alertBannerError,
        text: styles.alertTextError,
        icon: "warning",
        iconColor: "#991B1B",
      } as const;
    case "EXPIRED":
      return {
        container: styles.alertBannerError,
        text: styles.alertTextError,
        icon: "cancel",
        iconColor: "#991B1B",
      } as const;
    case "ACTIVE":
      return {
        container: styles.alertBannerSuccess,
        text: styles.alertTextSuccess,
        icon: "check-circle",
        iconColor: "#166534",
      } as const;
    case null:
      return {
        container: styles.alertBannerNeutral,
        text: styles.alertTextNeutral,
        icon: "workspace-premium",
        iconColor: "#374151",
      } as const;
  }
}

function StatusAlert(props: {
  status: SubscriptionStatus;
  periodEnd: string | null;
  trialEnd: string | null;
  accessUntil: string | null;
  isCanceled: boolean;
}) {
  const message = getSubscriptionStatusMessage({
    status: props.status,
    currentPeriodEnd: props.periodEnd,
    trialEndsAt: props.trialEnd,
    accessUntil: props.accessUntil,
    isCanceled: props.isCanceled,
  });

  if (!message) return null;

  const tone = getAlertTone(props.status);

  return (
    <View style={[styles.alertBanner, tone.container]}>
      <MaterialIcons name={tone.icon} size={16} color={tone.iconColor} />
      <Text style={[styles.alertText, tone.text]}>{message}</Text>
    </View>
  );
}

async function openSubscriptionManagement(refresh: () => Promise<void>) {
  const url =
    Platform.OS === "ios"
      ? "itms-apps://apps.apple.com/account/subscriptions"
      : "https://play.google.com/store/account/subscriptions?package=com.tsanc.obraapp";

  try {
    await Linking.openURL(url);
  } finally {
    void refresh();
  }
}

export default function MyPlanScreen() {
  const { plan, isLoading, refresh } = useSubscription();
  const roleQualificationSheetRef = useRef<RoleQualificationSheetRef>(null);
  const noSubscriptionSheetRef = useRef<NoSubscriptionSheetRef>(null);

  const code = plan?.code ?? "FREE";
  const status = plan?.subscriptionStatus ?? null;
  const badge = getStatusBadge({
    status,
    isCanceled: plan?.isCanceled ?? false,
  });
  const features = PLAN_FEATURES[code];
  const periodEnd = plan?.currentPeriodEnd ?? null;
  const trialEnd = plan?.trialEndsAt ?? null;
  const accessUntil = plan?.accessUntil ?? null;
  const canceledAt = plan?.canceledAt ?? null;
  const ownedCount = plan?.ownedProjectCount ?? 0;
  const limit = plan?.projectLimit ?? 0;
  const price = plan ? formatPrice(plan.priceCents) : "Gratis";

  const renewalDate = formatSubscriptionDate(periodEnd);
  const trialEndDate = formatSubscriptionDate(trialEnd);
  const hasEntitlement = hasSubscriptionEntitlement(status);
  const showCanceledAccessCard = hasCanceledAccess(plan);
  const usagePercent = limit > 0 ? Math.min(ownedCount / limit, 1) : 0;

  return (
    <BottomSheetModalProvider>
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="light" />

      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navBack}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Meu Plano</Text>
        <TouchableOpacity
          style={styles.navBack}
          onPress={() => void refresh()}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <MaterialIcons name="refresh" size={22} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!showCanceledAccessCard ? (
          <StatusAlert
            status={status}
            periodEnd={periodEnd}
            trialEnd={trialEnd}
            accessUntil={accessUntil}
            isCanceled={plan?.isCanceled ?? false}
          />
        ) : null}

        {showCanceledAccessCard && accessUntil ? (
          <CanceledAccessCard
            code={code}
            accessUntil={accessUntil}
            canceledAt={canceledAt}
          />
        ) : null}

        <View style={styles.planCard}>
          <View style={styles.planCardHeader}>
            <View>
              <Text style={styles.planName}>{PLAN_LABELS[code].toUpperCase()}</Text>
              <Text style={styles.planPrice}>{price}</Text>
            </View>
            <View
              style={[styles.statusBadge, { backgroundColor: `${badge.color}18` }]}
            >
              <View style={[styles.statusDot, { backgroundColor: badge.color }]} />
              <Text style={[styles.statusLabel, { color: badge.color }]}>
                {badge.label}
              </Text>
            </View>
          </View>

          {status === "ACTIVE" && renewalDate && !showCanceledAccessCard ? (
            <View style={styles.dateRow}>
              <MaterialIcons
                name="event-repeat"
                size={14}
                color={colors.textMuted}
              />
              <Text style={styles.dateText}>Renova em {renewalDate}</Text>
            </View>
          ) : null}

          {status === "TRIAL" && trialEndDate ? (
            <View style={styles.dateRow}>
              <MaterialIcons name="event" size={14} color={colors.textMuted} />
              <Text style={styles.dateText}>Trial ate {trialEndDate}</Text>
            </View>
          ) : null}

          {status === "CANCELED" && renewalDate ? (
            <View style={styles.dateRow}>
              <MaterialIcons
                name="event-busy"
                size={14}
                color={colors.textMuted}
              />
              <Text style={styles.dateText}>Acesso ate {renewalDate}</Text>
            </View>
          ) : null}

          {status === "GRACE" && renewalDate ? (
            <View style={styles.dateRow}>
              <MaterialIcons
                name="schedule"
                size={14}
                color={colors.textMuted}
              />
              <Text style={styles.dateText}>
                Acesso temporariamente mantido ate {renewalDate}
              </Text>
            </View>
          ) : null}

          {code !== "FREE" && limit > 0 ? (
            <View style={styles.usageSection}>
              <View style={styles.usageHeader}>
                <Text style={styles.usageLabel}>Obras ativas</Text>
                <Text style={styles.usageCount}>
                  {ownedCount} de {limit}
                </Text>
              </View>
              <View style={styles.usageBarBg}>
                <View
                  style={[
                    styles.usageBarFill,
                    {
                      width: `${usagePercent * 100}%` as `${number}%`,
                      backgroundColor:
                        usagePercent >= 1 ? colors.danger : colors.primary,
                    },
                  ]}
                />
              </View>
            </View>
          ) : null}

          {code === "PRO" ? (
            <View style={styles.dateRow}>
              <MaterialIcons
                name="all-inclusive"
                size={14}
                color={colors.textMuted}
              />
              <Text style={styles.dateText}>Obras ilimitadas</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>O que esta incluido</Text>
          <View style={styles.featureList}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <MaterialIcons
                  name={feature.ok ? "check-circle" : "cancel"}
                  size={17}
                  color={feature.ok ? colors.success : colors.border}
                />
                <Text
                  style={[styles.featureText, !feature.ok && styles.featureTextOff]}
                >
                  {feature.text}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {hasEntitlement && code !== "FREE" ? (
          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => void openSubscriptionManagement(refresh)}
            activeOpacity={0.85}
          >
            <MaterialIcons
              name={Platform.OS === "ios" ? "apple" : "shop"}
              size={18}
              color={colors.white}
            />
            <Text style={styles.manageButtonText}>Gerenciar assinatura</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[
            styles.plansButton,
            hasEntitlement && code !== "FREE" && styles.plansButtonSecondary,
          ]}
          onPress={() => {
            if (!hasEntitlement) {
              roleQualificationSheetRef.current?.open(
                () => router.push("/subscription/plans?source=my-plan"),
                () => noSubscriptionSheetRef.current?.open(),
              );
            } else {
              router.push("/subscription/plans?source=my-plan");
            }
          }}
          activeOpacity={0.85}
        >
          <MaterialIcons
            name="workspace-premium"
            size={18}
            color={hasEntitlement && code !== "FREE" ? colors.primary : colors.white}
          />
          <Text
            style={[
              styles.plansButtonText,
              hasEntitlement && code !== "FREE" && styles.plansButtonTextSecondary,
            ]}
          >
            {code === "FREE" ? "Assinar agora" : "Ver todos os planos"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <ToastRenderer topOffset={16} />
      <RoleQualificationSheet ref={roleQualificationSheetRef} />
      <NoSubscriptionSheet ref={noSubscriptionSheetRef} />
    </SafeAreaView>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    backgroundColor: colors.primary,
  },
  navBack: {
    width: 40,
    alignItems: "flex-start",
  },
  navTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: -0.3,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
  },
  scrollContent: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[24],
    paddingBottom: spacing[48],
    gap: spacing[16],
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[8],
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[12],
  },
  alertBannerSuccess: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
  },
  alertBannerInfo: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  alertBannerNeutral: {
    backgroundColor: "#F9FAFB",
    borderColor: colors.border,
  },
  alertBannerError: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  alertTextSuccess: { color: "#166534" },
  alertTextInfo: { color: "#1D4ED8" },
  alertTextNeutral: { color: "#374151" },
  alertTextError: { color: "#991B1B" },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.primaryBorderSoft,
    padding: spacing[20],
    gap: spacing[14],
    ...shadow(1),
  },
  planCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  planName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: spacing[4],
  },
  planPrice: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[5],
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[5],
    borderRadius: radius.pill,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
  },
  dateText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  usageSection: {
    gap: spacing[6],
  },
  usageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  usageLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "500",
  },
  usageCount: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "700",
  },
  usageBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  usageBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  featuresCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[20],
    ...shadow(1),
  },
  featuresTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: spacing[14],
  },
  featureList: {
    gap: spacing[10],
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  featureTextOff: {
    color: colors.subtext,
  },
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[8],
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.text,
    ...shadow(1),
  },
  manageButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
  plansButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[8],
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    ...shadow(2, colors.primary),
  },
  plansButtonSecondary: {
    backgroundColor: colors.tintBlue,
    shadowOpacity: 0,
    elevation: 0,
  },
  plansButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
  plansButtonTextSecondary: {
    color: colors.primary,
  },
});
