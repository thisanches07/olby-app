import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { DevUser } from "@/constants/dev-users";
import { DEV_USERS } from "@/constants/dev-users";
import { useSubscription } from "@/contexts/subscription-context";
import type { AppRole } from "@/hooks/use-app-session";

type DataState = "filled" | "empty" | "loading" | "error";

export default function DevPanel({
  role,
  setRole,
  dataState,
  setDataState,
  currentUserEmail,
  onLoginAs,
  onSignOut,
}: {
  role: AppRole;
  setRole: (r: AppRole) => void;
  dataState: DataState;
  setDataState: (s: DataState) => void;
  currentUserEmail?: string | null;
  onLoginAs?: (devUser: DevUser) => Promise<void>;
  onSignOut?: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { plan } = useSubscription();

  const DEFAULT_OBRA_ID = "1";
  const DEFAULT_DIARIO_ID = "1";

  const routes = useMemo(
    () => [
      { label: "Login", go: () => router.push("/login") },
      { label: "Home (/)", go: () => router.push("/") },
      {
        label: `Obra (${DEFAULT_OBRA_ID})`,
        go: () =>
          router.push({
            pathname: "/obra/[id]",
            params: { id: DEFAULT_OBRA_ID },
          }),
      },
      {
        label: `Diario (${DEFAULT_DIARIO_ID})`,
        go: () =>
          router.push({
            pathname: "/diario/[id]",
            params: { id: DEFAULT_DIARIO_ID },
          }),
      },
    ],
    [],
  );

  async function handleLoginAs(devUser: DevUser) {
    if (!onLoginAs) return;
    setLoginLoading(devUser.id);
    setLoginError(null);
    try {
      await onLoginAs(devUser);
      setOpen(false);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erro ao logar";
      setLoginError(msg);
    } finally {
      setLoginLoading(null);
    }
  }

  if (!__DEV__) return null;

  return (
    <View pointerEvents="box-none" style={styles.container}>
      {open && (
        <View style={styles.panel}>
          <Text style={styles.title}>DEV</Text>

          <Text style={styles.section}>Sessao</Text>
          {currentUserEmail ? (
            <View style={styles.sessionRow}>
              <Text style={styles.userEmail} numberOfLines={1}>
                {currentUserEmail}
              </Text>
              <Chip label="Sair" onPress={() => onSignOut?.()} />
            </View>
          ) : (
            <Text style={styles.emptyText}>Não autenticado</Text>
          )}

          <Text style={styles.section}>Logar como</Text>
          <View style={styles.row}>
            {DEV_USERS.map((u) => (
              <Chip
                key={u.id}
                label={loginLoading === u.id ? "..." : u.label}
                active={currentUserEmail === u.email}
                onPress={() => handleLoginAs(u)}
              />
            ))}
          </View>
          {loginError ? (
            <Text style={styles.errorText}>{loginError}</Text>
          ) : null}

          <Text style={styles.section}>Role</Text>
          <View style={styles.row}>
            <Chip
              active={role === "cliente"}
              label="Cliente"
              onPress={() => setRole("cliente")}
            />
            <Chip
              active={role === "engenheiro"}
              label="Eng/Arq"
              onPress={() => setRole("engenheiro")}
            />
          </View>

          <Text style={styles.section}>Data</Text>
          <View style={styles.rowWrap}>
            {(["filled", "empty", "loading", "error"] as DataState[]).map(
              (s) => (
                <Chip
                  key={s}
                  active={dataState === s}
                  label={s}
                  onPress={() => setDataState(s)}
                />
              ),
            )}
          </View>

          <Text style={styles.section}>
            Plano{plan ? ` (${plan.code})` : ""}
          </Text>
          <Text style={styles.emptyText}>
            Sincronizado via API /subscriptions/me
          </Text>

          <Text style={styles.section}>Navigate</Text>
          <View style={styles.rowWrap}>
            {routes.map((r) => (
              <Chip key={r.label} label={r.label} onPress={r.go} />
            ))}
          </View>

          <View style={styles.footerRow}>
            <Chip label="Back" onPress={() => router.back()} />
            <Chip label="Dismiss" onPress={() => setOpen(false)} />
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.9}
      >
        <Text style={styles.fabText}>{open ? "X" : "DEV"}</Text>
      </TouchableOpacity>
    </View>
  );
}

function Chip({
  label,
  onPress,
  active,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 16,
    bottom: 140,
    zIndex: 9999,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: "#fff",
    fontWeight: "800",
  },

  panel: {
    width: 280,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#111827",
    marginBottom: 10,
  },
  title: {
    color: "#fff",
    fontWeight: "800",
    marginBottom: 8,
  },
  section: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 6,
  },

  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  userEmail: {
    flex: 1,
    color: "#E5E7EB",
    fontSize: 11,
    fontWeight: "600",
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 12,
  },
  errorText: {
    color: "#F87171",
    fontSize: 11,
    marginTop: 4,
  },

  row: {
    flexDirection: "row",
    gap: 8,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  footerRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#1F2937",
  },
  chipActive: {
    backgroundColor: "#2563EB",
  },
  chipText: {
    color: "#E5E7EB",
    fontWeight: "700",
    fontSize: 12,
  },
  chipTextActive: {
    color: "#fff",
  },
});
