// theme/common.ts
import { StyleSheet } from "react-native";
import { colors } from "./colors";
import { radius } from "./radius";
import { shadow } from "./shadows";

export const common = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  surface: {
    backgroundColor: colors.surface,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow(1),
  },
});
