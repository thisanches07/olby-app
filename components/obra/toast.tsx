import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { notifyError, notifySuccess } from "@/utils/haptics";

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

const TONE_ICON: Record<ToastTone, string> = {
  success: "check-circle",
  error: "error-outline",
  info: "info-outline",
};

const TONE_COLOR: Record<ToastTone, string> = {
  success: "#34D399",
  error: "#F87171",
  info: "#818CF8",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();

  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<ToastPayload | null>(null);

  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    opacity.value = withTiming(0, { duration: 160 });
    translateY.value = withTiming(100, { duration: 200 }, (finished) => {
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

      if (tone === "success") notifySuccess();
      else if (tone === "error") notifyError();

      translateY.value = 100;
      opacity.value = 0;

      opacity.value = withTiming(1, { duration: 180 });
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 280,
        mass: 0.7,
      });

      timerRef.current = setTimeout(
        () => hideToast(),
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

  const tone = payload?.tone ?? "info";
  const bottomOffset = Math.max(insets.bottom, 16) + 72;

  return (
    <ToastContext.Provider value={value}>
      {children}

      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={hideToast}
      >
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View
            pointerEvents="box-none"
            style={[styles.container, { paddingBottom: bottomOffset }]}
          >
            <Animated.View style={[styles.toast, animStyle]}>
              <View style={styles.row}>
                <MaterialIcons
                  // @ts-expect-error runtime ok
                  name={TONE_ICON[tone]}
                  size={20}
                  color={TONE_COLOR[tone]}
                />

                <View style={styles.textBlock}>
                  <Text style={styles.title} numberOfLines={1}>
                    {payload?.title}
                  </Text>
                  {!!payload?.message && (
                    <Text style={styles.message} numberOfLines={2}>
                      {payload.message}
                    </Text>
                  )}
                </View>

                <Pressable onPress={hideToast} hitSlop={12}>
                  <MaterialIcons name="close" size={16} color="#71717A" />
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </View>
      </Modal>
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
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  toast: {
    backgroundColor: "#18181B",
    borderRadius: 100,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: 380,
    width: "100%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.22,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 12 },
    }),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  textBlock: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FAFAFA",
    letterSpacing: -0.1,
  },
  message: {
    fontSize: 12,
    color: "#A1A1AA",
    lineHeight: 16,
  },
});
