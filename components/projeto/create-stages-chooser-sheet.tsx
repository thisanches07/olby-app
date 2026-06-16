import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/ui/pressable-scale";
import { useSheetLayout } from "@/hooks/use-sheet-layout";

const PRIMARY = "#2563EB";

interface CreateStagesChooserSheetProps {
  visible: boolean;
  onPickSingle: () => void;
  onPickFlow: () => void;
  onClose: () => void;
}

interface OptionCardProps {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  onPress: () => void;
}

function OptionCard({
  icon,
  iconBg,
  iconColor,
  title,
  description,
  onPress,
}: OptionCardProps) {
  return (
    <PressableScale style={styles.optionCard} onPress={onPress} scaleTo={0.98}>
      <View style={[styles.optionIcon, { backgroundColor: iconBg }]}>
        <MaterialIcons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.optionTexts}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color="#C4C9D4" />
    </PressableScale>
  );
}

export function CreateStagesChooserSheet({
  visible,
  onPickSingle,
  onPickFlow,
  onClose,
}: CreateStagesChooserSheetProps) {
  const insets = useSafeAreaInsets();
  const sheet = useSheetLayout();

  const sheetEl = (
    <View
      style={[
        styles.sheet,
        sheet.sheetStyle,
        { paddingBottom: sheet.centered ? 24 : Math.max(insets.bottom, 24) },
      ]}
    >
      {!sheet.centered && (
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>
      )}

      <View style={[styles.content, sheet.centered && styles.contentCentered]}>
        <Text style={styles.title}>Como criar etapas?</Text>
        <Text style={styles.subtitle}>
          Escolha entre criar uma etapa de cada vez ou montar várias de uma só
          vez.
        </Text>

        <View style={styles.options}>
          <OptionCard
            icon="add-task"
            iconBg="#EFF6FF"
            iconColor={PRIMARY}
            title="Etapa única"
            description="Crie uma etapa por vez, com nome e descrição."
            onPress={onPickSingle}
          />
          <OptionCard
            icon="account-tree"
            iconBg="#F0FDF4"
            iconColor="#16A34A"
            title="Fluxo de etapas"
            description="Monte várias etapas e suas atividades de uma só vez."
            onPress={onPickFlow}
          />
        </View>

        <PressableScale
          style={styles.cancelBtn}
          onPress={onClose}
          scaleTo={0.98}
        >
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </PressableScale>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={sheet.centered ? "fade" : "slide"}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      {sheet.centered ? (
        <View style={sheet.containerStyle} pointerEvents="box-none">
          {sheetEl}
        </View>
      ) : (
        sheetEl
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  contentCentered: {
    paddingTop: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
    fontFamily: "Inter-Bold",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13.5,
    color: "#6B7280",
    lineHeight: 19,
    fontFamily: "Inter-Regular",
  },
  options: {
    marginTop: 20,
    gap: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF0F4",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTexts: { flex: 1 },
  optionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    fontFamily: "Inter-Bold",
  },
  optionDescription: {
    marginTop: 3,
    fontSize: 12.5,
    color: "#6B7280",
    lineHeight: 17,
    fontFamily: "Inter-Regular",
  },
  cancelBtn: {
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    fontFamily: "Inter-Bold",
  },
});
