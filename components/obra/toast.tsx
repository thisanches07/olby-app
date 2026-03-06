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
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -14,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setPayload(null);
    });
  }, [opacity, translateY]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (t: ToastPayload) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      setPayload({
        tone: "info",
        durationMs: 2400,
        ...t,
      });
      setVisible(true);

      translateY.setValue(-14);
      opacity.setValue(0);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

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

  return (
    <ToastContext.Provider value={value}>
      {children}

      {visible && payload && (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View
            pointerEvents="box-none"
            style={[
              styles.container,
              {
                paddingTop: Math.max(insets.top, 10),
              },
            ]}
          >
            <Animated.View
              style={[
                styles.toast,
                {
                  transform: [{ translateY }],
                  opacity,
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
