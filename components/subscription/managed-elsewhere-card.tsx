import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

import type { SubscriptionProvider } from "@/services/billing.mappers";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { shadow } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";
import { getManagedElsewhereCopy } from "@/utils/subscription-cross-platform";

interface ManagedElsewhereCardProps {
  provider: SubscriptionProvider;
  style?: StyleProp<ViewStyle>;
}

function getIconName(
  provider: SubscriptionProvider,
): React.ComponentProps<typeof MaterialIcons>["name"] {
  if (provider === "STRIPE") return "language";
  if (provider === "APPLE") return "phone-iphone";
  if (provider === "GOOGLE") return "android";
  return "info";
}

export function ManagedElsewhereCard({
  provider,
  style,
}: ManagedElsewhereCardProps) {
  const copy = getManagedElsewhereCopy(provider);
  if (!copy) return null;

  return (
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <MaterialIcons
            name={getIconName(provider)}
            size={20}
            color={colors.primary}
          />
        </View>
        <Text style={styles.title}>{copy.title}</Text>
      </View>

      <Text style={styles.body}>{copy.body}</Text>

      {copy.cta ? (
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => void WebBrowser.openBrowserAsync(copy.cta!.url)}
          activeOpacity={0.85}
        >
          <MaterialIcons name="open-in-new" size={16} color={colors.white} />
          <Text style={styles.ctaText}>{copy.cta.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primaryBorderSoft,
    padding: spacing[20],
    gap: spacing[12],
    ...shadow(1),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.title,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[8],
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    ...shadow(2, colors.primary),
  },
  ctaText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
});
