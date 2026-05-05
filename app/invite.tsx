import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/hooks/use-auth";
import { useAppSession } from "@/hooks/use-app-session";
import { useOnboarding } from "@/contexts/onboarding-context";
import { ApiError } from "@/services/api";
import { invitesService } from "@/services/invites.service";
import { pendingInviteToken } from "@/utils/pending-invite";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";

// ─── Estado da tela ───────────────────────────────────────────────────────────

type ScreenState =
  | { kind: "loading" }
  | { kind: "no_token" }
  | { kind: "needs_login" }
  | { kind: "accepting" }
  | { kind: "success"; projectId: string }
  | { kind: "error"; message: string };

// ─── Mensagem de erro por status HTTP ────────────────────────────────────────

function resolveErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.status) {
      case 410:
        return "Esse link expirou. Peça um novo link ao responsável da obra.";
      case 409:
        return "Esse link já foi utilizado. Cada link funciona uma única vez.";
      case 404:
        return "Link inválido. Verifique se o link está correto.";
      case 403:
        return "Você não tem permissão para aceitar este convite.";
      default:
        break;
    }
  }
  return "Não foi possível aceitar o convite. Tente novamente.";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { setRole } = useAppSession();
  const { isRoleSelected, selectRole } = useOnboarding();
  const [state, setState] = useState<ScreenState>({ kind: "loading" });
  const hasStartedAcceptRef = useRef(false);

  const acceptInvite = useCallback(async (inviteToken: string) => {
    setState({ kind: "accepting" });
    try {
      const result = await invitesService.accept(inviteToken);
      setRole("cliente");
      if (!isRoleSelected) {
        await selectRole("viewer");
      }
      setState({ kind: "success", projectId: result.projectId });
    } catch (err) {
      setState({ kind: "error", message: resolveErrorMessage(err) });
    }
  }, [isRoleSelected, selectRole, setRole]);

  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      setState({ kind: "no_token" });
      return;
    }

    if (!user) {
      setState({ kind: "needs_login" });
      return;
    }

    if (hasStartedAcceptRef.current) return;
    hasStartedAcceptRef.current = true;
    void acceptInvite(token);
  }, [acceptInvite, authLoading, user, token]);

  async function handleLoginRedirect() {
    if (token) {
      await pendingInviteToken.set(token);
    }
    router.replace("/login");
  }

  function handleClose() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  }

  function handleGoToProject(projectId: string) {
    router.replace({ pathname: "/obra/[id]", params: { id: projectId } });
  }

  // ── Renders ──────────────────────────────────────────────────────────────

  const isBlocking =
    state.kind === "loading" || state.kind === "accepting" || authLoading;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      {/* Drag handle — visual de modal */}
      <View style={styles.dragHandleWrap}>
        <View style={styles.dragHandle} />
      </View>

      {/* Botão fechar — disponível exceto durante operações bloqueantes */}
      {!isBlocking && (
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialIcons name="close" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* Loading inicial (verificando auth) */}
      {(state.kind === "loading" || authLoading) && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Verificando convite...</Text>
        </View>
      )}

      {/* Aceitando convite */}
      {state.kind === "accepting" && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Aceitando convite...</Text>
          <Text style={styles.loadingSubtext}>
            Aguarde enquanto configuramos seu acesso.
          </Text>
        </View>
      )}

      {/* Sem token no URL */}
      {state.kind === "no_token" && (
        <View style={styles.center}>
          <View style={styles.iconWrap}>
            <MaterialIcons name="link-off" size={40} color={colors.textMuted} />
          </View>
          <Text style={styles.title}>Link inválido</Text>
          <Text style={styles.subtitle}>
            Este link de convite não é válido. Verifique se você recebeu o link
            correto.
          </Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={handleClose}>
            <Text style={styles.btnPrimaryText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Precisa fazer login */}
      {state.kind === "needs_login" && (
        <View style={styles.center}>
          <View style={[styles.iconWrap, { backgroundColor: colors.tintBlue }]}>
            <MaterialIcons
              name="person-outline"
              size={40}
              color={colors.primary}
            />
          </View>
          <Text style={styles.title}>Login necessário</Text>
          <Text style={styles.subtitle}>
            Você precisa estar logado para aceitar este convite e visualizar o
            projeto.
          </Text>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={handleLoginRedirect}
          >
            <MaterialIcons name="login" size={18} color={colors.white} />
            <Text style={styles.btnPrimaryText}>Fazer login</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={handleClose}>
            <Text style={styles.btnSecondaryText}>Agora não</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sucesso */}
      {state.kind === "success" && (
        <View style={styles.center}>
          <View style={[styles.iconWrap, { backgroundColor: "#F0FDF4" }]}>
            <MaterialIcons
              name="check-circle-outline"
              size={40}
              color={colors.success}
            />
          </View>
          <Text style={styles.title}>Convite aceito!</Text>
          <Text style={styles.subtitle}>
            Você agora tem acesso ao projeto como visualizador. Acompanhe o
            andamento em tempo real.
          </Text>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => handleGoToProject(state.projectId)}
          >
            <MaterialIcons name="home-work" size={18} color={colors.white} />
            <Text style={styles.btnPrimaryText}>Ver o projeto</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Erro */}
      {state.kind === "error" && (
        <View style={styles.center}>
          <View style={[styles.iconWrap, { backgroundColor: "#FEF2F2" }]}>
            <MaterialIcons
              name="error-outline"
              size={40}
              color={colors.danger}
            />
          </View>
          <Text style={styles.title}>Não foi possível aceitar</Text>
          <Text style={styles.subtitle}>{state.message}</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={handleClose}>
            <Text style={styles.btnPrimaryText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  dragHandleWrap: {
    alignItems: "center",
    paddingTop: spacing[12],
    paddingBottom: spacing[4],
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  closeBtn: {
    position: "absolute",
    top: spacing[14],
    right: spacing[16],
    zIndex: 10,
    padding: spacing[4],
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[40],
    gap: spacing[12],
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.title,
  },
  loadingSubtext: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    backgroundColor: colors.primary,
    paddingVertical: spacing[14],
    paddingHorizontal: spacing[28],
    borderRadius: radius.md,
    marginTop: spacing[8],
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
  btnSecondary: {
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[28],
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
  },
});
