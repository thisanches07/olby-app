import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
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
  const [state, setState] = useState<ScreenState>({ kind: "loading" });

  useEffect(() => {
    if (authLoading) return;

    // Sem token no URL
    if (!token) {
      setState({ kind: "no_token" });
      return;
    }

    // Usuário não autenticado → pedir login e preservar token
    if (!user) {
      setState({ kind: "needs_login" });
      return;
    }

    // Autenticado → aceitar o convite
    acceptInvite(token);
  }, [authLoading, user, token]);

  async function acceptInvite(inviteToken: string) {
    setState({ kind: "accepting" });
    try {
      const result = await invitesService.accept(inviteToken);
      // Muda o role local para "cliente" (CLIENT_VIEWER)
      setRole("cliente");
      setState({ kind: "success", projectId: result.projectId });
    } catch (err) {
      setState({ kind: "error", message: resolveErrorMessage(err) });
    }
  }

  function handleLoginRedirect() {
    if (token) {
      pendingInviteToken.set(token);
    }
    router.replace("/login");
  }

  function handleGoToProject(projectId: string) {
    router.replace({ pathname: "/obra/[id]", params: { id: projectId } });
  }

  function handleGoHome() {
    router.replace("/(tabs)");
  }

  // ── Renders ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

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
          <TouchableOpacity style={styles.btnPrimary} onPress={handleGoHome}>
            <Text style={styles.btnPrimaryText}>Voltar para o início</Text>
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
          <TouchableOpacity style={styles.btnPrimary} onPress={handleGoHome}>
            <Text style={styles.btnPrimaryText}>Voltar para o início</Text>
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
});
