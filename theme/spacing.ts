// theme/spacing.ts
export const spacing = {
  0: 0,
  2: 2,
  4: 4,
  5: 5,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  14: 14,
  16: 16,
  18: 18,
  20: 20,
  24: 24,
  28: 28,
  32: 32,
  36: 36,
  40: 40,
  44: 44,
  48: 48,
  56: 56,
  64: 64,
  80: 80,
  100: 100,
} as const;

export type SpacingKey = keyof typeof spacing;
