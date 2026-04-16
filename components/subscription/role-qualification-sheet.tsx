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

export type RoleQualificationSheetRef = {
  open: (onProfessional: () => void, onClient: () => void) => void;
  close: () => void;
};

export const RoleQualificationSheet = forwardRef<RoleQualificationSheetRef>(
  function RoleQualificationSheet(_props, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const onProfessionalRef = useRef<(() => void) | null>(null);
    const onClientRef = useRef<(() => void) | null>(null);
    const { bottom: safeBottom } = useSafeAreaInsets();

    useImperativeHandle(ref, () => ({
      open(onProfessional, onClient) {
        onProfessionalRef.current = onProfessional;
        onClientRef.current = onClient;
        sheetRef.current?.present();
      },
      close() {
        sheetRef.current?.dismiss();
      },
    }));

    function handleSelect(type: "professional" | "client") {
      sheetRef.current?.dismiss();
      // Fire callback after sheet animation settles
      setTimeout(() => {
        if (type === "professional") {
          onProfessionalRef.current?.();
        } else {
          onClientRef.current?.();
        }
        onProfessionalRef.current = null;
        onClientRef.current = null;
      }, 300);
    }

    function handleCancel() {
      sheetRef.current?.dismiss();
    }

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
          style={[styles.content, { paddingBottom: safeBottom + spacing[24] }]}
        >
          <Text style={styles.title}>Qual é o seu perfil?</Text>
          <Text style={styles.subtitle}>
            Isso nos ajuda a mostrar as informações certas para você.
          </Text>

          {/* Opção: Profissional */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleSelect("professional")}
            activeOpacity={0.75}
          >
            <View style={[styles.optionIconWrap, styles.optionIconProfessional]}>
              <MaterialIcons name="engineering" size={24} color={colors.primary} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Sou profissional da construção</Text>
              <Text style={styles.optionSubtitle}>
                Arquiteto, engenheiro ou gestor de obras
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={22}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          {/* Opção: Cliente / Acompanhante */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleSelect("client")}
            activeOpacity={0.75}
          >
            <View style={[styles.optionIconWrap, styles.optionIconClient]}>
              <MaterialIcons name="visibility" size={24} color="#7C3AED" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Vou acompanhar uma obra</Text>
              <Text style={styles.optionSubtitle}>
                Cliente, proprietário ou convidado
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={22}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
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
    paddingHorizontal: spacing[20],
    paddingTop: spacing[8],
    gap: spacing[12],
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
    textAlign: "center",
    marginTop: spacing[8],
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing[4],
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
  optionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconProfessional: {
    backgroundColor: colors.tintBlue,
  },
  optionIconClient: {
    backgroundColor: "#F3E8FF",
  },
  optionText: {
    flex: 1,
    gap: spacing[2],
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 20,
  },
  optionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  cancelButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing[4],
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textMuted,
  },
});
