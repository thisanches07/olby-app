import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
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

import { useSubscription } from "@/contexts/subscription-context";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { shadow } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";
import {
  formatPrice,
  getStatusBadge,
  type PlanCode,
} from "@/services/subscription.service";

// ── Mapa de features por plano ────────────────────────────────────────────────

const PLAN_FEATURES: Record<PlanCode, { ok: boolean; text: string }[]> = {
  FREE: [
    { ok: true, text: "Visualizar obras como convidado (ilimitado)" },
    { ok: false, text: "Criar suas próprias obras" },
  ],
  BASIC: [
    { ok: true, text: "Criar até 3 obras ativas" },
    { ok: true, text: "Convidar clientes (ilimitado)" },
    { ok: true, text: "Diário de obra" },
    { ok: true, text: "Controle de despesas" },
    { ok: true, text: "Gestão de tarefas" },
  ],
  PRO: [
    { ok: true, text: "Obras ilimitadas" },
    { ok: true, text: "Convidar clientes (ilimitado)" },
    { ok: true, text: "Diário de obra" },
    { ok: true, text: "Controle de despesas" },
    { ok: true, text: "Gestão de tarefas" },
    { ok: true, text: "Suporte prioritário" },
  ],
};

const PLAN_LABELS: Record<PlanCode, string> = {
  FREE: "Gratuito",
  BASIC: "Básico",
  PRO: "Profissional",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function openSubscriptionManagement() {
  const url =
    Platform.OS === "ios"
      ? "itms-apps://apps.apple.com/account/subscriptions"
      : "https://play.google.com/store/account/subscriptions?package=com.tsanc.obraapp";
  void Linking.openURL(url);
}

// ── Alert banner para status problemáticos ────────────────────────────────────

function StatusAlert({ status, periodEnd }: {
  status: string | null;
  periodEnd: string | null;
}) {
  if (status === "GRACE" || status === "PAST_DUE") {
    return (
      <View style={[styles.alertBanner, styles.alertBannerWarning]}>
        <MaterialIcons name="warning" size={16} color="#92400E" />
        <Text style={[styles.alertText, styles.alertTextWarning]}>
          Houve um problema com seu pagamento. Atualize sua forma de pagamento
          para manter o acesso.
        </Text>
      </View>
    );
  }
  if (status === "CANCELED") {
    const date = formatDate(periodEnd);
    return (
      <View style={[styles.alertBanner, styles.alertBannerNeutral]}>
        <MaterialIcons name="info" size={16} color="#374151" />
        <Text style={[styles.alertText, styles.alertTextNeutral]}>
          Assinatura cancelada.
          {date ? ` Seu acesso continua até ${date}.` : ""}
        </Text>
      </View>
    );
  }
  if (status === "EXPIRED") {
    return (
      <View style={[styles.alertBanner, styles.alertBannerError]}>
        <MaterialIcons name="cancel" size={16} color="#991B1B" />
        <Text style={[styles.alertText, styles.alertTextError]}>
          Sua assinatura expirou. Assine novamente para continuar criando obras.
        </Text>
      </View>
    );
  }
  return null;
}

// ── Tela principal ────────────────────────────────────────────────────────────

export default function MyPlanScreen() {
  const { plan, isLoading, refresh } = useSubscription();

  const code = plan?.code ?? "FREE";
  const status = plan?.subscriptionStatus ?? null;
  const badge = getStatusBadge(status);
  const features = PLAN_FEATURES[code];
  const periodEnd = plan?.currentPeriodEnd ?? null;
  const trialEnd = plan?.trialEndsAt ?? null;
  const ownedCount = plan?.ownedProjectCount ?? 0;
  const limit = plan?.projectLimit ?? 0;
  const price = plan ? formatPrice(plan.priceCents) : "Grátis";

  const renewalDate = formatDate(periodEnd);
  const trialEndDate = formatDate(trialEnd);

  const hasActiveSubscription =
    status === "ACTIVE" ||
    status === "GRACE" ||
    status === "PAST_DUE" ||
    status === "CANCELED" ||
    status === "TRIAL";

  const usagePercent =
    limit > 0 ? Math.min(ownedCount / limit, 1) : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="light" />

      {/* NavBar */}
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
          onPress={refresh}
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
        {/* Alert de status problemático */}
        <StatusAlert status={status} periodEnd={periodEnd} />

        {/* Card principal do plano */}
        <View style={styles.planCard}>
          <View style={styles.planCardHeader}>
            <View>
              <Text style={styles.planName}>{PLAN_LABELS[code].toUpperCase()}</Text>
              <Text style={styles.planPrice}>{price}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: badge.color + "18" }]}>
              <View style={[styles.statusDot, { backgroundColor: badge.color }]} />
              <Text style={[styles.statusLabel, { color: badge.color }]}>
                {badge.label}
              </Text>
            </View>
          </View>

          {/* Data de renovação / trial */}
          {status === "ACTIVE" && renewalDate && (
            <View style={styles.dateRow}>
              <MaterialIcons name="event-repeat" size={14} color={colors.textMuted} />
              <Text style={styles.dateText}>Renova em {renewalDate}</Text>
            </View>
          )}
          {status === "TRIAL" && trialEndDate && (
            <View style={styles.dateRow}>
              <MaterialIcons name="event" size={14} color={colors.textMuted} />
              <Text style={styles.dateText}>Período de teste até {trialEndDate}</Text>
            </View>
          )}

          {/* Barra de uso de projetos */}
          {code !== "FREE" && limit > 0 && (
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
          )}

          {/* Obras ilimitadas para PRO */}
          {code === "PRO" && (
            <View style={styles.dateRow}>
              <MaterialIcons name="all-inclusive" size={14} color={colors.textMuted} />
              <Text style={styles.dateText}>Obras ilimitadas</Text>
            </View>
          )}
        </View>

        {/* O que está incluído */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>O que está incluído</Text>
          <View style={styles.featureList}>
            {features.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <MaterialIcons
                  name={f.ok ? "check-circle" : "cancel"}
                  size={17}
                  color={f.ok ? colors.success : colors.border}
                />
                <Text style={[styles.featureText, !f.ok && styles.featureTextOff]}>
                  {f.text}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Ações */}
        {hasActiveSubscription && code !== "FREE" && (
          <TouchableOpacity
            style={styles.manageButton}
            onPress={openSubscriptionManagement}
            activeOpacity={0.85}
          >
            <MaterialIcons
              name={Platform.OS === "ios" ? "apple" : "shop"}
              size={18}
              color={colors.white}
            />
            <Text style={styles.manageButtonText}>Gerenciar assinatura</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.plansButton,
            hasActiveSubscription && code !== "FREE" && styles.plansButtonSecondary,
          ]}
          onPress={() => router.push("/subscription/plans")}
          activeOpacity={0.85}
        >
          <MaterialIcons
            name="workspace-premium"
            size={18}
            color={hasActiveSubscription && code !== "FREE" ? colors.primary : colors.white}
          />
          <Text
            style={[
              styles.plansButtonText,
              hasActiveSubscription && code !== "FREE" && styles.plansButtonTextSecondary,
            ]}
          >
            {code === "FREE" ? "Assinar agora" : "Ver todos os planos"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

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
  alertBannerWarning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
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
  alertTextWarning: { color: "#92400E" },
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
    borderRadius: radius.full,
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
