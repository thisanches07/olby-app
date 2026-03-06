// theme/shadows.ts
import type { ViewStyle } from "react-native";

export function shadow(
  level: 1 | 2 | 3 = 2,
  shadowColor: string = "#000000",
): ViewStyle {
  if (level === 1) {
    return {
      shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 3,
    };
  }

  if (level === 2) {
    return {
      shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 6,
    };
  }

  return {
    shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 10,
  };
}
