import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";

type Tone = "default" | "danger";

type Props = {
  visible: boolean;
  title: string;
  description?: string;

  confirmText?: string;
  cancelText?: string;

  tone?: Tone;
  busy?: boolean;

  icon?: keyof typeof MaterialIcons.glyphMap;

  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmSheet({
  visible,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  tone = "default",
  busy = false,
  icon = "help-outline",
  onConfirm,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();
  const danger = tone === "danger";

  if (!visible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.portal,
        Platform.OS === "android" ? styles.portalAndroid : null,
      ]}
    >
      <Pressable
        style={styles.backdrop}
        onPress={busy ? undefined : onCancel}
      />
      <View
        pointerEvents="box-none"
        style={[
          styles.wrap,
          { paddingBottom: Math.max(insets.bottom, spacing[16]) },
        ]}
      >
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View
              style={[
                styles.iconWrap,
                danger ? styles.iconWrapDanger : styles.iconWrapDefault,
              ]}
            >
              <MaterialIcons
                name={icon}
                size={18}
                color={danger ? colors.danger : colors.title}
              />
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.title}>{title}</Text>
              {!!description && <Text style={styles.desc}>{description}</Text>}
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              disabled={busy}
              onPress={onCancel}
              activeOpacity={0.9}
              style={[styles.secondaryBtn, busy && { opacity: 0.6 }]}
            >
              <Text style={styles.secondaryText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={busy}
              onPress={onConfirm}
              activeOpacity={0.9}
              style={[
                styles.primaryBtn,
                danger ? styles.primaryDanger : styles.primaryDefault,
                busy && { opacity: 0.85 },
              ]}
            >
              {busy ? (
                <View style={styles.busyRow}>
                  <ActivityIndicator color={colors.white} />
                  <Text style={styles.primaryText}>Aguarde...</Text>
                </View>
              ) : (
                <Text style={styles.primaryText}>{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Overlay acima de tudo (dentro do mesmo Modal pai)
  portal: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
  },
  portalAndroid: {
    elevation: 99999,
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  wrap: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: spacing[16],
  },

  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
    borderRadius: radius["2xl"],
    padding: spacing[16],
    borderWidth: 1,
    borderColor: colors.dividerSoft,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.14,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 12 },
      },
      android: { elevation: 16 },
    }),
  },

  headerRow: {
    flexDirection: "row",
    gap: spacing[12],
    alignItems: "flex-start",
  },

  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  iconWrapDefault: {
    backgroundColor: colors.bg,
    borderColor: colors.dividerSoft,
  },
  iconWrapDanger: { backgroundColor: "#FFF1F2", borderColor: "#FFE4E6" },

  title: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.title,
    letterSpacing: -0.2,
  },
  desc: { fontSize: 12, color: colors.textMuted, lineHeight: 16 },

  actions: {
    flexDirection: "row",
    gap: spacing[10],
    marginTop: spacing[14],
  },

  secondaryBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.dividerSoft,
  },
  secondaryText: { fontSize: 13, fontWeight: "900", color: colors.title },

  primaryBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryDefault: { backgroundColor: colors.primary },
  primaryDanger: { backgroundColor: colors.danger },
  primaryText: { color: colors.white, fontSize: 13, fontWeight: "900" },

  busyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
  },

  hint: {
    marginTop: spacing[12],
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
});
