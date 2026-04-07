import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const insets = useSafeAreaInsets();

  const handleConfirm = () => {
    onClose();
    onConfirm();
  };

  const iconBgColor = confirmVariant === "destructive" ? "#FEF2F2" : "#EFF6FF";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View
        style={[
          styles.sheet,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        {/* Handle indicator */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        <View style={styles.content}>
          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
            <MaterialIcons name={icon} size={28} color={iconColor} />
          </View>

          {/* Texts */}
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}

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
              <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
            </PressableScale>

            <PressableScale
              style={styles.cancelBtn}
              onPress={onClose}
              scaleTo={0.98}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 12 : 8,
    alignItems: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    letterSpacing: -0.2,
    fontFamily: "Inter-Bold",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    fontFamily: "Inter-Regular",
    marginBottom: 4,
  },
  buttons: {
    width: "100%",
    marginTop: 24,
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
