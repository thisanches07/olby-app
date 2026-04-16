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

export type NoSubscriptionSheetRef = {
  open: () => void;
  close: () => void;
};

export const NoSubscriptionSheet = forwardRef<NoSubscriptionSheetRef>(
  function NoSubscriptionSheet(_props, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const { bottom: safeBottom } = useSafeAreaInsets();

    useImperativeHandle(ref, () => ({
      open() {
        sheetRef.current?.present();
      },
      close() {
        sheetRef.current?.dismiss();
      },
    }));

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    return (
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.card}
      >
        <BottomSheetView
          style={[styles.content, { paddingBottom: safeBottom + spacing[32] }]}
        >
          {/* Ícone de sucesso */}
          <View style={styles.iconWrap}>
            <MaterialIcons name="check-circle" size={40} color="#16A34A" />
          </View>

          <Text style={styles.title}>Você não precisa{"\n"}de assinatura!</Text>

          <Text style={styles.body}>
            Para acompanhar uma obra, basta receber um convite do profissional
            responsável. Assim que ele compartilhar o acesso, você verá todas as
            informações em tempo real.
          </Text>

          {/* Card de dica */}
          <View style={styles.tipCard}>
            <MaterialIcons name="link" size={20} color={colors.primary} />
            <Text style={styles.tipText}>
              Peça ao engenheiro ou arquiteto para te enviar o link de acesso à
              obra.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => sheetRef.current?.dismiss()}
            activeOpacity={0.85}
          >
            <MaterialIcons
              name="check"
              size={18}
              color={colors.white}
              style={{ marginRight: spacing[6] }}
            />
            <Text style={styles.ctaText}>Entendi!</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
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
    paddingHorizontal: spacing[24],
    paddingTop: spacing[8],
    alignItems: "center",
    gap: spacing[16],
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing[12],
    ...shadow(1),
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  body: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[10],
    backgroundColor: colors.tintBlue,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryBorderSoft,
    padding: spacing[14],
    width: "100%",
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: colors.primary,
    lineHeight: 20,
    fontWeight: "500",
  },
  ctaButton: {
    width: "100%",
    height: 52,
    borderRadius: radius.md,
    backgroundColor: "#16A34A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing[4],
    ...shadow(2, "#16A34A"),
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
  },
});
