import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const PRIMARY = "#2563EB";

interface DiaryHeaderProps {
  title: string;
  mode: "cliente" | "engenheiro";
  onModeChange: (mode: "cliente" | "engenheiro") => void;
}

export function DiaryHeader({ title, mode, onModeChange }: DiaryHeaderProps) {
  const { ModeToggle } = require("@/components/diario/mode-toggle");

  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
        <MaterialIcons name="chevron-left" size={28} color="#111827" />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerLabel}>DIÁRIO DE OBRA</Text>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
});
