import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { shadow } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";

interface DocumentUploadBannerProps {
  visible: boolean;
  fileName?: string;
  onCancel: () => void;
}

export function DocumentUploadBanner({
  visible,
  fileName,
  onCancel,
}: DocumentUploadBannerProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
  }, [visible, fadeAnim]);

  if (!mounted) return null;

  const displayName = fileName
    ? fileName.length > 38
      ? `${fileName.slice(0, 35)}...`
      : fileName
    : "Documento";

  return (
    <Animated.View style={[styles.wrapper, { opacity: fadeAnim }]}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="cloud-upload" size={20} color={colors.primary} />
        </View>

        <View style={styles.body}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Enviando documento</Text>
            <TouchableOpacity
              onPress={onCancel}
              hitSlop={{ top: 12, bottom: 12, left: 16, right: 8 }}
              activeOpacity={0.6}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fileName} numberOfLines={1}>
            {displayName}
          </Text>

          <IndeterminateBar />
        </View>
      </View>
    </Animated.View>
  );
}

function IndeterminateBar() {
  const anim = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(240);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const fillWidth = trackWidth * 0.38;
  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-fillWidth, trackWidth],
  });

  return (
    <View
      style={styles.track}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          styles.fill,
          { width: fillWidth, transform: [{ translateX }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing[14],
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[12],
    backgroundColor: "#FFFFFF",
    borderRadius: radius.xl,
    padding: spacing[16],
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
    ...shadow(2),
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: `${colors.primary}12`,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing[2],
  },
  body: {
    flex: 1,
    gap: spacing[6],
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: colors.text,
    fontFamily: "Inter-SemiBold",
  },
  cancelText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: "#EF4444",
    fontFamily: "Inter-SemiBold",
  },
  fileName: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    fontFamily: "Inter-Regular",
  },
  track: {
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
    marginTop: spacing[4],
  },
  fill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
});
