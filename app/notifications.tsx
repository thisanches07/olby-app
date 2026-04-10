import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { usePushNotifications } from "@/hooks/use-push-notifications";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { shadow } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";

function getPermissionCopy(
  permissionState: ReturnType<typeof usePushNotifications>["permissionState"],
) {
  switch (permissionState) {
    case "granted":
      return {
        title: "Notificações ativas",
        description:
          "Seu aparelho já está pronto para receber alertas de gastos, tarefas, diário e mudanças de status.",
        tone: "#DCFCE7",
        icon: "notifications-active",
        iconColor: colors.success,
      };
    case "denied":
      return {
        title: "Permissão recusada",
        description:
          "Você recusou o pedido no sistema. Ainda podemos tentar novamente por aqui enquanto o aparelho permitir.",
        tone: "#FEF3C7",
        icon: "notifications-paused",
        iconColor: "#B45309",
      };
    case "blocked":
      return {
        title: "Permissão bloqueada",
        description:
          "O sistema não permite pedir novamente no app. Abra as configurações para reativar os alertas.",
        tone: "#FEE2E2",
        icon: "mobile-off",
        iconColor: colors.danger,
      };
    default:
      return {
        title: "Notificações ainda não ativadas",
        description:
          "O pedido nativo é feito logo após o login para alinhar ativação e registro do aparelho desde o início da conta.",
        tone: "#DBEAFE",
        icon: "notifications-none",
        iconColor: colors.primary,
      };
  }
}

export default function NotificationsScreen() {
  const {
    canAskAgain,
    isSyncingToken,
    lastOpenedNotification,
    openSystemSettings,
    permissionState,
    requestPermission,
    syncNow,
  } = usePushNotifications();

  const copy = getPermissionCopy(permissionState);
  const shouldOpenSettings =
    permissionState === "blocked" ||
    (permissionState === "denied" && !canAskAgain);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>Notificações</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={[styles.heroIconWrap, { backgroundColor: copy.tone }]}>
            <MaterialIcons
              name={copy.icon as never}
              size={26}
              color={copy.iconColor}
            />
          </View>
          <Text style={styles.heroTitle}>{copy.title}</Text>
          <Text style={styles.heroDescription}>{copy.description}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>Melhor momento</Text>
          <Text style={styles.sectionTitle}>Solicitação no pós-login</Text>
          <Text style={styles.bodyText}>
            O app pede a permissão nativa assim que a sessão é autenticada e o
            usuário já está identificado no backend. Isso evita telas extras,
            sincroniza o token no momento certo e deixa o fluxo mais profissional.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>O que você recebe</Text>
          <Text style={styles.listItem}>Novos gastos lançados no projeto</Text>
          <Text style={styles.listItem}>Novas tarefas e tarefas concluídas</Text>
          <Text style={styles.listItem}>Novos registros diários de obra</Text>
          <Text style={styles.listItem}>
            Mudanças de status: ACTIVE, COMPLETED e ARCHIVED
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>Ações</Text>
          <Pressable
            style={[styles.primaryButton, isSyncingToken && styles.buttonDisabled]}
            onPress={() => {
              if (shouldOpenSettings) {
                void openSystemSettings();
                return;
              }

              void requestPermission();
            }}
            disabled={isSyncingToken}
          >
            {isSyncingToken ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {shouldOpenSettings ? "Abrir configurações" : "Ativar notificações"}
              </Text>
            )}
          </Pressable>

          {permissionState === "granted" ? (
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                void syncNow();
              }}
            >
              <Text style={styles.secondaryButtonText}>
                Sincronizar este aparelho
              </Text>
            </Pressable>
          ) : null}
        </View>

        {lastOpenedNotification ? (
          <View style={styles.card}>
            <Text style={styles.sectionEyebrow}>Última abertura contextual</Text>
            <Text style={styles.detailText}>
              Tipo: {lastOpenedNotification.type}
            </Text>
            <Text style={styles.detailText}>
              Projeto: {lastOpenedNotification.projectId}
            </Text>
            <Text style={styles.detailText}>
              Entidade: {lastOpenedNotification.entityType ?? "n/a"} /{" "}
              {lastOpenedNotification.entityId ?? "n/a"}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  navTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing[16],
    gap: spacing[14],
  },
  heroCard: {
    padding: spacing[24],
    borderRadius: radius["2xl"],
    backgroundColor: colors.surface,
    gap: spacing[12],
    ...shadow(2),
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  heroDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  card: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing[18],
    gap: spacing[8],
    ...shadow(1),
  },
  sectionEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  bodyText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  listItem: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    ...shadow(2),
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tintBlue,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  detailText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
