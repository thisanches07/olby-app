import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/ui/pressable-scale";
import { useSheetLayout } from "@/hooks/use-sheet-layout";
import type { StageStatus } from "@/data/obras";
import { STAGE_STATUS_CONFIG, STAGE_STATUS_ORDER } from "@/utils/stage-ui";

const PRIMARY = "#2563EB";

// --- Shared sheet shell -------------------------------------------------------
function SheetShell({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const sheet = useSheetLayout();

  const body = (
    <View
      style={[
        styles.sheet,
        sheet.sheetStyle,
        { paddingBottom: sheet.centered ? 20 : Math.max(insets.bottom, 20) },
      ]}
    >
      {!sheet.centered && (
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>
      )}
      <View style={[styles.content, sheet.centered && styles.contentCentered]}>
        {children}
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
          {body}
        </View>
      ) : (
        body
      )}
    </Modal>
  );
}

// --- Status picker ------------------------------------------------------------
interface StageStatusPickerSheetProps {
  visible: boolean;
  current: StageStatus;
  onSelect: (status: StageStatus) => void;
  onClose: () => void;
}

export function StageStatusPickerSheet({
  visible,
  current,
  onSelect,
  onClose,
}: StageStatusPickerSheetProps) {
  return (
    <SheetShell visible={visible} onClose={onClose}>
      <Text style={styles.title}>Status da etapa</Text>
      <View style={styles.optionsList}>
        {STAGE_STATUS_ORDER.map((status) => {
          const cfg = STAGE_STATUS_CONFIG[status];
          const selected = status === current;
          return (
            <PressableScale
              key={status}
              style={[
                styles.statusOption,
                selected && {
                  backgroundColor: cfg.bg,
                  borderColor: cfg.dot,
                },
              ]}
              onPress={() => onSelect(status)}
              scaleTo={0.98}
            >
              <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
              <Text
                style={[
                  styles.statusOptionText,
                  selected && { color: cfg.color, fontWeight: "800" },
                ]}
              >
                {cfg.label}
              </Text>
              <View style={{ flex: 1 }} />
              {selected && (
                <MaterialIcons name="check" size={20} color={cfg.color} />
              )}
            </PressableScale>
          );
        })}
      </View>
    </SheetShell>
  );
}

// --- Complete with pending activities -----------------------------------------
interface StageCompletePendingSheetProps {
  visible: boolean;
  stageName?: string;
  pendingCount?: number;
  onCompleteAll: () => void;
  onCompleteStageOnly: () => void;
  onClose: () => void;
}

export function StageCompletePendingSheet({
  visible,
  stageName,
  pendingCount,
  onCompleteAll,
  onCompleteStageOnly,
  onClose,
}: StageCompletePendingSheetProps) {
  return (
    <SheetShell visible={visible} onClose={onClose}>
      <View style={styles.iconCircle}>
        <MaterialIcons name="checklist" size={26} color="#B45309" />
      </View>
      <Text style={styles.titleCentered}>Atividades pendentes</Text>
      <Text style={styles.message}>
        {stageName ? `"${stageName}" ` : "Esta etapa "}
        ainda tem{" "}
        {pendingCount && pendingCount > 0
          ? `${pendingCount} atividade${pendingCount !== 1 ? "s" : ""} `
          : "atividades "}
        não concluída{pendingCount === 1 ? "" : "s"}. Como deseja concluir?
      </Text>

      <View style={styles.actions}>
        <PressableScale
          style={[styles.actionBtn, styles.primaryBtn]}
          onPress={onCompleteAll}
          scaleTo={0.97}
        >
          <MaterialIcons name="done-all" size={20} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>Concluir todas as atividades</Text>
        </PressableScale>

        <PressableScale
          style={[styles.actionBtn, styles.outlineBtn]}
          onPress={onCompleteStageOnly}
          scaleTo={0.97}
        >
          <MaterialIcons name="flag" size={20} color={PRIMARY} />
          <Text style={styles.outlineBtnText}>Concluir só a etapa</Text>
        </PressableScale>

        <PressableScale
          style={styles.cancelBtn}
          onPress={onClose}
          scaleTo={0.98}
        >
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </PressableScale>
      </View>
    </SheetShell>
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
  handleContainer: { alignItems: "center", paddingTop: 10, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB" },
  content: { paddingHorizontal: 24, paddingTop: 8 },
  contentCentered: { paddingTop: 24, alignItems: "stretch" },

  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.2,
    fontFamily: "Inter-Bold",
    marginBottom: 14,
  },
  titleCentered: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.2,
    fontFamily: "Inter-Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    fontFamily: "Inter-Regular",
    marginBottom: 20,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 14,
  },

  // Status picker
  optionsList: { gap: 10 },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: "#EEF0F4",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusOptionText: { fontSize: 15, fontWeight: "600", color: "#374151" },

  // Complete actions
  actions: { gap: 10 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
  },
  primaryBtn: { backgroundColor: "#16A34A" },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    fontFamily: "Inter-Bold",
  },
  outlineBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#DBEAFE",
  },
  outlineBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: PRIMARY,
    fontFamily: "Inter-Bold",
  },
  cancelBtn: {
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingVertical: 15,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    fontFamily: "Inter-Bold",
  },
});
