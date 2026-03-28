import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BlurView } from "expo-blur";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { PressableScale } from "@/components/ui/pressable-scale";

interface ConfirmSheetProps {
  visible: boolean;
  icon?: React.ComponentProps<typeof MaterialIcons>["name"];
  iconColor?: string;
  title: string;
  message?: string;
  confirmLabel?: string;
  /** "destructive" = red button (default), "primary" = blue button */
  confirmVariant?: "destructive" | "primary";
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmSheet({
  visible,
  icon = "warning-amber",
  iconColor = "#EF4444",
  title,
  message,
  confirmLabel = "Confirmar",
  confirmVariant = "destructive",
  onConfirm,
  onClose,
}: ConfirmSheetProps) {
  const [internalVisible, setInternalVisible] = useState(false);
  const translateY = useSharedValue(400);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setInternalVisible(true);
      translateY.value = 400;
      backdropOpacity.value = 0;
      backdropOpacity.value = withTiming(1, { duration: 220 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 250 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 180 });
      translateY.value = withTiming(400, { duration: 200 });
      setTimeout(() => setInternalVisible(false), 210);
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleConfirm = () => {
    onClose();
    onConfirm();
  };

  const iconBgColor = confirmVariant === "destructive" ? "#FEF2F2" : "#EFF6FF";

  return (
    <Modal
      visible={internalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
            <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
          </Animated.View>
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.sheet, sheetStyle]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Icon + Texts */}
          <View style={styles.content}>
            <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
              <MaterialIcons name={icon} size={28} color={iconColor} />
            </View>
            <Text style={styles.title}>{title}</Text>
            {!!message && <Text style={styles.message}>{message}</Text>}
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <PressableScale
              style={[
                styles.confirmBtn,
                confirmVariant === "destructive"
                  ? styles.confirmDestructive
                  : styles.confirmPrimary,
              ]}
              onPress={handleConfirm}
              scaleTo={0.97}
            >
              <Text
                style={[
                  styles.confirmBtnText,
                  confirmVariant === "primary" && styles.confirmBtnTextPrimary,
                ]}
              >
                {confirmLabel}
              </Text>
            </PressableScale>

            <PressableScale
              style={styles.cancelBtn}
              onPress={onClose}
              scaleTo={0.98}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </PressableScale>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 24,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 28,
    marginBottom: 28,
    gap: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    letterSpacing: -0.2,
    fontFamily: "Inter-Bold",
  },
  message: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    fontFamily: "Inter-Regular",
  },
  buttons: {
    paddingHorizontal: 16,
    gap: 10,
  },
  confirmBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  confirmDestructive: {
    backgroundColor: "#EF4444",
  },
  confirmPrimary: {
    backgroundColor: "#2563EB",
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.1,
    fontFamily: "Inter-Bold",
  },
  confirmBtnTextPrimary: {
    color: "#FFFFFF",
  },
  cancelBtn: {
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingVertical: 15,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    fontFamily: "Inter-Bold",
  },
});
