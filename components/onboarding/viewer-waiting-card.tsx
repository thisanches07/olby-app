import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";

export function ViewerWaitingCard() {
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 900 }),
        withTiming(1, { duration: 900 }),
      ),
      -1,
      false,
    );
  }, [pulseOpacity]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <MaterialIcons
          name="notifications-none"
          size={36}
          color={colors.primary}
        />
      </View>

      <Text style={styles.title}>Aguardando sua obra</Text>
      <Text style={styles.subtitle}>
        Quando o responsável compartilhar uma obra com você, ela vai aparecer
        aqui.
      </Text>

      <View style={styles.hintCard}>
        <MaterialIcons name="info-outline" size={16} color={colors.primary} />
        <Text style={styles.hintText}>
          Peça ao responsável para compartilhar o projeto com você.
        </Text>
      </View>

      <View style={styles.liveRow}>
        <Animated.View style={[styles.liveDot, dotStyle]} />
        <Text style={styles.liveText}>Aguardando em tempo real</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[32],
    paddingVertical: spacing[48],
    gap: spacing[16],
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.tintBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[8],
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },
  hintCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[8],
    backgroundColor: colors.tintBlue,
    borderRadius: radius.lg,
    padding: spacing[14],
    marginTop: spacing[8],
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: "#1E3A5F",
    lineHeight: 19,
    fontWeight: "500",
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    marginTop: spacing[4],
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  liveText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
});
