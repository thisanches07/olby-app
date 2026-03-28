import type { ObraDetalhe } from "@/data/obras";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/hooks/use-auth";
import { colors } from "@/theme/colors";

interface HomeHeaderProps {
  mode: "cliente" | "engenheiro";
  onModeChange: (mode: "cliente" | "engenheiro") => void;
  obras: ObraDetalhe[];
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

function getFirstName(displayName: string | null): string | null {
  if (!displayName) return null;
  return displayName.trim().split(" ")[0];
}

export function HomeHeader({ mode, onModeChange, obras }: HomeHeaderProps) {
  const { user } = useAuth();
  const firstName = getFirstName(user?.displayName ?? null);
  const greeting = getGreeting(firstName);
  const initials = getInitials(user?.displayName ?? null, user?.email ?? null);
  const photoUrl = user?.photoURL ?? null;
  const [avatarImageError, setAvatarImageError] = useState(false);
  const emAndamento = obras.filter((o) => o.status === "em_andamento").length;
  const concluidas = obras.filter((o) => o.status === "concluida").length;

  useEffect(() => {
    setAvatarImageError(false);
  }, [photoUrl]);

  return (
    <LinearGradient
      colors={["#1D4ED8", "#2563EB", "#3B82F6"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View style={styles.headerTop}>
        <View style={styles.greetingWrap}>
          <Text style={styles.headerGreeting}>{greeting}</Text>
          <Text style={styles.headerTitle}>Minhas Obras</Text>
        </View>

        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => router.push("/profile")}
          activeOpacity={0.8}
        >
          {photoUrl && !avatarImageError ? (
            <Image
              source={{ uri: photoUrl }}
              style={styles.avatarImage}
              onError={() => setAvatarImageError(true)}
            />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{obras.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{emAndamento}</Text>
          <Text style={styles.statLabel}>Em Andamento</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{concluidas}</Text>
          <Text style={styles.statLabel}>Concluídas</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function getGreeting(firstName: string | null): string {
  const hour = new Date().getHours();
  const suffix = firstName ? `, ${firstName}!` : "!";
  if (hour < 12) return `Bom dia${suffix}`;
  if (hour < 18) return `Boa tarde${suffix}`;
  return `Boa noite${suffix}`;
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  greetingWrap: {
    flex: 1,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    marginLeft: 12,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  headerGreeting: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  toggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnActive: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginVertical: 4,
  },
});
