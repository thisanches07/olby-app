import { ShareProjectButton } from "@/components/projeto/share-project-button";
import { PressableScale } from "@/components/ui/pressable-scale";
import type { ProjectApiRole } from "@/utils/project-role";
import { canManageMembers } from "@/utils/project-role";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ObraHeaderProps {
  title: string;
  projectId: string;
  projectRole: ProjectApiRole;
  onBack?: () => void;
}

export function ObraHeader({
  title,
  projectId,
  projectRole,
  onBack,
}: ObraHeaderProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <PressableScale
          style={styles.headerBtn}
          onPress={onBack ?? (() => router.back())}
          scaleTo={0.88}
        >
          <MaterialIcons name="arrow-back-ios" size={22} color="#111827" />
        </PressableScale>

        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>PROJETO</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {canManageMembers(projectRole) ? (
          <ShareProjectButton
            projectId={projectId}
            projectName={title}
            projectRole={projectRole}
          />
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.12)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
});
