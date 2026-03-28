// theme/typography.ts
import type { TextStyle } from "react-native";

export const typography = {
  size: {
    12: 12,
    13: 13,
    14: 14,
    15: 15,
    16: 16,
    18: 18,
    20: 20,
    24: 24,
  },
  lineHeight: {
    16: 16,
    18: 18,
    20: 20,
    22: 22,
    24: 24,
    28: 28,
    32: 32,
  },
} as const;

export const textVariants: Record<string, TextStyle> = {
  title: { fontSize: 20, lineHeight: 28, fontWeight: "700", fontFamily: "Inter-Bold" },
  subtitle: { fontSize: 16, lineHeight: 24, fontWeight: "600", fontFamily: "Inter-SemiBold" },
  body: { fontSize: 14, lineHeight: 20, fontWeight: "400", fontFamily: "Inter-Regular" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "400", fontFamily: "Inter-Regular" },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "600", fontFamily: "Inter-SemiBold" },
  numeric: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    fontFamily: "Inter-Bold",
    fontVariant: ["tabular-nums"],
  },
};
