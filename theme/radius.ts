// theme/radius.ts
export const radius = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  pill: 999,
} as const;

export type RadiusKey = keyof typeof radius;
