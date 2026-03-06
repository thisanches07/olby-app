import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const PRIMARY = "#2563EB";

interface ModeToggleProps {
  mode: "cliente" | "engenheiro";
  onModeChange: (mode: "cliente" | "engenheiro") => void;
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.btn, mode === "cliente" && styles.btnActive]}
        onPress={() => onModeChange("cliente")}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="visibility"
          size={16}
          color={mode === "cliente" ? "#FFFFFF" : "#9CA3AF"}
        />
        <Text style={[styles.label, mode === "cliente" && styles.labelActive]}>
          Cliente
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, mode === "engenheiro" && styles.btnActive]}
        onPress={() => onModeChange("engenheiro")}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="edit"
          size={16}
          color={mode === "engenheiro" ? "#FFFFFF" : "#9CA3AF"}
        />
        <Text
          style={[styles.label, mode === "engenheiro" && styles.labelActive]}
        >
          Eng.
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  btnActive: {
    backgroundColor: PRIMARY,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  labelActive: {
    color: "#FFFFFF",
  },
});
