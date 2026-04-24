import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface CharacterLimitHintProps {
  current: number;
  max: number;
}

export function CharacterLimitHint({ current, max }: CharacterLimitHintProps) {
  if (current === 0) return null;

  const isAtLimit = current >= max;
  const isNearLimit = !isAtLimit && current / max >= 0.8;

  return (
    <View style={styles.wrapper}>
      <Text
        style={[
          styles.counter,
          isNearLimit && styles.counterWarn,
          isAtLimit && styles.counterLimit,
        ]}
      >
        {current}/{max}
      </Text>

      {isAtLimit && (
        <Text style={styles.limitMsg}>
          Limite de {max} caracteres atingido
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counter: {
    fontSize: 11,
    color: "#9CA3AF",
    fontFamily: "Inter-Regular",
    marginLeft: "auto",
  },
  counterWarn: {
    color: "#F59E0B",
    fontFamily: "Inter-SemiBold",
  },
  counterLimit: {
    color: "#EF4444",
    fontFamily: "Inter-SemiBold",
  },
  limitMsg: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: "#EF4444",
    fontFamily: "Inter-Regular",
  },
});
