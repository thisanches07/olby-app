import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useSubscription } from "@/contexts/subscription-context";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { shadow } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";

interface UpgradeModalProps {
  visible: boolean;
  /** Mensagem vinda do backend (erro 403). Se não passada, usa texto padrão. */
  backendMessage?: string;
  onClose: () => void;
  /**
   * Post-create: usuário acabou de criar a última obra permitida.
   * Quando definido, exibe variante de sucesso com CTA "Ver obra criada".
   */
  onViewObra?: () => void;
  /**
   * Error: plano não pôde ser carregado.
   * Quando definido, exibe variante de erro com CTA "Tentar novamente".
   */
  onRetry?: () => void;
}

export function UpgradeModal({
  visible,
  backendMessage,
  onClose,
  onViewObra,
  onRetry,
}: UpgradeModalProps) {
  const { plan } = useSubscription();

  const overlayAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      overlayAnim.setValue(0);
      slideAnim.setValue(400);
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  function dismiss(callback?: () => void) {
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      callback?.();
    });
  }

  function handleViewPlans() {
    dismiss(() => router.push("/subscription/plans"));
  }

  const cardStyle = [styles.card, { transform: [{ translateY: slideAnim }] }];

  // ── Shared overlay + wrapper ────────────────────────────────────────────
  function ModalShell({ children }: { children: React.ReactNode }) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => dismiss()}
      >
        <View style={styles.root}>
          <Animated.View
            style={[styles.overlay, { opacity: overlayAnim }]}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => dismiss()}
            />
          </Animated.View>

          <Animated.View style={cardStyle}>
            <View style={styles.handle} />
            {children}
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // ── Variante: erro de plano (sem conexão / indisponível) ────────────────
  if (onRetry) {
    return (
      <ModalShell>
        <View style={[styles.iconWrap, styles.iconWrapWarning]}>
          <MaterialIcons name="wifi-off" size={32} color="#D97706" />
        </View>
        <Text style={styles.title}>Assinatura indisponível</Text>
        <Text style={styles.body}>
          Não foi possível validar seu plano agora. Verifique sua conexão e
          tente novamente.
        </Text>
        <View style={styles.spacer} />
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => dismiss(onRetry)}
          activeOpacity={0.85}
        >
          <MaterialIcons
            name="refresh"
            size={18}
            color={colors.white}
            style={{ marginRight: spacing[6] }}
          />
          <Text style={styles.ctaText}>Tentar novamente</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => dismiss()}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </ModalShell>
    );
  }

  // ── Variante: limite atingido após criação (sucesso + upsell) ──────────
  if (onViewObra) {
    const planName = plan?.name ?? "Básico";
    const limit = plan?.projectLimit ?? 0;
    return (
      <ModalShell>
        <View style={[styles.iconWrap, styles.iconWrapSuccess]}>
          <MaterialIcons name="check-circle" size={36} color="#16A34A" />
        </View>
        <Text style={styles.title}>Obra criada com sucesso!</Text>
        <Text style={styles.body}>
          {`Você atingiu o limite de ${limit} obra${limit !== 1 ? "s" : ""} do plano ${planName}. Para criar mais, faça upgrade para o plano Profissional.`}
        </Text>
        <Text style={styles.upgradeNote}>
          Obras ilimitadas por R$ 129,90/mês.
        </Text>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => dismiss(onViewObra)}
          activeOpacity={0.85}
        >
          <MaterialIcons
            name="arrow-forward"
            size={18}
            color={colors.white}
            style={{ marginRight: spacing[6] }}
          />
          <Text style={styles.ctaText}>Ver obra criada</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.outlinedButton}
          onPress={handleViewPlans}
          activeOpacity={0.85}
        >
          <MaterialIcons
            name="workspace-premium"
            size={16}
            color={colors.primary}
            style={{ marginRight: spacing[6] }}
          />
          <Text style={styles.outlinedButtonText}>Fazer upgrade</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => dismiss()}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>Agora não</Text>
        </TouchableOpacity>
      </ModalShell>
    );
  }

  // ── Variante padrão: upgrade / desbloqueio ──────────────────────────────
  const isFree = !plan || plan.code === "FREE";
  const planName = plan?.name ?? "Gratuito";
  const limit = plan?.projectLimit ?? 0;
  const owned = plan?.ownedProjectCount ?? 0;

  let title: string;
  let body: string;
  let upgradeNote: string;

  if (isFree) {
    title = "Crie sua primeira obra";
    body = "Assine um plano para começar a gerenciar suas obras.";
    upgradeNote = "A partir de R$ 79,90/mês.";
  } else if (backendMessage) {
    title = "Limite de obras atingido";
    body = backendMessage;
    upgradeNote =
      "Faça upgrade para Profissional e crie obras ilimitadas por R$ 129,90/mês.";
  } else {
    title = "Limite de obras atingido";
    body = `Seu plano ${planName} permite até ${limit} obra${limit !== 1 ? "s" : ""} ativa${limit !== 1 ? "s" : ""}. Você já tem ${owned}.`;
    upgradeNote =
      "Faça upgrade para Profissional e crie obras ilimitadas por R$ 129,90/mês.";
  }

  return (
    <ModalShell>
      <View style={styles.iconWrap}>
        <Text style={styles.iconEmoji}>🏗️</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {!!upgradeNote && (
        <Text style={styles.upgradeNote}>{upgradeNote}</Text>
      )}
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={handleViewPlans}
        activeOpacity={0.85}
      >
        <MaterialIcons
          name="workspace-premium"
          size={18}
          color={colors.white}
          style={{ marginRight: spacing[6] }}
        />
        <Text style={styles.ctaText}>Ver planos de assinatura</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => dismiss()}
        activeOpacity={0.7}
      >
        <Text style={styles.cancelText}>Agora não</Text>
      </TouchableOpacity>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
    paddingHorizontal: spacing[24],
    paddingTop: spacing[12],
    paddingBottom: spacing[44],
    alignItems: "center",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing[24],
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.tintBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[20],
  },
  iconWrapWarning: {
    backgroundColor: "#FFFBEB",
  },
  iconWrapSuccess: {
    backgroundColor: "#F0FDF4",
  },
  iconEmoji: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: spacing[10],
  },
  body: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing[6],
  },
  upgradeNote: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
    textAlign: "center",
    marginBottom: spacing[28],
  },
  spacer: {
    height: spacing[20],
  },
  ctaButton: {
    width: "100%",
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[10],
    ...shadow(2, colors.primary),
  },
  ctaText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
  outlinedButton: {
    width: "100%",
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[6],
  },
  outlinedButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primary,
  },
  cancelButton: {
    width: "100%",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textMuted,
  },
});
