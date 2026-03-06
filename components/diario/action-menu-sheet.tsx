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
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          />
        </TouchableWithoutFeedback>

        {/* Sheet */}
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
        >
          {/* Drag handle */}
          <View style={styles.handle} />

          {title && <Text style={styles.title}>{title}</Text>}

          {/* Opções agrupadas */}
          <View style={styles.actionsContainer}>
            {actions.map((action, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.row, i > 0 && styles.rowBorder]}
                onPress={() => {
                  onClose();
                  setTimeout(action.onPress, 280);
                }}
                activeOpacity={0.65}
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
              </TouchableOpacity>
            ))}
          </View>

          {/* Cancelar */}
          <TouchableOpacity
            style={styles.cancelRow}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
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
    backgroundColor: "rgba(0, 0, 0, 0.48)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    paddingTop: 12,
    // shadow on top edge
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
  },
  rowLabelDestructive: {
    color: "#EF4444",
    fontWeight: "600",
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
  },
});
