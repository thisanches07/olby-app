import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { notifyError, notifySuccess } from "@/utils/haptics";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";

type ToastTone = "success" | "error" | "info";

type ToastPayload = {
  title: string;
  message?: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastContextValue = {
  showToast: (t: ToastPayload) => void;
  hideToast: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function toneMeta(tone: ToastTone) {
  if (tone === "success")
    return {
      icon: "check-circle",
      bg: "#ECFDF5",
      border: "#CFFAEA",
      title: "#065F46",
    };
  if (tone === "error")
    return {
      icon: "error-outline",
      bg: "#FFF1F2",
      border: "#FFE4E6",
      title: "#9F1239",
    };
  return {
    icon: "info-outline",
    bg: "#EEF2FF",
    border: "#C7D2FE",
    title: "#1E3A8A",
  };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();

  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<ToastPayload | null>(null);

  const translateY = useSharedValue(-80);
  const opacity = useSharedValue(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    opacity.value = withTiming(0, { duration: 180 });
    translateY.value = withTiming(-80, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(setVisible)(false);
        runOnJS(setPayload)(null);
      }
    });
  }, [opacity, translateY]);

  const showToast = useCallback(
    (t: ToastPayload) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      const tone = t.tone ?? "info";

      setPayload({ tone, durationMs: 2400, ...t });
      setVisible(true);

      // Haptic baseado no tom
      if (tone === "success") notifySuccess();
      else if (tone === "error") notifyError();

      // Reset position e anima com spring para leve bounce
      translateY.value = -80;
      opacity.value = 0;

      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, {
        damping: 18,
        stiffness: 260,
        mass: 0.8,
      });

      timerRef.current = setTimeout(
        () => {
          hideToast();
        },
        (t.durationMs ?? 2400) as number,
      );
    },
    [hideToast, opacity, translateY],
  );

  const value = useMemo(
    () => ({ showToast, hideToast }),
    [showToast, hideToast],
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <ToastContext.Provider value={value}>
      {children}

      {visible && payload && (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View
            pointerEvents="box-none"
            style={[
              styles.container,
              { paddingTop: Math.max(insets.top, 10) },
            ]}
          >
            <Animated.View
              style={[
                styles.toast,
                animStyle,
                {
                  backgroundColor: toneMeta(payload.tone ?? "info").bg,
                  borderColor: toneMeta(payload.tone ?? "info").border,
                },
              ]}
            >
              <View style={styles.row}>
                <View style={styles.iconWrap}>
                  <MaterialIcons
                    // @ts-expect-error runtime ok
                    name={toneMeta(payload.tone ?? "info").icon}
                    size={18}
                    color={colors.title}
                  />
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.title} numberOfLines={1}>
                    {payload.title}
                  </Text>
                  {!!payload.message && (
                    <Text style={styles.message} numberOfLines={2}>
                      {payload.message}
                    </Text>
                  )}
                </View>

                <Pressable
                  onPress={hideToast}
                  hitSlop={12}
                  style={styles.close}
                >
                  <MaterialIcons
                    name="close"
                    size={18}
                    color={colors.textMuted}
                  />
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing[16],
    zIndex: 9999,
  },
  toast: {
    borderWidth: 1,
    borderRadius: radius["2xl"],
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[12],
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 10 },
    }),
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[10] },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dividerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.title,
    letterSpacing: -0.1,
  },
  message: { fontSize: 12, color: colors.text, lineHeight: 16, opacity: 0.9 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dividerSoft,
  },
});
