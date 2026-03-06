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
}

export function UpgradeModal({
  visible,
  backendMessage,
  onClose,
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

  // ── Build message ──────────────────────────────────────────────────────────
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
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => dismiss()}
    >
      <View style={styles.root}>
        {/* Overlay */}
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

        {/* Card */}
        <Animated.View
          style={[styles.card, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.handle} />

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
        </Animated.View>
      </View>
    </Modal>
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
