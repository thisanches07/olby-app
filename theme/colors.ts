// theme/colors.ts
export const colors = {
  // Brand
  primary: "#2563EB",

  // Base
  white: "#FFFFFF",
  black: "#000000",

  // Backgrounds
  bg: "#F9FAFB",
  surface: "#FFFFFF",
  tintBlue: "#EFF6FF",

  // Grays (muito usados em bordas/placeholder)
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",

  // Text
  text: "#111827",
  textMuted: "#6B7280",
  title: "#374151",
  subtext: "#9CA3AF",

  // Icons
  iconMuted: "#D1D5DB",

  // Borders / dividers
  border: "#E5E7EB",
  dividerSoft: "rgba(0,0,0,0.06)",
  primaryBorderSoft: "rgba(37, 99, 235, 0.18)",

  // Status
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",

  // Disabled
  disabledText: "#B0B0B0",

  // Overlay
  overlay: "rgba(0,0,0,0.4)",
} as const;

export type AppColors = typeof colors;
