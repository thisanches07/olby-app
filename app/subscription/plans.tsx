import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Constants from "expo-constants";
import type { ProductSubscription, Purchase } from "expo-iap";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useToast } from "@/components/obra/toast";
import { useSubscription } from "@/contexts/subscription-context";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { shadow } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";

const PLANS = [
  {
    code: "FREE" as const,
    label: "Gratuito",
    price: "R$ 0",
    priceNote: "",
    emoji: "",
    features: [
      { ok: true, text: "Visualizar obras como convidado (ilimitado)" },
      { ok: false, text: "Criar suas proprias obras" },
    ],
    productId: null,
    highlight: false,
  },
  {
    code: "BASIC" as const,
    label: "Basico",
    price: "R$ 79,90",
    priceNote: "/mes",
    emoji: "STAR",
    features: [
      { ok: true, text: "Criar ate 3 obras ativas" },
      { ok: true, text: "Convidar clientes (ilimitado)" },
      { ok: true, text: "Diario de obra" },
      { ok: true, text: "Controle de despesas" },
      { ok: true, text: "Gestao de tarefas" },
    ],
    productId: "com.tsanc.obraapp.sub.basic1",
    highlight: true,
  },
  {
    code: "PRO" as const,
    label: "Profissional",
    price: "R$ 129,90",
    priceNote: "/mes",
    emoji: "PRO",
    features: [
      { ok: true, text: "Obras ilimitadas" },
      { ok: true, text: "Tudo do plano Basico" },
      { ok: true, text: "Suporte prioritario" },
    ],
    productId: "com.tsanc.obraapp.sub.pro",
    highlight: false,
  },
] as const;

const STORE_SUBSCRIPTION_SKUS: string[] = PLANS.flatMap((plan) =>
  plan.productId ? [plan.productId] : [],
);

const IS_EXPO_GO =
  Constants.executionEnvironment === "storeClient" ||
  Constants.appOwnership === "expo";

function normalizeStorePrice(
  plan: (typeof PLANS)[number],
  subscriptions: ProductSubscription[],
): { price: string; priceNote: string } {
  if (!plan.productId) return { price: plan.price, priceNote: plan.priceNote };

  const storeProduct = subscriptions.find((s) => s.id === plan.productId);
  if (!storeProduct?.displayPrice) {
    return { price: plan.price, priceNote: plan.priceNote };
  }

  return { price: storeProduct.displayPrice, priceNote: "" };
}

function purchaseKeyFromPurchase(purchase: Purchase): string {
  return [
    purchase.store || purchase.platform || Platform.OS,
    purchase.transactionId || purchase.purchaseToken || purchase.id,
  ].join(":");
}

function isAppleSandboxPurchase(purchase: Purchase): boolean {
  const environmentIOS = (
    purchase as Purchase & { environmentIOS?: string | null }
  ).environmentIOS;

  return (
    typeof environmentIOS === "string" &&
    environmentIOS.toLowerCase().includes("sandbox")
  );
}

function toFriendlyMessage(
  message: string | null,
  fallback: string,
): string | null {
  if (!message) return null;

  const normalized = message.toLowerCase();
  if (normalized.includes("sessao") || normalized.includes("401")) {
    return "Sessao expirada. Façalogin novamente.";
  }
  if (
    normalized.includes("compra invalida") ||
    normalized.includes("produto nao mapeado") ||
    normalized.includes("invalid_purchase") ||
    normalized.includes("400")
  ) {
    return "Compra invalida ou produto nao mapeado.";
  }
  if (
    normalized.includes("erro temporario no servidor") ||
    normalized.includes("500") ||
    normalized.includes("502") ||
    normalized.includes("503")
  ) {
    return "Erro temporario no servidor. Tente novamente.";
  }
  if (normalized.includes("cancel")) {
    return "Operacao cancelada.";
  }
  if (
    normalized.includes("request failed") ||
    normalized.includes("network") ||
    normalized.includes("internet")
  ) {
    return "Sem conexao com a internet. Verifique sua rede e tente novamente.";
  }
  if (normalized.includes("json") || normalized.includes("unexpected")) {
    return fallback;
  }

  return message;
}

function ExpoGoIapUnavailable() {
  return (
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
        <Text style={styles.navTitle}>Escolha seu plano</Text>
        <View style={styles.navBack} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroSub}>
            Compras in-app nao funcionam no Expo Go.
          </Text>
        </View>

        <View style={[styles.feedbackCard, styles.feedbackCardError]}>
          <Text style={[styles.feedbackText, styles.feedbackTextError]}>
            Para testar assinatura local no iPhone, abra este app usando um Dev
            Client.
          </Text>
        </View>

        <View style={styles.storeCard}>
          <Text style={styles.storeTitle}>
            Como testar sem rebuild continuo
          </Text>
          <Text style={styles.storeDescription}>
            1. Gere o Dev Client uma vez com `npm run ios:dev:build`.
          </Text>
          <Text style={styles.storeDescription}>
            2. Rode o bundle local com `npm run start:dev-client`.
          </Text>
          <Text style={styles.storeDescription}>
            3. Abra o Dev Client no iPhone e conecte no projeto.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SubscriptionPlansIapEnabled() {
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ reason?: string }>();
  const {
    plan,
    error,
    isVerifyingPurchase,
    purchaseError,
    purchaseSuccess,
    refresh,
    verifyApplePurchase,
    verifyGooglePurchase,
    clearPurchaseFeedback,
  } = useSubscription();

  const [isRequestingPurchase, setIsRequestingPurchase] = React.useState(false);
  const [isLoadingStoreProducts, setIsLoadingStoreProducts] =
    React.useState(false);
  const [storeError, setStoreError] = React.useState<string | null>(null);
  const [incomingPurchase, setIncomingPurchase] =
    React.useState<Purchase | null>(null);
  const processedPurchasesRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    // Contrato: ao abrir a tela, sincroniza sempre o plano atual.
    void refresh();
  }, [refresh]);

  // Expo Go nao inclui o modulo nativo do IAP.
  // Carregamos apenas no fluxo Dev Client/standalone.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useIAP } = require("expo-iap") as typeof import("expo-iap");

  const {
    connected,
    subscriptions,
    availablePurchases,
    fetchProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: (purchase) => {
      setIncomingPurchase(purchase);
    },
    onPurchaseError: (iapError) => {
      const message =
        toFriendlyMessage(iapError.message, "A compra nao foi concluida.") ??
        "A compra nao foi concluida.";
      showToast({
        title: "Compra cancelada",
        message,
        tone: "error",
      });
      setIsRequestingPurchase(false);
    },
    onError: (iapError) => {
      setStoreError(
        toFriendlyMessage(iapError.message, "Falha na conexao com a loja.") ??
          "Falha na conexao com a loja.",
      );
    },
  });

  const processPurchase = React.useCallback(
    async (purchase: Purchase) => {
      if (!STORE_SUBSCRIPTION_SKUS.includes(purchase.productId)) return;

      const purchaseKey = purchaseKeyFromPurchase(purchase);
      if (processedPurchasesRef.current.has(purchaseKey)) return;
      processedPurchasesRef.current.add(purchaseKey);

      try {
        clearPurchaseFeedback();
        const normalizedStore =
          purchase.store === "apple" || purchase.store === "google"
            ? purchase.store
            : purchase.platform === "ios"
              ? "apple"
              : purchase.platform === "android"
                ? "google"
                : Platform.OS === "ios"
                  ? "apple"
                  : Platform.OS === "android"
                    ? "google"
                    : null;

        if (normalizedStore === "apple") {
          const transactionId = purchase.transactionId;
          if (!transactionId) {
            throw new Error("Transacao iOS sem transactionId.");
          }
          await verifyApplePurchase(
            transactionId,
            isAppleSandboxPurchase(purchase),
          );
        } else if (normalizedStore === "google") {
          const purchaseToken = purchase.purchaseToken;
          if (!purchaseToken) {
            throw new Error("Compra Android sem purchaseToken.");
          }
          await verifyGooglePurchase(purchaseToken);
        } else {
          throw new Error("Loja de compra nao suportada.");
        }

        await finishTransaction({ purchase, isConsumable: false });
      } catch (purchaseProcessError: unknown) {
        processedPurchasesRef.current.delete(purchaseKey);
        const rawMessage =
          purchaseProcessError instanceof Error
            ? purchaseProcessError.message
            : null;
        const message =
          toFriendlyMessage(rawMessage, "Falha ao validar sua compra.") ??
          "Falha ao validar sua compra.";
        showToast({
          title: "Erro na assinatura",
          message,
          tone: "error",
        });
      }
    },
    [
      clearPurchaseFeedback,
      finishTransaction,
      showToast,
      verifyApplePurchase,
      verifyGooglePurchase,
    ],
  );

  React.useEffect(() => {
    if (Platform.OS === "web") return;
    if (!connected) return;

    let mounted = true;
    void (async () => {
      try {
        setStoreError(null);
        setIsLoadingStoreProducts(true);
        await fetchProducts({ skus: STORE_SUBSCRIPTION_SKUS, type: "subs" });
      } catch (fetchError: unknown) {
        if (!mounted) return;
        const rawMessage =
          fetchError instanceof Error ? fetchError.message : null;
        setStoreError(
          toFriendlyMessage(
            rawMessage,
            "Nao foi possivel carregar os produtos da loja.",
          ) ?? "Nao foi possivel carregar os produtos da loja.",
        );
      } finally {
        if (mounted) {
          setIsLoadingStoreProducts(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [connected, fetchProducts]);

  React.useEffect(() => {
    if (!incomingPurchase) return;
    void processPurchase(incomingPurchase);
  }, [incomingPurchase, processPurchase]);

  React.useEffect(() => {
    if (!availablePurchases.length) return;
    for (const purchase of availablePurchases) {
      void processPurchase(purchase);
    }
  }, [availablePurchases, processPurchase]);

  React.useEffect(() => {
    if (!isVerifyingPurchase) {
      setIsRequestingPurchase(false);
    }
  }, [isVerifyingPurchase]);

  const currentCode = plan?.code ?? "FREE";
  const disableAllActions =
    isRequestingPurchase || isVerifyingPurchase || isLoadingStoreProducts;
  const rawReason = Array.isArray(params.reason)
    ? params.reason[0]
    : params.reason;
  const reasonMessage =
    rawReason === "free_required"
      ? "Assine um plano para criar e acompanhar suas obras."
      : rawReason === "project_limit_reached"
        ? "Voce atingiu o limite do seu plano atual. Façaupgrade para continuar criando obras."
        : null;
  const subscriptionError = toFriendlyMessage(
    error,
    "Nao foi possivel carregar sua assinatura agora.",
  );
  const friendlyStoreError = toFriendlyMessage(
    storeError,
    "Nao foi possivel conectar com a loja no momento.",
  );
  const friendlyPurchaseError = toFriendlyMessage(
    purchaseError,
    "Nao foi possivel concluir a compra.",
  );

  async function handleSubscribe(planItem: (typeof PLANS)[number]) {
    if (planItem.code === "FREE" || !planItem.productId) return;

    if (Platform.OS === "web") {
      showToast({
        title: "Indisponivel na web",
        message: "Assinatura deve ser feita no app iOS ou Android.",
        tone: "info",
      });
      return;
    }

    if (!connected) {
      showToast({
        title: "Loja indisponivel",
        message: "Nao foi possivel conectar na App Store/Google Play.",
        tone: "error",
      });
      return;
    }

    const storeProduct = subscriptions.find((s) => s.id === planItem.productId);
    if (!storeProduct) {
      showToast({
        title: "Produto nao encontrado",
        message: "Confirme se o SKU existe e esta ativo na loja.",
        tone: "error",
      });
      return;
    }

    try {
      clearPurchaseFeedback();
      setStoreError(null);
      setIsRequestingPurchase(true);

      if (Platform.OS === "ios") {
        await requestPurchase({
          type: "subs",
          request: {
            apple: { sku: planItem.productId },
          },
        });
      } else {
        const firstOfferToken =
          storeProduct.subscriptionOffers?.[0]?.offerTokenAndroid;
        await requestPurchase({
          type: "subs",
          request: {
            google: {
              skus: [planItem.productId],
              ...(firstOfferToken
                ? {
                    subscriptionOffers: [
                      { sku: planItem.productId, offerToken: firstOfferToken },
                    ],
                  }
                : {}),
            },
          },
        });
      }
    } catch (requestError: unknown) {
      const rawMessage =
        requestError instanceof Error ? requestError.message : null;
      const message =
        toFriendlyMessage(rawMessage, "Falha ao iniciar compra.") ??
        "Falha ao iniciar compra.";
      showToast({
        title: "Erro ao comprar",
        message,
        tone: "error",
      });
      setIsRequestingPurchase(false);
    }
  }

  return (
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
        <Text style={styles.navTitle}>Escolha seu plano</Text>
        <View style={styles.navBack} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {reasonMessage ? (
          <View style={[styles.feedbackCard, styles.feedbackCardInfo]}>
            <Text style={[styles.feedbackText, styles.feedbackTextInfo]}>
              {reasonMessage}
            </Text>
          </View>
        ) : null}

        {subscriptionError ? (
          <View style={[styles.feedbackCard, styles.feedbackCardError]}>
            <Text style={[styles.feedbackText, styles.feedbackTextError]}>
              {subscriptionError}
            </Text>
          </View>
        ) : null}

        {friendlyStoreError ? (
          <View style={[styles.feedbackCard, styles.feedbackCardError]}>
            <Text style={[styles.feedbackText, styles.feedbackTextError]}>
              {friendlyStoreError}
            </Text>
          </View>
        ) : null}

        {(friendlyPurchaseError || purchaseSuccess) && (
          <View
            style={[
              styles.feedbackCard,
              friendlyPurchaseError
                ? styles.feedbackCardError
                : styles.feedbackCardSuccess,
            ]}
          >
            <Text
              style={[
                styles.feedbackText,
                friendlyPurchaseError
                  ? styles.feedbackTextError
                  : styles.feedbackTextSuccess,
              ]}
            >
              {friendlyPurchaseError ?? purchaseSuccess}
            </Text>
          </View>
        )}

        {PLANS.map((planItem) => {
          const isCurrent = planItem.code === currentCode;
          const isHighlight = planItem.highlight;
          const pricing = normalizeStorePrice(planItem, subscriptions);

          return (
            <View
              key={planItem.code}
              style={[
                styles.planCard,
                isHighlight && styles.planCardHighlight,
                isCurrent && styles.planCardCurrent,
              ]}
            >
              {isHighlight && !isCurrent && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>Mais popular</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <View style={styles.planLabelRow}>
                  {planItem.emoji ? (
                    <Text style={styles.planEmoji}>{planItem.emoji}</Text>
                  ) : null}
                  <Text
                    style={[
                      styles.planName,
                      isHighlight && styles.planNameHighlight,
                    ]}
                  >
                    {planItem.label.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.planPriceRow}>
                  <Text
                    style={[
                      styles.planPrice,
                      isHighlight && styles.planPriceHighlight,
                    ]}
                  >
                    {pricing.price}
                  </Text>
                  {pricing.priceNote ? (
                    <Text style={styles.planPriceNote}>
                      {pricing.priceNote}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.featureList}>
                {planItem.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <MaterialIcons
                      name={feature.ok ? "check-circle" : "cancel"}
                      size={18}
                      color={feature.ok ? colors.success : colors.border}
                    />
                    <Text
                      style={[
                        styles.featureText,
                        !feature.ok && styles.featureTextOff,
                      ]}
                    >
                      {feature.text}
                    </Text>
                  </View>
                ))}
              </View>

              {isCurrent ? (
                <View style={styles.currentBadge}>
                  <MaterialIcons
                    name="check"
                    size={15}
                    color={colors.primary}
                  />
                  <Text style={styles.currentBadgeText}>Plano atual</Text>
                </View>
              ) : planItem.code !== "FREE" ? (
                <TouchableOpacity
                  style={[
                    styles.subscribeButton,
                    isHighlight && styles.subscribeButtonHighlight,
                    disableAllActions && styles.subscribeButtonDisabled,
                  ]}
                  onPress={() => handleSubscribe(planItem)}
                  activeOpacity={0.85}
                  disabled={disableAllActions}
                >
                  {disableAllActions ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={styles.subscribeButtonText}>
                      Assinar por {pricing.price}
                      {pricing.priceNote}
                    </Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}

        <View style={styles.footer}>
          <MaterialIcons name="lock" size={14} color={colors.textMuted} />
          <Text style={styles.footerText}>
            Pagamento seguro via App Store / Google Play
          </Text>
        </View>
        <Text style={styles.footerSub}>Cancele quando quiser</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function SubscriptionPlansScreen() {
  if (IS_EXPO_GO) {
    return <ExpoGoIapUnavailable />;
  }

  return <SubscriptionPlansIapEnabled />;
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
  },
  hero: {
    alignItems: "center",
    marginBottom: spacing[24],
  },
  heroSub: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  storeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[14],
    marginBottom: spacing[16],
    ...shadow(1),
  },
  storeTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.title,
    marginBottom: spacing[8],
  },
  storeDescription: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  restoreButton: {
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing[10],
  },
  restoreButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  feedbackCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[12],
    marginBottom: spacing[12],
  },
  feedbackCardError: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
  },
  feedbackCardInfo: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  feedbackCardSuccess: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
  },
  feedbackText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  feedbackTextError: {
    color: "#B91C1C",
  },
  feedbackTextInfo: {
    color: "#1D4ED8",
  },
  feedbackTextSuccess: {
    color: "#166534",
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing[16],
    padding: spacing[20],
    overflow: "hidden",
    ...shadow(1),
  },
  planCardHighlight: {
    borderColor: colors.primary,
    borderWidth: 2,
    ...shadow(2, colors.primary),
  },
  planCardCurrent: {
    borderColor: colors.success,
    borderWidth: 2,
  },
  popularBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderBottomLeftRadius: radius.md,
    borderTopRightRadius: radius.xl,
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 0.3,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[14],
  },
  planLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
  },
  planEmoji: {
    fontSize: 18,
  },
  planName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.title,
    letterSpacing: 0.5,
  },
  planNameHighlight: {
    color: colors.primary,
  },
  planPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  planPriceHighlight: {
    color: colors.primary,
  },
  planPriceNote: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "500",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: spacing[14],
  },
  featureList: {
    gap: spacing[10],
    marginBottom: spacing[20],
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
  subscribeButton: {
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow(2, colors.primary),
  },
  subscribeButtonHighlight: {
    backgroundColor: colors.primary,
  },
  subscribeButtonDisabled: {
    opacity: 0.7,
  },
  verifyButtonDisabled: {
    opacity: 0.65,
  },
  subscribeButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
  currentBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[6],
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.tintBlue,
    borderWidth: 1,
    borderColor: colors.primaryBorderSoft,
  },
  currentBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[4],
    marginTop: spacing[8],
    marginBottom: spacing[4],
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  footerSub: {
    fontSize: 12,
    color: colors.subtext,
    textAlign: "center",
  },
});
