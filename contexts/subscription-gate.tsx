import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useSubscription } from "@/contexts/subscription-context";
import { setPlanErrorHandler } from "@/services/api";
import { hasSubscriptionEntitlement } from "@/services/subscription.service";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { getManagedElsewhereCopy } from "@/utils/subscription-cross-platform";

interface GatePayload {
  /** Ação que o usuário tentou fazer, ex.: "criar etapas". */
  action?: string | null;
  /** Mensagem vinda do backend (403), quando disparado de forma reativa. */
  message?: string | null;
}

interface GateContextValue {
  /** Abre o aviso de assinatura inativa (uso direto). */
  openSubscriptionGate: (payload?: GatePayload) => void;
  /**
   * Verifica se o usuário tem assinatura ativa. Se tiver, retorna `true` e o
   * caller segue com a ação. Se não, abre o modal (com o rótulo da ação) e
   * retorna `false` — o caller deve abortar.
   */
  requireSubscription: (action?: string) => boolean;
}

const SubscriptionGateContext = createContext<GateContextValue | null>(null);

export function SubscriptionGateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { plan } = useSubscription();
  const [payload, setPayload] = useState<GatePayload | null>(null);

  const openSubscriptionGate = useCallback((p?: GatePayload) => {
    setPayload(p ?? {});
  }, []);

  const requireSubscription = useCallback(
    (action?: string): boolean => {
      const active = hasSubscriptionEntitlement(
        plan?.subscriptionStatus ?? null,
      );
      if (active) return true;
      setPayload({ action: action ?? null });
      return false;
    },
    [plan?.subscriptionStatus],
  );

  // Rede de segurança: qualquer 403 de plano do backend abre o mesmo modal
  // (no lugar do antigo redirect direto para a tela de planos).
  useEffect(() => {
    setPlanErrorHandler((message) => setPayload({ message }));
    return () => setPlanErrorHandler(null);
  }, []);

  const value = useMemo<GateContextValue>(
    () => ({ openSubscriptionGate, requireSubscription }),
    [openSubscriptionGate, requireSubscription],
  );

  return (
    <SubscriptionGateContext.Provider value={value}>
      {children}
      <SubscriptionGateModal
        payload={payload}
        onClose={() => setPayload(null)}
      />
    </SubscriptionGateContext.Provider>
  );
}

export function useSubscriptionGate(): GateContextValue {
  const ctx = useContext(SubscriptionGateContext);
  if (!ctx) {
    throw new Error(
      "useSubscriptionGate must be used within a SubscriptionGateProvider",
    );
  }
  return ctx;
}

// ───────────────────────────── Modal ─────────────────────────────

function SubscriptionGateModal({
  payload,
  onClose,
}: {
  payload: GatePayload | null;
  onClose: () => void;
}) {
  const { plan } = useSubscription();
  const sheetRef = useRef<BottomSheetModal>(null);
  const pendingRef = useRef<(() => void) | null>(null);

  const visible = payload !== null;

  useEffect(() => {
    if (visible) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [visible]);

  const dismiss = (cb?: () => void) => {
    pendingRef.current = cb ?? null;
    sheetRef.current?.dismiss();
  };

  const handleDismiss = useCallback(() => {
    onClose();
    const cb = pendingRef.current;
    pendingRef.current = null;
    cb?.();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.55}
      />
    ),
    [],
  );

  // Regra cross-plataforma: assinatura gerenciada em outra plataforma
  // (PC/site, ou outra loja) → não dá pra assinar/gerenciar aqui.
  const managed = getManagedElsewhereCopy(plan?.provider ?? null);
  const action = payload?.action;
  const body = managed
    ? managed.body
    : action
      ? `Assine um plano para ${action}.`
      : payload?.message ||
        "Assine um plano para desbloquear este recurso e continuar.";
  const title = managed ? managed.title : "Assinatura inativa";

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.card}
    >
      <BottomSheetView style={styles.content}>
        <LinearGradient
          colors={managed ? ["#64748B", "#475569"] : ["#3B82F6", "#4F46E5"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.badge}
        >
          <MaterialIcons
            name={managed ? "devices" : "workspace-premium"}
            size={32}
            color="#FFFFFF"
          />
        </LinearGradient>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>

        {!managed && (
          <Text style={styles.note}>
            Planos a partir de R$ 79,90/mês — cancele quando quiser.
          </Text>
        )}

        {/* Sem assinatura, ou assinatura deste dispositivo → Ver planos.
            Gerenciada em outra plataforma → só Fechar + a mensagem acima. */}
        {!managed && (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.ctaShadow}
            onPress={() => dismiss(() => router.push("/subscription/plans"))}
          >
            <LinearGradient
              colors={["#3B82F6", "#4F46E5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              <MaterialIcons name="workspace-premium" size={18} color="#FFFFFF" />
              <Text style={styles.ctaText}>Ver planos</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {managed && managed.cta && (
          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            onPress={() =>
              dismiss(() => void WebBrowser.openBrowserAsync(managed.cta!.url))
            }
          >
            <MaterialIcons name="open-in-new" size={16} color={colors.primary} />
            <Text style={styles.secondaryText}>{managed.cta.label}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.cancelBtn}
          activeOpacity={0.7}
          onPress={() => dismiss()}
        >
          <Text style={styles.cancelText}>
            {managed ? "Fechar" : "Agora não"}
          </Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  content: {
    paddingHorizontal: spacing[24],
    paddingTop: spacing[8],
    paddingBottom: spacing[44],
    alignItems: "center",
  },
  badge: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[20],
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 8,
  },
  title: {
    fontSize: 21,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: spacing[10],
  },
  body: {
    fontSize: 14.5,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: spacing[8],
    paddingHorizontal: spacing[8],
  },
  note: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
    textAlign: "center",
    marginBottom: spacing[24],
  },
  ctaShadow: {
    width: "100%",
    borderRadius: radius.md,
    marginTop: spacing[4],
    marginBottom: spacing[10],
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  cta: {
    height: 54,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[8],
  },
  ctaText: { fontSize: 15.5, fontWeight: "800", color: "#FFFFFF" },
  secondaryBtn: {
    width: "100%",
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[6],
    marginBottom: spacing[8],
  },
  secondaryText: { fontSize: 14.5, fontWeight: "700", color: colors.primary },
  cancelBtn: {
    width: "100%",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 14.5, fontWeight: "700", color: colors.textMuted },
});
