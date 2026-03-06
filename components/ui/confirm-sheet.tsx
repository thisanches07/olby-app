import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

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
  const translateY = useRef(new Animated.Value(400)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setInternalVisible(true);
      translateY.setValue(400);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 20,
          stiffness: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 400,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setInternalVisible(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

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
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
        >
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
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                confirmVariant === "destructive"
                  ? styles.confirmDestructive
                  : styles.confirmPrimary,
              ]}
              onPress={handleConfirm}
              activeOpacity={0.82}
            >
              <Text
                style={[
                  styles.confirmBtnText,
                  confirmVariant === "primary" && styles.confirmBtnTextPrimary,
                ]}
              >
                {confirmLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
  },
  message: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
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
  },
});
