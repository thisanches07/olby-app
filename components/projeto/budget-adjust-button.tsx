import { PRIMARY } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

interface BudgetAdjustButtonProps {
  onPress: () => void;
}

export function BudgetAdjustButton({ onPress }: BudgetAdjustButtonProps) {
  return (
    <TouchableOpacity
      style={styles.budgetAdjustBtn}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <MaterialIcons name="edit" size={16} color={PRIMARY} />
      <Text style={styles.budgetAdjustText}>Ajustar Orçamento</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  budgetAdjustBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY + "15",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 24,
  },
  budgetAdjustText: {
    fontSize: 14,
    fontWeight: "700",
    color: PRIMARY,
  },
});
