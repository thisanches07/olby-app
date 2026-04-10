import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface CharacterLimitHintProps {
  current: number;
  max: number;
  singularLabel?: string;
}

export function CharacterLimitHint({
  current,
  max,
  singularLabel = "caractere",
}: CharacterLimitHintProps) {
  const ratio = max > 0 ? current / max : 0;
  const isAtLimit = current >= max;
  const isNearLimit = !isAtLimit && ratio >= 0.8;
  const pluralLabel = `${singularLabel}s`;

  return (
    <View style={styles.wrapper}>
      <Text
        style={[
          styles.counter,
          isNearLimit && styles.counterNear,
          isAtLimit && styles.counterLimit,
        ]}
      >
        {current}/{max}
      </Text>

      {isAtLimit && (
        <View style={styles.limitBanner}>
          <MaterialIcons name="warning-amber" size={14} color="#D97706" />
          <Text style={styles.limitText}>
            Limite de {max} {max === 1 ? singularLabel : pluralLabel} atingido.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 6,
    gap: 6,
  },
  counter: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
    fontWeight: "600",
  },
  counterNear: {
    color: "#D97706",
  },
  counterLimit: {
    color: "#B45309",
  },
  limitBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#FFF7ED",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  limitText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9A3412",
  },
});
