import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface HomeEmptyStateProps {
  title?: string;
  subtitle?: string;
  icon?: React.ComponentProps<typeof MaterialIcons>["name"];
}

export function HomeEmptyState({
  title = "Nenhuma obra encontrada",
  icon = "business",
}: HomeEmptyStateProps) {
  return (
    <View style={styles.container}>
      <MaterialIcons name={icon} size={48} color="#D1D5DB" />
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  subtitle: {
    fontSize: 13,
    color: "#D1D5DB",
    textAlign: "center",
  },
});
