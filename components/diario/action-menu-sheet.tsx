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
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { PressableScale } from "@/components/ui/pressable-scale";

export interface ActionMenuItem {
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  variant?: "default" | "destructive";
  onPress: () => void;
}

interface ActionMenuSheetProps {
  visible: boolean;
  title?: string;
  actions: ActionMenuItem[];
  onClose: () => void;
}

export function ActionMenuSheet({
  visible,
  title,
  actions,
  onClose,
}: ActionMenuSheetProps) {
  const [internalVisible, setInternalVisible] = useState(false);
  const translateY = useSharedValue(300);
  const backdropOpacity = useSharedValue(0);

  const SPRING = { damping: 40, stiffness: 420, mass: 0.8 } as const;

  useEffect(() => {
    if (visible) {
      setInternalVisible(true);
      translateY.value = 300;
      backdropOpacity.value = 0;
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, SPRING);
    } else {
      backdropOpacity.value = withTiming(0, { duration: 160 });
      translateY.value = withTiming(300, { duration: 180 });
      setTimeout(() => setInternalVisible(false), 190);
    }
  }, [visible]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 80 || e.velocityY > 600) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, SPRING);
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal
      visible={internalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop — fecha ao tocar fora */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
            <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
          </Animated.View>
        </TouchableWithoutFeedback>

        {/* Sheet */}
        <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          {/* Drag handle */}
          <View style={styles.handle} />

          {title && <Text style={styles.title}>{title}</Text>}

          {/* Opções agrupadas */}
          <View style={styles.actionsContainer}>
            {actions.map((action, i) => (
              <PressableScale
                key={i}
                style={[styles.row, i > 0 && styles.rowBorder]}
                onPress={() => {
                  onClose();
                  setTimeout(action.onPress, 280);
                }}
                scaleTo={0.98}
              >
                <View
                  style={[
                    styles.iconWrap,
                    action.variant === "destructive" && styles.iconWrapDestructive,
                  ]}
                >
                  <MaterialIcons
                    name={action.icon}
                    size={19}
                    color={
                      action.variant === "destructive" ? "#EF4444" : "#374151"
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.rowLabel,
                    action.variant === "destructive" &&
                      styles.rowLabelDestructive,
                  ]}
                >
                  {action.label}
                </Text>
              </PressableScale>
            ))}
          </View>

          {/* Cancelar */}
          <PressableScale
            style={styles.cancelRow}
            onPress={onClose}
            scaleTo={0.98}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </PressableScale>
        </Animated.View>
        </GestureDetector>
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
    marginBottom: 20,
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
    textAlign: "center",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 12,
    paddingHorizontal: 20,
    fontFamily: "Inter-SemiBold",
  },
  actionsContainer: {
    marginHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapDestructive: {
    backgroundColor: "#FEF2F2",
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
    fontFamily: "Inter-Regular",
  },
  rowLabelDestructive: {
    color: "#EF4444",
    fontWeight: "600",
    fontFamily: "Inter-SemiBold",
  },
  cancelRow: {
    marginHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingVertical: 15,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    fontFamily: "Inter-Bold",
  },
});
