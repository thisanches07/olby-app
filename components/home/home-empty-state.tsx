import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { NoProjectsIllustration } from "@/assets/illustrations/NoProjectsIllustration";
import { SearchEmptyIllustration } from "@/assets/illustrations/SearchEmptyIllustration";
import { PressableScale } from "@/components/ui/pressable-scale";
import { colors } from "@/theme/colors";

interface HomeEmptyStateProps {
  title?: string;
  subtitle?: string;
  variant?: "no-projects" | "search-empty";
  action?: { label: string; onPress: () => void };
}

export function HomeEmptyState({
  title,
  subtitle,
  variant = "no-projects",
  action,
}: HomeEmptyStateProps) {
  const isSearch = variant === "search-empty";

  const defaultTitle = isSearch ? "Nenhuma obra encontrada" : "Nenhuma obra ainda";
  const defaultSubtitle = isSearch
    ? "Tente buscar por outro nome ou ajuste os filtros."
    : "Toque no botão + para criar sua primeira obra.";

  return (
    <View style={styles.container}>
      <View style={styles.illustration}>
        {isSearch ? (
          <SearchEmptyIllustration size={100} />
        ) : (
          <NoProjectsIllustration size={140} />
        )}
      </View>

      <Text style={styles.title}>{title ?? defaultTitle}</Text>
      <Text style={styles.subtitle}>{subtitle ?? defaultSubtitle}</Text>

      {action && (
        <PressableScale style={styles.actionButton} onPress={action.onPress} scaleTo={0.96}>
          <Text style={styles.actionButtonText}>{action.label}</Text>
        </PressableScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 48,
    paddingHorizontal: 32,
    gap: 8,
  },
  illustration: {
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.title,
    textAlign: "center",
    fontFamily: "Inter-Bold",
  },
  subtitle: {
    fontSize: 13,
    color: colors.subtext,
    textAlign: "center",
    lineHeight: 18,
    fontFamily: "Inter-Regular",
  },
  actionButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Inter-SemiBold",
  },
});
