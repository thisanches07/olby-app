import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { DocumentAttachment } from "@/data/obras";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { shadow } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";
import {
  DOCUMENT_KIND_COLORS,
  DOCUMENT_KIND_ICONS,
  DOCUMENT_KIND_LABELS,
  formatDocumentBytes,
  formatDocumentDate,
  getDocumentDisplayName,
} from "@/utils/documents";

interface ProjectDocumentRowProps {
  document: DocumentAttachment;
  onPress: () => void;
  onDelete?: () => void;
}

export function ProjectDocumentRow({
  document,
  onPress,
  onDelete,
}: ProjectDocumentRowProps) {
  const tone = DOCUMENT_KIND_COLORS[document.kind] ?? colors.primary;
  const icon = DOCUMENT_KIND_ICONS[document.kind] ?? "attach-file";
  const isReady = document.status === "READY";

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${tone}14` }]}>
        <MaterialIcons name={icon as never} size={22} color={tone} />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {getDocumentDisplayName(document)}
          </Text>
          {document.isPinned ? (
            <MaterialIcons name="push-pin" size={16} color={colors.primary} />
          ) : null}
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {DOCUMENT_KIND_LABELS[document.kind]}
          </Text>
          <View style={styles.dot} />
          <Text style={styles.metaText}>{formatDocumentBytes(document.sizeBytes)}</Text>
          <View style={styles.dot} />
          <Text style={styles.metaText}>{formatDocumentDate(document.createdAt)}</Text>
        </View>

        {!isReady && (
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>
              {document.status === "FAILED" ? "Falhou" : "Processando"}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {onDelete ? (
          <TouchableOpacity
            onPress={onDelete}
            style={styles.deleteBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="delete-outline" size={20} color="#DC2626" />
          </TouchableOpacity>
        ) : null}
        <MaterialIcons name="chevron-right" size={18} color="#CBD5E1" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    backgroundColor: "#FFFFFF",
    borderRadius: radius.xl,
    padding: spacing[14],
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.9)",
    ...shadow(1),
  },
  iconWrap: {
    width: spacing[48],
    height: spacing[48],
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: spacing[5],
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
  },
  title: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: colors.text,
    fontFamily: "Inter-SemiBold",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing[6],
  },
  metaText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    fontFamily: "Inter-Regular",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: "#CBD5E1",
  },
  statusPill: {
    alignSelf: "flex-start",
    marginTop: spacing[4],
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.pill,
    backgroundColor: "#FEF3C7",
  },
  statusPillText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    color: "#B45309",
    fontFamily: "Inter-SemiBold",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  deleteBtn: {
    width: spacing[32],
    height: spacing[32],
    alignItems: "center",
    justifyContent: "center",
  },
});
