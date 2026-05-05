import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { shadow } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";
import type { OnboardingRole } from "@/utils/onboarding.storage";

export type OnboardingRoleSheetRef = {
  open: () => void;
  close: () => void;
};

interface Props {
  onSelect: (role: OnboardingRole) => void;
  onDismissWithoutSelection: () => void;
}

export const OnboardingRoleSheet = forwardRef<OnboardingRoleSheetRef, Props>(
  function OnboardingRoleSheet({ onSelect, onDismissWithoutSelection }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const selectedRef = useRef(false);
    const { bottom: safeBottom } = useSafeAreaInsets();

    useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.present(),
      close: () => sheetRef.current?.dismiss(),
    }));

    function handleSelect(role: OnboardingRole) {
      selectedRef.current = true;
      sheetRef.current?.dismiss();
      setTimeout(() => onSelect(role), 300);
    }

    function handleDismiss() {
      if (selectedRef.current) {
        selectedRef.current = false;
        return;
      }
      onDismissWithoutSelection();
    }

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.65}
          pressBehavior="close"
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        enablePanDownToClose={false}
        backdropComponent={renderBackdrop}
        onDismiss={handleDismiss}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.card}
      >
        <BottomSheetView
          style={[styles.content, { paddingBottom: safeBottom + spacing[32] }]}
        >
          <View style={styles.headerBlock}>
            <Text style={styles.title}>Bem-vindo ao Obly!</Text>
            <Text style={styles.subtitle}>
              Como você vai usar o app? Isso nos ajuda a mostrar o que é mais
              útil para você.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleSelect("manager")}
            activeOpacity={0.75}
          >
            <View style={[styles.iconWrap, styles.iconManager]}>
              <MaterialIcons name="engineering" size={26} color={colors.primary} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Sou responsável pela obra</Text>
              <Text style={styles.optionSub}>
                Crio projetos, controlo tarefas e gastos
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleSelect("viewer")}
            activeOpacity={0.75}
          >
            <View style={[styles.iconWrap, styles.iconViewer]}>
              <MaterialIcons name="visibility" size={26} color="#7C3AED" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Vou acompanhar uma obra</Text>
              <Text style={styles.optionSub}>
                Cliente, proprietário ou convidado
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  content: {
    paddingHorizontal: spacing[20],
    paddingTop: spacing[8],
    gap: spacing[12],
  },
  headerBlock: {
    alignItems: "center",
    paddingVertical: spacing[8],
    gap: spacing[8],
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[14],
    backgroundColor: colors.bg,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing[16],
    ...shadow(1),
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconManager: { backgroundColor: colors.tintBlue },
  iconViewer: { backgroundColor: "#F3E8FF" },
  optionText: { flex: 1, gap: spacing[2] },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 20,
  },
  optionSub: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
